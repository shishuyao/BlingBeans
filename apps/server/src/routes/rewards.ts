import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authenticate, assertProfileAccess, requireParent } from '../auth.js';
import { deductCost, getOrCreateBalance, toBeanDto } from '../beans.js';
import { appendBeanLedger } from '../ledger.js';
import { shanghaiToday } from '../dates.js';
import { canAfford, isRedeemLocked, SMALL_PER_BIG } from '@guoguo/shared';

export async function rewardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, reply) => {
    const query = z.object({ profileId: z.string() }).parse(request.query);
    const profile = await assertProfileAccess(request.user.id, query.profileId);
    if (!profile) return reply.status(404).send({ error: '档案不存在' });

    const rewards = await prisma.reward.findMany({
      where: { profileId: query.profileId, active: true },
      orderBy: { sortOrder: 'asc' },
    });
    return rewards;
  });

  app.post('/', { preHandler: requireParent }, async (request, reply) => {
    const body = z
      .object({
        profileId: z.string(),
        title: z.string().min(1),
        costSmall: z.number().int().min(0).default(0),
        costBig: z.number().int().min(0).default(0),
        photoUrl: z.string().nullable().optional(),
      })
      .parse(request.body);

    if (body.costSmall === 0 && body.costBig === 0) {
      return reply.status(400).send({ error: '请设置兑换所需豆豆' });
    }

    const profile = await assertProfileAccess(request.user.id, body.profileId);
    if (!profile) return reply.status(404).send({ error: '档案不存在' });

    const count = await prisma.reward.count({ where: { profileId: body.profileId } });
    const reward = await prisma.reward.create({
      data: {
        profileId: body.profileId,
        title: body.title,
        costSmall: body.costSmall,
        costBig: body.costBig,
        photoUrl: body.photoUrl ?? null,
        sortOrder: count,
      },
    });
    return reply.status(201).send(reward);
  });

  app.get('/history', async (request, reply) => {
    const query = z.object({ profileId: z.string() }).parse(request.query);
    const profile = await assertProfileAccess(request.user.id, query.profileId);
    if (!profile) return reply.status(404).send({ error: '档案不存在' });

    const rows = await prisma.redemption.findMany({
      where: { profileId: query.profileId },
      include: { reward: true },
      orderBy: { redeemedAt: 'desc' },
    });
    return rows.map((r) => ({
      ...r,
      redeemedAt: r.redeemedAt.toISOString(),
    }));
  });

  app.patch('/:id', { preHandler: requireParent }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        title: z.string().min(1).optional(),
        costSmall: z.number().int().min(0).optional(),
        costBig: z.number().int().min(0).optional(),
        photoUrl: z.string().nullable().optional(),
        sortOrder: z.number().int().optional(),
        active: z.boolean().optional(),
      })
      .parse(request.body);

    const reward = await prisma.reward.findUnique({ where: { id } });
    if (!reward) return reply.status(404).send({ error: '奖励不存在' });
    const profile = await assertProfileAccess(request.user.id, reward.profileId);
    if (!profile) return reply.status(404).send({ error: '奖励不存在' });

    const updated = await prisma.reward.update({ where: { id }, data: body });
    return updated;
  });

  app.delete('/:id', { preHandler: requireParent }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const reward = await prisma.reward.findUnique({ where: { id } });
    if (!reward) return reply.status(404).send({ error: '奖励不存在' });
    const profile = await assertProfileAccess(request.user.id, reward.profileId);
    if (!profile) return reply.status(404).send({ error: '奖励不存在' });

    await prisma.reward.update({ where: { id }, data: { active: false } });
    return { ok: true };
  });

  app.post('/:id/redeem', { preHandler: requireParent }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const reward = await prisma.reward.findUnique({ where: { id } });
    if (!reward || !reward.active) return reply.status(404).send({ error: '奖励不存在' });
    const profile = await assertProfileAccess(request.user.id, reward.profileId);
    if (!profile) return reply.status(404).send({ error: '奖励不存在' });

    const locked = await prisma.profile.findUniqueOrThrow({
      where: { id: reward.profileId },
      select: { dangerLocked: true },
    });
    const balance = await getOrCreateBalance(reward.profileId);
    if (isRedeemLocked(locked.dangerLocked, balance)) {
      return reply.status(400).send({ error: '危险模式中，先打卡攒够豆再兑奖', code: 'DANGER_LOCK' });
    }
    if (!canAfford(balance, reward)) {
      return reply.status(400).send({ error: '豆豆不足' });
    }

    const beanResult = await deductCost(reward.profileId, reward.costSmall, reward.costBig);
    if (!beanResult) {
      return reply.status(400).send({ error: '豆豆不足' });
    }

    const redemption = await prisma.redemption.create({
      data: {
        profileId: reward.profileId,
        rewardId: reward.id,
        costSmall: reward.costSmall,
        costBig: reward.costBig,
      },
      include: { reward: true },
    });
    await appendBeanLedger({
      profileId: reward.profileId,
      amount: -(reward.costSmall + reward.costBig * SMALL_PER_BIG),
      reason: 'redeem',
      date: shanghaiToday(),
      redemptionId: redemption.id,
    });

    return {
      redemption,
      beans: await toBeanDto(reward.profileId),
    };
  });
}

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { beansDeltaForTag } from '@guoguo/shared';
import { prisma } from '../db.js';
import { authenticate, assertProfileAccess, requireParent } from '../auth.js';
import { addBeans, removeBeans, removeBeansAllowDebt, toBeanDto } from '../beans.js';
import { appendBeanLedger } from '../ledger.js';
import { shanghaiToday } from '../dates.js';
import { ensureQuest, addedBeansOnDate } from '../quests.js';

function dateGuardMessage(date: string, today: string) {
  if (date > today) return '这一天还没到';
  if (date < today) return '已经过去的日子不能再改';
  return null;
}

export async function checkInRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, reply) => {
    const query = z
      .object({
        profileId: z.string(),
        month: z.string().regex(/^\d{4}-\d{2}$/),
      })
      .parse(request.query);

    const profile = await assertProfileAccess(request.user.id, query.profileId);
    if (!profile) return reply.status(404).send({ error: '档案不存在' });

    const checkIns = await prisma.checkIn.findMany({
      where: {
        profileId: query.profileId,
        date: { startsWith: query.month },
      },
      include: { tag: true },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });
    return checkIns;
  });

  app.post('/', { preHandler: requireParent }, async (request, reply) => {
    const body = z
      .object({
        profileId: z.string(),
        tagId: z.string(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(request.body);

    const profile = await assertProfileAccess(request.user.id, body.profileId);
    if (!profile) return reply.status(404).send({ error: '档案不存在' });

    const today = shanghaiToday();
    const blocked = dateGuardMessage(body.date, today);
    if (blocked) return reply.status(400).send({ error: blocked, code: 'DATE_LOCKED' });

    const tag = await prisma.behaviorTag.findFirst({
      where: { id: body.tagId, profileId: body.profileId, active: true },
    });
    if (!tag) return reply.status(404).send({ error: '标签不存在' });

    const quest = await ensureQuest(body.profileId, body.date);
    const kind = quest.kind === 'danger' ? 'danger' : 'happy';
    const award = beansDeltaForTag(tag, kind, quest.multiplier);
    const justRevealed = !quest.revealed;

    const existing = await prisma.checkIn.findUnique({
      where: {
        profileId_tagId_date: {
          profileId: body.profileId,
          tagId: body.tagId,
          date: body.date,
        },
      },
    });

    let checkIn;
    if (existing) {
      checkIn = await prisma.checkIn.update({
        where: { id: existing.id },
        data: { count: { increment: 1 }, beansAwarded: { increment: award } },
        include: { tag: true },
      });
    } else {
      checkIn = await prisma.checkIn.create({
        data: {
          profileId: body.profileId,
          tagId: body.tagId,
          date: body.date,
          count: 1,
          beansAwarded: award,
        },
        include: { tag: true },
      });
    }

    const nextEarned = quest.beansEarned + award;
    await prisma.dayQuest.update({
      where: { id: quest.id },
      data: {
        revealed: true,
        beansEarned: nextEarned,
      },
    });

    let beanResult = { mergeEvents: [] as { fromSmall: number; toBig: number; colors: string[] }[] };
    if (award > 0) {
      beanResult = await addBeans(body.profileId, award, tag.color, tag.id);
    } else if (award < 0) {
      await removeBeansAllowDebt(body.profileId, -award);
    }
    await appendBeanLedger({
      profileId: body.profileId,
      amount: award,
      reason: tag.kind === 'minus' ? 'penalty' : 'checkin',
      date: body.date,
      tagId: tag.id,
      checkInId: checkIn.id,
    });

    const beansAdded = await addedBeansOnDate(body.profileId, body.date);

    let dangerUnlocked = false;
    const fresh = await prisma.profile.findUniqueOrThrow({
      where: { id: body.profileId },
      select: { dangerLocked: true },
    });
    if (fresh.dangerLocked && beansAdded > 5) {
      await prisma.profile.update({
        where: { id: body.profileId },
        data: { dangerLocked: false },
      });
      dangerUnlocked = true;
    }

    return {
      checkIn,
      beans: await toBeanDto(body.profileId),
      mergeEvents: beanResult.mergeEvents,
      quest: {
        date: quest.date,
        kind,
        multiplier: quest.multiplier,
        dangerNeed: quest.dangerNeed,
        revealed: true,
        settled: quest.settled,
        beansEarned: nextEarned,
        beansAdded,
      },
      reveal: justRevealed
        ? {
            kind,
            multiplier: quest.multiplier,
            dangerNeed: quest.dangerNeed,
            beansAwarded: award,
          }
        : undefined,
      dangerUnlocked,
    };
  });

  app.post('/decrement', { preHandler: requireParent }, async (request, reply) => {
    const body = z
      .object({
        profileId: z.string(),
        tagId: z.string(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(request.body);

    const profile = await assertProfileAccess(request.user.id, body.profileId);
    if (!profile) return reply.status(404).send({ error: '档案不存在' });

    const today = shanghaiToday();
    const blocked = dateGuardMessage(body.date, today);
    if (blocked) return reply.status(400).send({ error: blocked, code: 'DATE_LOCKED' });

    const existing = await prisma.checkIn.findUnique({
      where: {
        profileId_tagId_date: {
          profileId: body.profileId,
          tagId: body.tagId,
          date: body.date,
        },
      },
      include: { tag: true },
    });
    if (!existing) return reply.status(404).send({ error: '没有打卡记录' });

    const quest = await ensureQuest(body.profileId, body.date);
    const kind = quest.kind === 'danger' ? 'danger' : 'happy';
    const perTap = beansDeltaForTag(existing.tag, kind, quest.multiplier);
    if (perTap > 0) {
      const beanResult = await removeBeans(body.profileId, perTap);
      if (!beanResult) {
        return reply.status(400).send({ error: '豆豆不足，无法撤销（可能已用于兑换）' });
      }
    } else if (perTap < 0) {
      await addBeans(body.profileId, -perTap, existing.tag.color, existing.tag.id);
    }

    let checkIn = null;
    if (existing.count <= 1) {
      await prisma.checkIn.delete({ where: { id: existing.id } });
    } else {
      checkIn = await prisma.checkIn.update({
        where: { id: existing.id },
        data: {
          count: { decrement: 1 },
          beansAwarded: existing.beansAwarded - perTap,
        },
        include: { tag: true },
      });
    }

    await prisma.dayQuest.update({
      where: { id: quest.id },
      data: { beansEarned: quest.beansEarned - perTap },
    });
    await appendBeanLedger({
      profileId: body.profileId,
      amount: -perTap,
      reason: existing.tag.kind === 'minus' ? 'penalty_undo' : 'undo',
      date: body.date,
      tagId: existing.tagId,
      checkInId: existing.id,
    });

    return {
      checkIn,
      beans: await toBeanDto(body.profileId),
      mergeEvents: [],
    };
  });
}

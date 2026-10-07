import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authenticate, assertProfileAccess, requireParent } from '../auth.js';
import { DEFAULT_PENALTY_TAGS, MISSED_CHECKIN_SYSTEM_KEY } from '@guoguo/shared';
import { ensureMissedCheckInTag } from '../missed.js';

export async function tagRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, reply) => {
    const query = z.object({ profileId: z.string() }).parse(request.query);
    const profile = await assertProfileAccess(request.user.id, query.profileId);
    if (!profile) return reply.status(404).send({ error: '档案不存在' });

    const minusCount = await prisma.behaviorTag.count({
      where: { profileId: query.profileId, kind: 'minus' },
    });
    if (minusCount === 0) {
      const count = await prisma.behaviorTag.count({ where: { profileId: query.profileId } });
      await prisma.behaviorTag.createMany({
        data: DEFAULT_PENALTY_TAGS.map((t, i) => ({
          profileId: query.profileId,
          name: t.name,
          color: t.color,
          beansOnComplete: t.beansOnComplete,
          sortOrder: count + i,
          kind: 'minus',
        })),
      });
    }
    await ensureMissedCheckInTag(query.profileId);

    const tags = await prisma.behaviorTag.findMany({
      where: { profileId: query.profileId },
      orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }],
    });
    return tags;
  });

  app.post('/', { preHandler: requireParent }, async (request, reply) => {
    const body = z
      .object({
        profileId: z.string(),
        name: z.string().min(1),
        color: z.string().min(1),
        beansOnComplete: z.number().int().min(1).max(20).default(1),
        kind: z.enum(['plus', 'minus']).default('plus'),
      })
      .parse(request.body);

    const profile = await assertProfileAccess(request.user.id, body.profileId);
    if (!profile) return reply.status(404).send({ error: '档案不存在' });

    const count = await prisma.behaviorTag.count({ where: { profileId: body.profileId } });
    const tag = await prisma.behaviorTag.create({
      data: {
        profileId: body.profileId,
        name: body.name,
        color: body.color,
        beansOnComplete: body.beansOnComplete,
        sortOrder: count,
        kind: body.kind,
      },
    });
    return reply.status(201).send(tag);
  });

  app.patch('/:id', { preHandler: requireParent }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tag = await prisma.behaviorTag.findUnique({ where: { id } });
    if (!tag) return reply.status(404).send({ error: '标签不存在' });
    const profile = await assertProfileAccess(request.user.id, tag.profileId);
    if (!profile) return reply.status(404).send({ error: '标签不存在' });

    if (tag.systemKey === MISSED_CHECKIN_SYSTEM_KEY) {
      const only = z.object({ beansOnComplete: z.number().int().min(0).max(100) }).parse(request.body);
      return prisma.behaviorTag.update({
        where: { id },
        data: { beansOnComplete: only.beansOnComplete },
      });
    }

    const body = z
      .object({
        name: z.string().min(1).optional(),
        color: z.string().optional(),
        beansOnComplete: z.number().int().min(1).max(20).optional(),
        sortOrder: z.number().int().optional(),
        active: z.boolean().optional(),
      })
      .parse(request.body);

    const updated = await prisma.behaviorTag.update({ where: { id }, data: body });
    return updated;
  });

  app.delete('/:id', { preHandler: requireParent }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tag = await prisma.behaviorTag.findUnique({ where: { id } });
    if (!tag) return reply.status(404).send({ error: '标签不存在' });
    const profile = await assertProfileAccess(request.user.id, tag.profileId);
    if (!profile) return reply.status(404).send({ error: '标签不存在' });
    if (tag.systemKey === MISSED_CHECKIN_SYSTEM_KEY) {
      return reply.status(400).send({ error: '未打卡扣豆不能删除，数量改成 0 就不会扣' });
    }

    // Soft delete to preserve historical check-ins
    await prisma.behaviorTag.update({ where: { id }, data: { active: false } });
    return { ok: true };
  });
}

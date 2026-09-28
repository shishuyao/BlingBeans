import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authenticate, assertProfileAccess, requireParent } from '../auth.js';
import { addBeans, removeBeans } from '../beans.js';

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

    const tag = await prisma.behaviorTag.findFirst({
      where: { id: body.tagId, profileId: body.profileId, active: true },
    });
    if (!tag) return reply.status(404).send({ error: '标签不存在' });

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
        data: { count: { increment: 1 } },
        include: { tag: true },
      });
    } else {
      checkIn = await prisma.checkIn.create({
        data: {
          profileId: body.profileId,
          tagId: body.tagId,
          date: body.date,
          count: 1,
        },
        include: { tag: true },
      });
    }

    const beanResult = await addBeans(
      body.profileId,
      tag.beansOnComplete,
      tag.color,
      tag.id
    );

    return {
      checkIn,
      beans: {
        smallBeans: beanResult.smallBeans,
        bigBeans: beanResult.bigBeans,
        slotColors: beanResult.slotColors,
      },
      mergeEvents: beanResult.mergeEvents,
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

    const beansToRemove = existing.tag.beansOnComplete;
    const beanResult = await removeBeans(body.profileId, beansToRemove);
    if (!beanResult) {
      return reply.status(400).send({ error: '豆豆不足，无法撤销（可能已用于兑换）' });
    }

    let checkIn = null;
    if (existing.count <= 1) {
      await prisma.checkIn.delete({ where: { id: existing.id } });
    } else {
      checkIn = await prisma.checkIn.update({
        where: { id: existing.id },
        data: { count: { decrement: 1 } },
        include: { tag: true },
      });
    }

    return {
      checkIn,
      beans: beanResult,
      mergeEvents: [],
    };
  });
}

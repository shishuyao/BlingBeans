import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, assertProfileAccess } from '../auth.js';
import { prisma } from '../db.js';
import { listMonthQuests } from '../quests.js';
import { backfillBeanPersistence } from '../ledger.js';

export async function questRoutes(app: FastifyInstance) {
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

    const family = await prisma.family.findUniqueOrThrow({
      where: { id: profile.familyId },
    });
    await backfillBeanPersistence(query.profileId);
    const quests = await listMonthQuests(query.profileId, query.month);
    const fresh = await prisma.profile.findUniqueOrThrow({
      where: { id: query.profileId },
      select: { dangerLocked: true },
    });

    return {
      month: query.month,
      quests,
      dangerLocked: fresh.dangerLocked,
      happyDayRate: family.happyDayRate,
    };
  });
}

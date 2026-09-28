import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, assertProfileAccess } from '../auth.js';
import { getOrCreateBalance, getSlotColors } from '../beans.js';

export async function beanRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, reply) => {
    const query = z.object({ profileId: z.string() }).parse(request.query);
    const profile = await assertProfileAccess(request.user.id, query.profileId);
    if (!profile) return reply.status(404).send({ error: '档案不存在' });

    const balance = await getOrCreateBalance(query.profileId);
    const slotColors = await getSlotColors(query.profileId);
    return {
      smallBeans: balance.smallBeans,
      bigBeans: balance.bigBeans,
      slotColors,
    };
  });
}

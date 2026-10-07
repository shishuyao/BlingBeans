import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, assertProfileAccess } from '../auth.js';
import { toBeanDto } from '../beans.js';
import { backfillBeanPersistence } from '../ledger.js';
import { settlePastDangerDays } from '../quests.js';
import { settleMissedCheckIns } from '../missed.js';

export async function beanRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, reply) => {
    const query = z.object({ profileId: z.string() }).parse(request.query);
    const profile = await assertProfileAccess(request.user.id, query.profileId);
    if (!profile) return reply.status(404).send({ error: '档案不存在' });

    await backfillBeanPersistence(query.profileId);
    await settleMissedCheckIns(query.profileId);
    await settlePastDangerDays(query.profileId);
    return toBeanDto(query.profileId);
  });
}

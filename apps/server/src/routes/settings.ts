import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authenticate, requireParent } from '../auth.js';

export async function settingsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request) => {
    const family = await prisma.family.findUniqueOrThrow({
      where: { id: request.user.familyId },
    });
    return { happyDayRate: family.happyDayRate };
  });

  app.patch('/', { preHandler: requireParent }, async (request) => {
    const body = z
      .object({
        happyDayRate: z.number().min(0.5).max(1),
      })
      .parse(request.body);

    const family = await prisma.family.update({
      where: { id: request.user.familyId },
      data: { happyDayRate: Math.round(body.happyDayRate * 100) / 100 },
    });
    return { happyDayRate: family.happyDayRate };
  });
}

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authenticate, assertProfileAccess, requireParent } from '../auth.js';
import { TAG_COLORS, DEFAULT_TAGS } from '@guoguo/shared';

export async function profileRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request) => {
    const profiles = await prisma.profile.findMany({
      where: { family: { members: { some: { userId: request.user.id } } } },
      orderBy: { sortOrder: 'asc' },
    });
    return profiles;
  });

  app.post('/', { preHandler: requireParent }, async (request, reply) => {
    const body = z
      .object({
        name: z.string().min(1),
        avatarColor: z.string().optional(),
        seedDefaultTags: z.boolean().optional(),
      })
      .parse(request.body);

    const count = await prisma.profile.count({
      where: { familyId: request.user.familyId },
    });

    const profile = await prisma.$transaction(async (tx) => {
      const p = await tx.profile.create({
        data: {
          familyId: request.user.familyId,
          name: body.name,
          avatarColor: body.avatarColor ?? TAG_COLORS[count % TAG_COLORS.length],
          sortOrder: count,
        },
      });
      await tx.beanBalance.create({ data: { profileId: p.id } });
      if (body.seedDefaultTags !== false) {
        await tx.behaviorTag.createMany({
          data: DEFAULT_TAGS.map((t, i) => ({
            profileId: p.id,
            name: t.name,
            color: t.color,
            beansOnComplete: t.beansOnComplete,
            sortOrder: i,
          })),
        });
      }
      return p;
    });

    return reply.status(201).send(profile);
  });

  app.patch('/:id', { preHandler: requireParent }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        name: z.string().min(1).optional(),
        avatarColor: z.string().optional(),
        sortOrder: z.number().int().optional(),
      })
      .parse(request.body);

    const existing = await assertProfileAccess(request.user.id, id);
    if (!existing) return reply.status(404).send({ error: '档案不存在' });

    const profile = await prisma.profile.update({
      where: { id },
      data: body,
    });
    return profile;
  });

  app.delete('/:id', { preHandler: requireParent }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await assertProfileAccess(request.user.id, id);
    if (!existing) return reply.status(404).send({ error: '档案不存在' });

    const count = await prisma.profile.count({
      where: { familyId: request.user.familyId },
    });
    if (count <= 1) {
      return reply.status(400).send({ error: '至少保留一个档案' });
    }

    await prisma.profile.delete({ where: { id } });
    return { ok: true };
  });
}

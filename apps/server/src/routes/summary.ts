import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authenticate, assertProfileAccess } from '../auth.js';

export async function summaryRoutes(app: FastifyInstance) {
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

    const [checkIns, redemptions] = await Promise.all([
      prisma.checkIn.findMany({
        where: {
          profileId: query.profileId,
          date: { startsWith: query.month },
        },
        include: { tag: true },
        orderBy: { date: 'asc' },
      }),
      prisma.redemption.findMany({
        where: {
          profileId: query.profileId,
          redeemedAt: {
            gte: new Date(`${query.month}-01T00:00:00.000Z`),
            lt: (() => {
              const [y, m] = query.month.split('-').map(Number);
              const next = m === 12 ? new Date(Date.UTC(y + 1, 0, 1)) : new Date(Date.UTC(y, m, 1));
              return next;
            })(),
          },
        },
        include: { reward: true },
        orderBy: { redeemedAt: 'asc' },
      }),
    ]);

    const tagMap = new Map<string, { tagId: string; name: string; color: string; count: number }>();
    let totalSmallEarned = 0;
    for (const c of checkIns) {
      if (c.beansAwarded !== 0) totalSmallEarned += c.beansAwarded;
      else if (c.tag.kind === 'minus') totalSmallEarned -= c.tag.beansOnComplete * c.count;
      else totalSmallEarned += c.tag.beansOnComplete * c.count;
      const prev = tagMap.get(c.tagId);
      if (prev) {
        prev.count += c.count;
      } else {
        tagMap.set(c.tagId, {
          tagId: c.tagId,
          name: c.tag.name,
          color: c.tag.color,
          count: c.count,
        });
      }
    }

    return {
      month: query.month,
      checkIns,
      redemptions: redemptions.map((r) => ({
        ...r,
        redeemedAt: r.redeemedAt.toISOString(),
      })),
      totalSmallEarned,
      totalBigEarned: Math.floor(totalSmallEarned / 10),
      tagStats: Array.from(tagMap.values()).sort((a, b) => b.count - a.count),
    };
  });
}

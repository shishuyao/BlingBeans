import { Prisma } from '@prisma/client';
import { MISSED_CHECKIN_SYSTEM_KEY, MISSED_CHECKIN_TAG, totalSmallBeans } from '@guoguo/shared';
import { prisma } from './db.js';
import { getOrCreateBalance, removeBeansUpTo } from './beans.js';
import { appendBeanLedger } from './ledger.js';
import { addDays, eachDate, shanghaiToday } from './dates.js';

export async function ensureMissedCheckInTag(profileId: string) {
  const existing = await prisma.behaviorTag.findFirst({
    where: { profileId, systemKey: MISSED_CHECKIN_SYSTEM_KEY },
  });
  if (!existing) {
    try {
      return await prisma.behaviorTag.create({
        data: {
          profileId,
          name: MISSED_CHECKIN_TAG.name,
          color: MISSED_CHECKIN_TAG.color,
          beansOnComplete: MISSED_CHECKIN_TAG.beansOnComplete,
          sortOrder: -1,
          kind: 'minus',
          systemKey: MISSED_CHECKIN_SYSTEM_KEY,
          active: true,
        },
      });
    } catch (err) {
      if (!isUniqueConflict(err)) throw err;
      const raced = await prisma.behaviorTag.findFirst({
        where: { profileId, systemKey: MISSED_CHECKIN_SYSTEM_KEY },
      });
      if (raced) return raced;
      throw err;
    }
  }

  if (
    existing.name !== MISSED_CHECKIN_TAG.name ||
    existing.color !== MISSED_CHECKIN_TAG.color ||
    existing.kind !== 'minus' ||
    !existing.active
  ) {
    return prisma.behaviorTag.update({
      where: { id: existing.id },
      data: {
        name: MISSED_CHECKIN_TAG.name,
        color: MISSED_CHECKIN_TAG.color,
        kind: 'minus',
        active: true,
        sortOrder: Math.min(existing.sortOrder, -1),
      },
    });
  }
  return existing;
}

function isUniqueConflict(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

/**
 * After the first check-in, each finished day with no check-in is charged once.
 * Amount comes from the missed-day tag (small beans). 0 disables the charge.
 * If the charge is larger than the beans left, deduct down to 0 and enter danger lock.
 */
export async function settleMissedCheckIns(profileId: string, today = shanghaiToday()) {
  const tag = await ensureMissedCheckInTag(profileId);
  const amount = Math.max(0, tag.beansOnComplete);

  const first = await prisma.checkIn.findFirst({
    where: { profileId },
    orderBy: { date: 'asc' },
    select: { date: true },
  });
  if (!first || first.date >= today) return;

  const start = addDays(first.date, 1);
  const end = addDays(today, -1);
  if (start > end) return;

  const [checkIns, settled] = await Promise.all([
    prisma.checkIn.findMany({
      where: { profileId, date: { gte: start, lte: end } },
      select: { date: true },
      distinct: ['date'],
    }),
    prisma.missedDaySettle.findMany({
      where: { profileId, date: { gte: start, lte: end } },
      select: { date: true },
    }),
  ]);
  const checked = new Set(checkIns.map((row) => row.date));
  const done = new Set(settled.map((row) => row.date));

  for (const date of eachDate(start, end)) {
    if (checked.has(date) || done.has(date)) continue;

    let claimed;
    try {
      claimed = await prisma.missedDaySettle.create({
        data: { profileId, date, deducted: 0, frozen: false },
      });
    } catch (err) {
      if (isUniqueConflict(err)) continue;
      throw err;
    }

    if (amount <= 0) continue;

    try {
      const balance = await getOrCreateBalance(profileId);
      const total = totalSmallBeans(balance);
      const short = amount > Math.max(0, total);
      const result = await removeBeansUpTo(profileId, amount);
      if (short) {
        await prisma.profile.update({
          where: { id: profileId },
          data: { dangerLocked: true },
        });
      }
      if (result.deducted !== 0) {
        await appendBeanLedger({
          profileId,
          amount: -result.deducted,
          reason: 'missed_checkin',
          date,
          tagId: tag.id,
        });
      }
      await prisma.missedDaySettle.update({
        where: { id: claimed.id },
        data: { deducted: result.deducted, frozen: short },
      });
    } catch (err) {
      await prisma.missedDaySettle.delete({ where: { id: claimed.id } }).catch(() => undefined);
      throw err;
    }
  }
}

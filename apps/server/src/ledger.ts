import { SMALL_PER_BIG } from '@guoguo/shared';
import { prisma } from './db.js';

export type BeanLedgerReason =
  | 'checkin'
  | 'undo'
  | 'penalty'
  | 'penalty_undo'
  | 'redeem'
  | 'danger_settle'
  | 'missed_checkin';

export async function appendBeanLedger(input: {
  profileId: string;
  amount: number;
  reason: BeanLedgerReason;
  date?: string | null;
  tagId?: string | null;
  checkInId?: string | null;
  redemptionId?: string | null;
  createdAt?: Date;
}) {
  if (input.amount === 0) return;
  await prisma.beanLedger.create({
    data: {
      profileId: input.profileId,
      amount: input.amount,
      reason: input.reason,
      date: input.date ?? null,
      tagId: input.tagId ?? null,
      checkInId: input.checkInId ?? null,
      redemptionId: input.redemptionId ?? null,
      createdAt: input.createdAt,
    },
  });
}

function historicalAward(count: number, tag: { beansOnComplete: number; kind: string }, stored: number) {
  if (stored !== 0) return stored;
  if (tag.kind === 'minus') return -(count * tag.beansOnComplete);
  return count * tag.beansOnComplete;
}

/** Fill beansAwarded on old check-ins and write missing ledger rows. Does not change current balance. */
export async function backfillBeanPersistence(profileId: string) {
  const checkIns = await prisma.checkIn.findMany({
    where: { profileId },
    include: { tag: true },
  });
  for (const row of checkIns) {
    const amount = historicalAward(row.count, row.tag, row.beansAwarded);
    if (row.beansAwarded !== amount) {
      await prisma.checkIn.update({
        where: { id: row.id },
        data: { beansAwarded: amount },
      });
    }
    const hasCheckin = await prisma.beanLedger.findFirst({
      where: { checkInId: row.id, reason: 'checkin' },
      select: { id: true },
    });
    if (!hasCheckin) {
      await appendBeanLedger({
        profileId,
        amount,
        reason: 'checkin',
        date: row.date,
        tagId: row.tagId,
        checkInId: row.id,
        createdAt: row.createdAt,
      });
    }
  }

  const redemptions = await prisma.redemption.findMany({ where: { profileId } });
  for (const row of redemptions) {
    const has = await prisma.beanLedger.findFirst({
      where: { redemptionId: row.id, reason: 'redeem' },
      select: { id: true },
    });
    if (has) continue;
    await appendBeanLedger({
      profileId,
      amount: -(row.costSmall + row.costBig * SMALL_PER_BIG),
      reason: 'redeem',
      date: row.redeemedAt.toISOString().slice(0, 10),
      redemptionId: row.id,
      createdAt: row.redeemedAt,
    });
  }
}

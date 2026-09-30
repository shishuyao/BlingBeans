import { type DayQuestDto } from '@guoguo/shared';
import { prisma } from './db.js';
import { removeBeansUpTo } from './beans.js';
import { appendBeanLedger } from './ledger.js';
import { daysInMonth, shanghaiToday } from './dates.js';

function earnedFromCheckIn(c: {
  count: number;
  beansAwarded: number;
  tag: { beansOnComplete: number; kind: string };
}) {
  if (c.beansAwarded !== 0) return c.beansAwarded;
  if (c.tag.kind === 'minus') return -(c.count * c.tag.beansOnComplete);
  return c.count * c.tag.beansOnComplete;
}

/** Danger-day fill: plus tags only. Redeem / minus tags do not count. */
export function addedFromCheckIn(c: {
  count: number;
  beansAwarded: number;
  tag: { beansOnComplete: number; kind: string };
}) {
  if (c.tag.kind === 'minus') return 0;
  const v = c.beansAwarded !== 0 ? c.beansAwarded : c.count * c.tag.beansOnComplete;
  return Math.max(0, v);
}

export async function addedBeansOnDate(profileId: string, date: string) {
  const checkIns = await prisma.checkIn.findMany({
    where: { profileId, date },
    include: { tag: true },
  });
  return checkIns.reduce((sum, c) => sum + addedFromCheckIn(c), 0);
}

function unitRand(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export function rollQuest(profileId: string, date: string, happyDayRate: number) {
  const rate = Math.min(1, Math.max(0, happyDayRate));
  const r = unitRand(`${profileId}|${date}|kind`);
  if (r < rate) {
    const m = unitRand(`${profileId}|${date}|mult`);
    const multiplier = Math.min(2, Math.max(1, Math.round((1 + m) * 10) / 10));
    return { kind: 'happy' as const, multiplier, dangerNeed: 0 };
  }
  const t = unitRand(`${profileId}|${date}|need`);
  const dangerNeed = 5 + Math.floor(t * 6);
  return { kind: 'danger' as const, multiplier: 1, dangerNeed };
}

export function toQuestDto(
  q: {
    date: string;
    kind: string;
    multiplier: number;
    dangerNeed: number;
    revealed: boolean;
    settled: boolean;
    beansEarned: number;
  },
  beansAdded = 0,
): DayQuestDto {
  return {
    date: q.date,
    kind: q.kind === 'danger' ? 'danger' : 'happy',
    multiplier: q.multiplier,
    dangerNeed: q.dangerNeed,
    revealed: q.revealed,
    settled: q.settled,
    beansEarned: q.beansEarned,
    beansAdded,
  };
}

export async function ensureQuest(profileId: string, date: string) {
  const existing = await prisma.dayQuest.findUnique({
    where: { profileId_date: { profileId, date } },
  });
  if (existing) return existing;

  const profile = await prisma.profile.findUniqueOrThrow({
    where: { id: profileId },
    include: { family: true },
  });
  const rolled = rollQuest(profileId, date, profile.family.happyDayRate);
  const checkIns = await prisma.checkIn.findMany({
    where: { profileId, date },
    include: { tag: true },
  });
  const earned = checkIns.reduce((sum, c) => sum + earnedFromCheckIn(c), 0);
  return prisma.dayQuest.create({
    data: {
      profileId,
      date,
      kind: rolled.kind,
      multiplier: rolled.multiplier,
      dangerNeed: rolled.dangerNeed,
      revealed: earned > 0,
      settled: false,
      beansEarned: earned,
    },
  });
}

export async function settlePastDangerDays(profileId: string, today = shanghaiToday()) {
  const pending = await prisma.dayQuest.findMany({
    where: {
      profileId,
      kind: 'danger',
      settled: false,
      date: { lt: today },
    },
  });

  for (const quest of pending) {
    const added = await addedBeansOnDate(profileId, quest.date);
    if (added >= quest.dangerNeed) {
      await prisma.dayQuest.update({
        where: { id: quest.id },
        data: { settled: true },
      });
      continue;
    }
    const result = await removeBeansUpTo(profileId, quest.dangerNeed);
    await prisma.dayQuest.update({
      where: { id: quest.id },
      data: { settled: true },
    });
    await appendBeanLedger({
      profileId,
      amount: -result.deducted,
      reason: 'danger_settle',
      date: quest.date,
    });
    await prisma.profile.update({
      where: { id: profileId },
      data: { dangerLocked: true },
    });
  }
}

export async function ensureMonthQuests(profileId: string, month: string) {
  const profile = await prisma.profile.findUniqueOrThrow({
    where: { id: profileId },
    include: {
      family: true,
      checkIns: { where: { date: { startsWith: month } }, include: { tag: true } },
    },
  });
  const today = shanghaiToday();
  const total = daysInMonth(month);
  const dates: string[] = [];
  for (let d = 1; d <= total; d++) {
    const date = `${month}-${String(d).padStart(2, '0')}`;
    if (date <= today) dates.push(date);
  }

  const existing = await prisma.dayQuest.findMany({
    where: { profileId, date: { startsWith: month } },
  });
  const byDate = new Map(existing.map((q) => [q.date, q]));
  const earnedByDate = new Map<string, number>();
  for (const c of profile.checkIns) {
    earnedByDate.set(c.date, (earnedByDate.get(c.date) ?? 0) + earnedFromCheckIn(c));
  }

  for (const date of dates) {
    const earned = earnedByDate.get(date) ?? 0;
    const found = byDate.get(date);
    if (!found) {
      const rolled = rollQuest(profileId, date, profile.family.happyDayRate);
      await prisma.dayQuest.create({
        data: {
          profileId,
          date,
          kind: rolled.kind,
          multiplier: rolled.multiplier,
          dangerNeed: rolled.dangerNeed,
          revealed: earned > 0,
          settled: false,
          beansEarned: earned,
        },
      });
      continue;
    }
    if (!found.revealed && earned > 0) {
      await prisma.dayQuest.update({
        where: { id: found.id },
        data: { revealed: true, beansEarned: Math.max(found.beansEarned, earned) },
      });
    }
  }

  await settlePastDangerDays(profileId, today);
}

export async function listMonthQuests(profileId: string, month: string): Promise<DayQuestDto[]> {
  await ensureMonthQuests(profileId, month);
  const rows = await prisma.dayQuest.findMany({
    where: { profileId, date: { startsWith: month } },
    orderBy: { date: 'asc' },
  });
  const checkIns = await prisma.checkIn.findMany({
    where: { profileId, date: { startsWith: month } },
    include: { tag: true },
  });
  const addedByDate = new Map<string, number>();
  for (const c of checkIns) {
    addedByDate.set(c.date, (addedByDate.get(c.date) ?? 0) + addedFromCheckIn(c));
  }
  return rows.map((q) => toQuestDto(q, addedByDate.get(q.date) ?? 0));
}

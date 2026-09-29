import { prisma } from './db.js';
import { SMALL_PER_BIG, type MergeEvent } from '@guoguo/shared';

export async function getOrCreateBalance(profileId: string) {
  let balance = await prisma.beanBalance.findUnique({ where: { profileId } });
  if (!balance) {
    balance = await prisma.beanBalance.create({
      data: { profileId, smallBeans: 0, bigBeans: 0 },
    });
  }
  return balance;
}

export async function getSlotColors(profileId: string): Promise<string[]> {
  const slots = await prisma.beanSlot.findMany({
    where: { profileId },
    orderBy: { createdAt: 'asc' },
  });
  return slots.map((s) => s.color);
}

export async function addBeans(
  profileId: string,
  amount: number,
  color: string,
  tagId: string | null
): Promise<{ smallBeans: number; bigBeans: number; mergeEvents: MergeEvent[]; slotColors: string[] }> {
  await getOrCreateBalance(profileId);

  const mergeEvents: MergeEvent[] = [];

  for (let i = 0; i < amount; i++) {
    await prisma.beanSlot.create({
      data: { profileId, tagId, color },
    });
  }

  let slots = await prisma.beanSlot.findMany({
    where: { profileId },
    orderBy: { createdAt: 'asc' },
  });

  while (slots.length >= SMALL_PER_BIG) {
    const toMerge = slots.slice(0, SMALL_PER_BIG);
    const colors = toMerge.map((s) => s.color);
    await prisma.beanSlot.deleteMany({
      where: { id: { in: toMerge.map((s) => s.id) } },
    });
    await prisma.beanBalance.update({
      where: { profileId },
      data: { bigBeans: { increment: 1 } },
    });
    mergeEvents.push({ fromSmall: SMALL_PER_BIG, toBig: 1, colors });
    slots = await prisma.beanSlot.findMany({
      where: { profileId },
      orderBy: { createdAt: 'asc' },
    });
  }

  const balance = await prisma.beanBalance.update({
    where: { profileId },
    data: { smallBeans: slots.length },
  });

  return {
    smallBeans: balance.smallBeans,
    bigBeans: balance.bigBeans,
    mergeEvents,
    slotColors: slots.map((s) => s.color),
  };
}

export async function removeBeans(
  profileId: string,
  amount: number
): Promise<{ smallBeans: number; bigBeans: number; slotColors: string[] } | null> {
  const balance = await getOrCreateBalance(profileId);
  const total = balance.smallBeans + balance.bigBeans * SMALL_PER_BIG;
  if (total < amount) return null;

  let remaining = amount;
  let slots = await prisma.beanSlot.findMany({
    where: { profileId },
    orderBy: { createdAt: 'desc' },
  });

  // Remove from small slots first
  const removeSlotIds: string[] = [];
  for (const slot of slots) {
    if (remaining <= 0) break;
    removeSlotIds.push(slot.id);
    remaining--;
  }
  if (removeSlotIds.length) {
    await prisma.beanSlot.deleteMany({ where: { id: { in: removeSlotIds } } });
  }

  let bigBeans = balance.bigBeans;
  // Break big beans into small as needed
  while (remaining > 0 && bigBeans > 0) {
    bigBeans -= 1;
    if (remaining >= SMALL_PER_BIG) {
      remaining -= SMALL_PER_BIG;
    } else {
      const giveBack = SMALL_PER_BIG - remaining;
      remaining = 0;
      for (let i = 0; i < giveBack; i++) {
        await prisma.beanSlot.create({
          data: { profileId, color: '#C9A227', tagId: null },
        });
      }
    }
  }

  if (remaining > 0) return null;

  slots = await prisma.beanSlot.findMany({
    where: { profileId },
    orderBy: { createdAt: 'asc' },
  });

  const updated = await prisma.beanBalance.update({
    where: { profileId },
    data: { smallBeans: slots.length, bigBeans },
  });

  return {
    smallBeans: updated.smallBeans,
    bigBeans: updated.bigBeans,
    slotColors: slots.map((s) => s.color),
  };
}

export async function deductCost(
  profileId: string,
  costSmall: number,
  costBig: number
): Promise<{ smallBeans: number; bigBeans: number; slotColors: string[] } | null> {
  const need = costSmall + costBig * SMALL_PER_BIG;
  return removeBeans(profileId, need);
}

/** Deduct up to `amount` beans; never fails. Used by danger-day settlement. */
export async function removeBeansUpTo(
  profileId: string,
  amount: number
): Promise<{ smallBeans: number; bigBeans: number; slotColors: string[]; deducted: number }> {
  const balance = await getOrCreateBalance(profileId);
  const total = balance.smallBeans + balance.bigBeans * SMALL_PER_BIG;
  const take = Math.min(total, Math.max(0, amount));
  if (take <= 0) {
    return {
      smallBeans: balance.smallBeans,
      bigBeans: balance.bigBeans,
      slotColors: await getSlotColors(profileId),
      deducted: 0,
    };
  }
  const result = await removeBeans(profileId, take);
  if (!result) {
    return {
      smallBeans: balance.smallBeans,
      bigBeans: balance.bigBeans,
      slotColors: await getSlotColors(profileId),
      deducted: 0,
    };
  }
  return { ...result, deducted: take };
}

export async function toBeanDto(profileId: string) {
  const balance = await getOrCreateBalance(profileId);
  const slotColors = await getSlotColors(profileId);
  const profile = await prisma.profile.findUniqueOrThrow({
    where: { id: profileId },
    select: { dangerLocked: true },
  });
  return {
    smallBeans: balance.smallBeans,
    bigBeans: balance.bigBeans,
    slotColors,
    dangerLocked: profile.dangerLocked,
  };
}

export const SMALL_PER_BIG = 10;

export const DEFAULT_TAGS = [
  { name: '0投诉', color: '#4CAF50', beansOnComplete: 1 },
  { name: '注意力集中20分钟以上', color: '#2196F3', beansOnComplete: 2 },
  { name: '礼貌交友', color: '#FF9800', beansOnComplete: 1 },
  { name: '逻辑清晰', color: '#9C27B0', beansOnComplete: 2 },
] as const;

export const TAG_COLORS = [
  '#4CAF50',
  '#2196F3',
  '#FF9800',
  '#9C27B0',
  '#E91E63',
  '#00BCD4',
  '#FF5722',
  '#795548',
  '#607D8B',
  '#FFC107',
] as const;

export const PENALTY_COLORS = [
  '#E53935',
  '#FB8C00',
  '#F9A825',
  '#D84315',
  '#C62828',
  '#EF6C00',
  '#FF7043',
  '#BF360C',
] as const;

export const DEFAULT_PENALTY_TAGS = [
  { name: '发脾气', color: '#E53935', beansOnComplete: 2 },
  { name: '不听话', color: '#FB8C00', beansOnComplete: 1 },
  { name: '没礼貌', color: '#F9A825', beansOnComplete: 1 },
] as const;

export const DEFAULT_TAGS_EN = [
  { name: 'No complaints', color: '#4CAF50', beansOnComplete: 1 },
  { name: 'Focused 20 minutes', color: '#2196F3', beansOnComplete: 2 },
  { name: 'Kind to friends', color: '#FF9800', beansOnComplete: 1 },
  { name: 'Clear thinking', color: '#9C27B0', beansOnComplete: 2 },
] as const;

export const DEFAULT_PENALTY_TAGS_EN = [
  { name: 'Tantrum', color: '#E53935', beansOnComplete: 2 },
  { name: 'Not listening', color: '#FB8C00', beansOnComplete: 1 },
  { name: 'Rude', color: '#F9A825', beansOnComplete: 1 },
] as const;

/** Undeletable penalty tag. Amount is small beans; 10 = one big bean. 0 disables it. */
export const MISSED_CHECKIN_SYSTEM_KEY = 'missed_day';

export const MISSED_CHECKIN_TAG = {
  name: '未打卡扣豆',
  color: '#6B1020',
  beansOnComplete: SMALL_PER_BIG,
} as const;

export function isMissedCheckInTag(tag: { systemKey?: string | null }): boolean {
  return tag.systemKey === MISSED_CHECKIN_SYSTEM_KEY;
}

export type TagKind = 'plus' | 'minus';

/** Lock the bean bar / redeem when remaining small-equivalent is this or worse. */
export const DEBT_LOCK_THRESHOLD = -5;

export function totalSmallBeans(balance: { smallBeans: number; bigBeans: number }): number {
  return balance.smallBeans + balance.bigBeans * SMALL_PER_BIG;
}

export function isDebtLocked(totalSmall: number): boolean {
  return totalSmall <= DEBT_LOCK_THRESHOLD;
}

export function isRedeemLocked(
  dangerLocked: boolean,
  balance: { smallBeans: number; bigBeans: number },
): boolean {
  return dangerLocked || isDebtLocked(totalSmallBeans(balance));
}

export type BehaviorTagDto = {
  id: string;
  profileId: string;
  name: string;
  color: string;
  beansOnComplete: number;
  sortOrder: number;
  active: boolean;
  kind: TagKind;
  /** Set for built-in tags. `missed_day` cannot be deleted. */
  systemKey?: string | null;
};

export type CheckInDto = {
  id: string;
  profileId: string;
  tagId: string;
  date: string;
  count: number;
  /** Actual beans granted for this row (includes happy-day rounding). */
  beansAwarded: number;
  tag?: BehaviorTagDto;
};

export type BeanBalanceDto = {
  smallBeans: number;
  bigBeans: number;
  /** Colors filling the current 10-slot progress (left to right) */
  slotColors: string[];
  dangerLocked: boolean;
  debtLocked: boolean;
};

export type DayQuestKind = 'happy' | 'danger';

export type DayQuestDto = {
  date: string;
  kind: DayQuestKind;
  multiplier: number;
  dangerNeed: number;
  revealed: boolean;
  settled: boolean;
  /** Net of plus and minus tags that day (not redemptions). */
  beansEarned: number;
  /** Plus-tag gains only; used for danger-day fill. Redemptions do not count. */
  beansAdded: number;
  /** Small beans taken because this day had no check-in. */
  missedDeducted?: number;
  /** True when that day's penalty was larger than the beans left, so danger lock applied. */
  missedFrozen?: boolean;
};

export type RevealEvent = {
  kind: DayQuestKind;
  multiplier: number;
  dangerNeed: number;
  beansAwarded: number;
};

export type QuestsMonthDto = {
  month: string;
  quests: DayQuestDto[];
  dangerLocked: boolean;
  happyDayRate: number;
};

/** Happy-day beans: round(tagBeans × multiplier), at least 1. Danger-day: tag beans as-is. */
export function awardBeansForQuest(base: number, kind: DayQuestKind, multiplier: number): number {
  if (kind === 'happy') return Math.max(1, Math.round(base * multiplier));
  return Math.max(1, base);
}

/** Plus tags follow the quest multiplier; minus tags are always face value (negative). */
export function beansDeltaForTag(
  tag: { kind: TagKind | string; beansOnComplete: number },
  questKind: DayQuestKind,
  multiplier: number,
): number {
  if (tag.kind === 'minus') return -Math.max(1, tag.beansOnComplete);
  return awardBeansForQuest(tag.beansOnComplete, questKind, multiplier);
}

export type MergeEvent = {
  fromSmall: number;
  toBig: number;
  colors: string[];
};

export type RewardDto = {
  id: string;
  profileId: string;
  title: string;
  costSmall: number;
  costBig: number;
  photoUrl: string | null;
  active: boolean;
  sortOrder: number;
};

export type RedemptionDto = {
  id: string;
  rewardId: string;
  redeemedAt: string;
  costSmall: number;
  costBig: number;
  reward?: RewardDto;
};

export type ProfileDto = {
  id: string;
  familyId: string;
  name: string;
  avatarColor: string;
  sortOrder: number;
};

export type MonthSummaryDto = {
  month: string;
  checkIns: CheckInDto[];
  redemptions: RedemptionDto[];
  totalSmallEarned: number;
  totalBigEarned: number;
  tagStats: Array<{ tagId: string; name: string; color: string; count: number }>;
};

/** Convert total small beans into big + remainder small */
export function normalizeBeans(small: number, big: number): { smallBeans: number; bigBeans: number; merges: number } {
  const totalSmall = small + big * SMALL_PER_BIG;
  const bigBeans = Math.floor(totalSmall / SMALL_PER_BIG);
  const smallBeans = totalSmall % SMALL_PER_BIG;
  const merges = bigBeans - big;
  return { smallBeans, bigBeans, merges: Math.max(0, merges) };
}

/** Can afford cost given balance (1 big = 10 small) */
export function canAfford(
  balance: { smallBeans: number; bigBeans: number },
  cost: { costSmall: number; costBig: number }
): boolean {
  const have = balance.smallBeans + balance.bigBeans * SMALL_PER_BIG;
  const need = cost.costSmall + cost.costBig * SMALL_PER_BIG;
  return have >= need;
}

/** Deduct cost, preferring exact denomination then converting big→small as needed */
export function deductBeans(
  balance: { smallBeans: number; bigBeans: number },
  cost: { costSmall: number; costBig: number }
): { smallBeans: number; bigBeans: number } | null {
  if (!canAfford(balance, cost)) return null;
  let small = balance.smallBeans;
  let big = balance.bigBeans;

  // Pay big beans first when possible
  let needBig = cost.costBig;
  let needSmall = cost.costSmall;

  if (big >= needBig) {
    big -= needBig;
    needBig = 0;
  } else {
    needSmall += (needBig - big) * SMALL_PER_BIG;
    big = 0;
    needBig = 0;
  }

  if (small >= needSmall) {
    small -= needSmall;
  } else {
    const deficit = needSmall - small;
    const convert = Math.ceil(deficit / SMALL_PER_BIG);
    if (big < convert) return null;
    big -= convert;
    small = small + convert * SMALL_PER_BIG - needSmall;
  }

  return { smallBeans: small, bigBeans: big };
}

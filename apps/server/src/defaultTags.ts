import {
  DEFAULT_PENALTY_TAGS,
  DEFAULT_PENALTY_TAGS_EN,
  DEFAULT_TAGS,
  DEFAULT_TAGS_EN,
  MISSED_CHECKIN_SYSTEM_KEY,
  MISSED_CHECKIN_TAG,
} from '@guoguo/shared';

export function defaultTagRows(profileId: string, locale: 'zh' | 'en' = 'zh') {
  const plusTags = locale === 'en' ? DEFAULT_TAGS_EN : DEFAULT_TAGS;
  const minusTags = locale === 'en' ? DEFAULT_PENALTY_TAGS_EN : DEFAULT_PENALTY_TAGS;
  const plus = plusTags.map((t, i) => ({
    profileId,
    name: t.name,
    color: t.color,
    beansOnComplete: t.beansOnComplete,
    sortOrder: i,
    kind: 'plus',
  }));
  const minus = minusTags.map((t, i) => ({
    profileId,
    name: t.name,
    color: t.color,
    beansOnComplete: t.beansOnComplete,
    sortOrder: 100 + i,
    kind: 'minus',
    systemKey: null as string | null,
  }));
  return [
    ...plus.map((row) => ({ ...row, systemKey: null as string | null })),
    {
      profileId,
      name: MISSED_CHECKIN_TAG.name,
      color: MISSED_CHECKIN_TAG.color,
      beansOnComplete: MISSED_CHECKIN_TAG.beansOnComplete,
      sortOrder: -1,
      kind: 'minus',
      systemKey: MISSED_CHECKIN_SYSTEM_KEY,
    },
    ...minus,
  ];
}

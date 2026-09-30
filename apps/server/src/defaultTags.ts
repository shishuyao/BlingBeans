import { DEFAULT_PENALTY_TAGS, DEFAULT_TAGS } from '@guoguo/shared';

export function defaultTagRows(profileId: string) {
  const plus = DEFAULT_TAGS.map((t, i) => ({
    profileId,
    name: t.name,
    color: t.color,
    beansOnComplete: t.beansOnComplete,
    sortOrder: i,
    kind: 'plus',
  }));
  const minus = DEFAULT_PENALTY_TAGS.map((t, i) => ({
    profileId,
    name: t.name,
    color: t.color,
    beansOnComplete: t.beansOnComplete,
    sortOrder: 100 + i,
    kind: 'minus',
  }));
  return [...plus, ...minus];
}

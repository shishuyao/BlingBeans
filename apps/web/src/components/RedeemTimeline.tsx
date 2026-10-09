import { useMemo, useState } from 'react';
import type { RedemptionDto } from '@guoguo/shared';
import { formatDate, todayStr } from '../appContext';
import { useI18n, type MessageKey } from '../i18n';

function useCostLabel() {
  const { t } = useI18n();
  return (r: { costBig: number; costSmall: number }) => {
    const parts: string[] = [];
    if (r.costBig) parts.push(t('costBig', { n: r.costBig }));
    if (r.costSmall) parts.push(t('costSmall', { n: r.costSmall }));
    return parts.join(' + ') || t('free');
  };
}

function useDateHeading() {
  const { t } = useI18n();
  return (key: string) => {
    if (key === todayStr()) return t('today');
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    if (key === formatDate(yest)) return t('yesterday');
    const [y, m, d] = key.split('-');
    const thisYear = new Date().getFullYear() === Number(y);
    return thisYear ? t('monthDay', { m: Number(m), d: Number(d) }) : t('yearMonthDay', { y, m: Number(m), d: Number(d) });
  };
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fullDateTime(iso: string, heading: (key: string) => string) {
  const d = new Date(iso);
  const key = formatDate(d);
  return `${heading(key)} ${timeLabel(iso)}`;
}

type DayGroup = { date: string; items: RedemptionDto[] };

type Props = {
  redemptions: RedemptionDto[];
  emptyHint?: string;
};

export function RedeemTimeline({ redemptions, emptyHint }: Props) {
  const { t } = useI18n();
  const dateHeading = useDateHeading();
  const hint = emptyHint ?? t('noRedeemsEver');
  const [openItems, setOpenItems] = useState<RedemptionDto[] | null>(null);

  const groups = useMemo<DayGroup[]>(() => {
    const map = new Map<string, RedemptionDto[]>();
    for (const row of redemptions) {
      const key = formatDate(new Date(row.redeemedAt));
      const list = map.get(key);
      if (list) list.push(row);
      else map.set(key, [row]);
    }
    return [...map.entries()]
      .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
      .map(([date, items]) => ({
        date,
        items: items.slice().sort((a, b) => (a.redeemedAt < b.redeemedAt ? 1 : -1)),
      }));
  }, [redemptions]);

  return (
    <div className="panel">
      <h3>{t('timelineTitle')}</h3>
      {groups.length === 0 ? (
        <p className="empty-hint">{hint}</p>
      ) : (
        <div className="tl-scroller">
          <ol className="tl">
            {groups.map((g) => {
              const preview = g.items.slice(0, 3);
              const extra = g.items.length - preview.length;
              return (
                <li key={g.date} className="tl-item">
                  <div className="tl-dot" />
                  <div className="tl-date">{dateHeading(g.date)}</div>
                  <button
                    type="button"
                    className={`tl-stack${g.items.length > 1 ? ' multi' : ''}`}
                    onClick={() => setOpenItems(g.items)}
                    aria-label={t('timelineAria', { date: dateHeading(g.date), n: g.items.length })}
                  >
                    {preview.map((item, i) => (
                      <div
                        key={item.id}
                        className="tl-card"
                        style={{ zIndex: preview.length - i, ['--i' as string]: i } as React.CSSProperties}
                      >
                        {item.reward?.photoUrl ? (
                          <img src={item.reward.photoUrl} alt="" />
                        ) : (
                          <div className="tl-card-empty">🎁</div>
                        )}
                        <div className="tl-card-cap">{item.reward?.title ?? t('rewardFallback')}</div>
                      </div>
                    ))}
                    {extra > 0 ? <span className="tl-more">+{extra}</span> : null}
                    {g.items.length > 1 ? <span className="tl-count">{t('sheets', { n: g.items.length })}</span> : null}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {openItems ? <RedeemDetailSheet items={openItems} onClose={() => setOpenItems(null)} /> : null}
    </div>
  );
}

function galleryTitle(
  items: RedemptionDto[],
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
  dateHeading: (key: string) => string,
) {
  const fallback = t('rewardFallback');
  if (items.length === 0) return t('albumTitle');
  const names = new Set(items.map((row) => row.reward?.title ?? fallback));
  if (names.size === 1) {
    const [name] = names;
    return items.length > 1 ? t('albumCount', { name, n: items.length }) : name;
  }
  const keys = new Set(items.map((row) => formatDate(new Date(row.redeemedAt))));
  if (keys.size === 1) {
    const [only] = keys;
    return t('albumDay', { date: dateHeading(only), n: items.length });
  }
  return t('albumTotal', { n: items.length });
}

export function RedeemDetailSheet({
  items,
  onClose,
}: {
  items: RedemptionDto[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const dateHeading = useDateHeading();
  const costLabel = useCostLabel();
  if (items.length === 0) return null;
  const title = galleryTitle(items, t, dateHeading);

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet tl-detail-sheet" role="dialog" aria-label={title}>
        <h3>{title}</h3>
        <div className="tl-gallery">
          {items.map((item) => (
            <article key={item.id} className="tl-gallery-card">
              {item.reward?.photoUrl ? (
                <img src={item.reward.photoUrl} alt={item.reward.title} />
              ) : (
                <div className="tl-gallery-empty">🎁</div>
              )}
              <div className="tl-gallery-cap">{item.reward?.title ?? t('rewardFallback')}</div>
              <div className="tl-gallery-meta">{fullDateTime(item.redeemedAt, dateHeading)}</div>
              <div className="tl-gallery-cost">{t('spent', { cost: costLabel(item) })}</div>
            </article>
          ))}
        </div>
        <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 14 }} onClick={onClose}>
          {t('close')}
        </button>
      </div>
    </>
  );
}

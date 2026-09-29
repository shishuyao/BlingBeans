import { useMemo, useState } from 'react';
import type { RedemptionDto } from '@guoguo/shared';
import { formatDate, todayStr } from '../appContext';

function costLabel(r: { costBig: number; costSmall: number }) {
  const parts: string[] = [];
  if (r.costBig) parts.push(`${r.costBig} 大豆`);
  if (r.costSmall) parts.push(`${r.costSmall} 小豆`);
  return parts.join(' + ') || '免费';
}

function dateHeading(key: string) {
  if (key === todayStr()) return '今天';
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  if (key === formatDate(yest)) return '昨天';
  const [y, m, d] = key.split('-');
  const thisYear = new Date().getFullYear() === Number(y);
  return thisYear ? `${Number(m)}月${Number(d)}日` : `${y}年${Number(m)}月${Number(d)}日`;
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fullDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${timeLabel(iso)}`;
}

type DayGroup = { date: string; items: RedemptionDto[] };

type Props = {
  redemptions: RedemptionDto[];
  emptyHint?: string;
};

export function RedeemTimeline({ redemptions, emptyHint = '还没有兑换记录' }: Props) {
  const [open, setOpen] = useState<{ items: RedemptionDto[]; index: number } | null>(null);

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
      <h3>兑换时间轴</h3>
      {groups.length === 0 ? (
        <p className="empty-hint">{emptyHint}</p>
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
                    onClick={() => setOpen({ items: g.items, index: 0 })}
                    aria-label={`${dateHeading(g.date)}的兑换，共${g.items.length}张`}
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
                        <div className="tl-card-cap">{item.reward?.title ?? '奖励'}</div>
                      </div>
                    ))}
                    {extra > 0 ? <span className="tl-more">+{extra}</span> : null}
                    {g.items.length > 1 ? <span className="tl-count">{g.items.length} 张</span> : null}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {open ? (
        <RedeemDetailSheet
          items={open.items}
          index={open.index}
          onIndex={(index) => setOpen({ ...open, index })}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </div>
  );
}

export function RedeemDetailSheet({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: RedemptionDto[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const current = items[index];
  if (!current) return null;

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet tl-detail-sheet" role="dialog" aria-label="兑换详情">
        <h3>兑换详情</h3>
        <div className="tl-detail-card">
          {current.reward?.photoUrl ? (
            <img src={current.reward.photoUrl} alt={current.reward.title} />
          ) : (
            <div className="tl-detail-empty">🎁</div>
          )}
          <div className="tl-detail-card-cap">{current.reward?.title ?? '奖励'}</div>
        </div>
        <div className="tl-detail-meta">{fullDateTime(current.redeemedAt)}</div>
        <div className="tl-detail-cost">花费 {costLabel(current)}</div>
        {items.length > 1 ? (
          <div className="tl-pager">
            <button type="button" className="btn btn-ghost" disabled={index === 0} onClick={() => onIndex(index - 1)}>
              上一张
            </button>
            <span>
              {index + 1} / {items.length}
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={index >= items.length - 1}
              onClick={() => onIndex(index + 1)}
            >
              下一张
            </button>
          </div>
        ) : null}
        <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 12 }} onClick={onClose}>
          关闭
        </button>
      </div>
    </>
  );
}

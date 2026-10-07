import { useEffect, useMemo, useState } from 'react';
import type { MonthSummaryDto, RedemptionDto } from '@guoguo/shared';
import { api } from '../api';
import { monthLabel, shiftMonth, useApp } from '../appContext';
import { RedeemDetailSheet, RedeemTimeline } from './RedeemTimeline';

type AlbumGroup = {
  rewardId: string;
  title: string;
  photoUrl?: string | null;
  items: RedemptionDto[];
};

function groupAlbum(rows: RedemptionDto[]): AlbumGroup[] {
  const map = new Map<string, AlbumGroup>();
  for (const row of rows) {
    const existing = map.get(row.rewardId);
    if (existing) {
      existing.items.push(row);
      continue;
    }
    map.set(row.rewardId, {
      rewardId: row.rewardId,
      title: row.reward?.title ?? '奖励',
      photoUrl: row.reward?.photoUrl,
      items: [row],
    });
  }
  return [...map.values()].map((g) => ({ ...g, items: g.items.slice().reverse() })).sort((a, b) => {
    const aAt = a.items[0]?.redeemedAt ?? '';
    const bAt = b.items[0]?.redeemedAt ?? '';
    return aAt < bAt ? 1 : aAt > bAt ? -1 : 0;
  });
}

export function SummaryPanel() {
  const { profileId, month, setMonth } = useApp();
  const [data, setData] = useState<MonthSummaryDto | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [albumItems, setAlbumItems] = useState<RedemptionDto[] | null>(null);
  const album = useMemo(() => (data ? groupAlbum(data.redemptions) : []), [data]);

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    setAlbumItems(null);
    api
      .summary(profileId, month)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [profileId, month]);

  return (
    <div>
      <div className="month-nav">
        <button className="icon-btn" type="button" onClick={() => setMonth(shiftMonth(month, -1))}>
          ‹
        </button>
        <h2>{monthLabel(month)}总结</h2>
        <button className="icon-btn" type="button" onClick={() => setMonth(shiftMonth(month, 1))}>
          ›
        </button>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {loading || !data ? (
        <p className="empty-hint">加载中…</p>
      ) : (
        <>
          <div className="stat-row">
            <div className="stat-card">
              <div className="num">{data.totalSmallEarned}</div>
              <div className="label">本月获得小豆</div>
            </div>
            <div className="stat-card">
              <div className="num">{data.redemptions.length}</div>
              <div className="label">兑奖次数</div>
            </div>
          </div>

          <div className="panel">
            <h3>打卡成就</h3>
            {data.tagStats.length === 0 ? (
              <p className="empty-hint">本月还没有打卡</p>
            ) : (
              data.tagStats.map((t) => (
                <div key={t.tagId} className="tag-stat">
                  <span className="tag-swatch" style={{ background: t.color }} />
                  <div className="info" style={{ flex: 1 }}>
                    <div className="title">{t.name}</div>
                  </div>
                  <strong>×{t.count}</strong>
                </div>
              ))
            )}
          </div>

          <RedeemTimeline redemptions={data.redemptions} emptyHint="本月还没有兑换奖励" />

          <div className="panel">
            <h3>兑奖相册</h3>
            {data.redemptions.length === 0 ? (
              <p className="empty-hint">本月还没有兑换奖励</p>
            ) : (
              <div className="redeem-wall">
                {album.map((g) => (
                  <button
                    key={g.rewardId}
                    type="button"
                    className="redeem-tile"
                    onClick={() => setAlbumItems(g.items)}
                    aria-label={g.items.length > 1 ? `${g.title}，兑换 ${g.items.length} 次` : g.title}
                  >
                    {g.photoUrl ? (
                      <img src={g.photoUrl} alt={g.title} />
                    ) : (
                      <div className="redeem-tile-empty">🎁</div>
                    )}
                    {g.items.length > 1 ? <span className="times">×{g.items.length}</span> : null}
                    <div className="cap">{g.title}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {albumItems ? (
            <RedeemDetailSheet items={albumItems} onClose={() => setAlbumItems(null)} />
          ) : null}
        </>
      )}
    </div>
  );
}

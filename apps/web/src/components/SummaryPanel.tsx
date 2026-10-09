import { useEffect, useMemo, useState } from 'react';
import type { MonthSummaryDto, RedemptionDto } from '@guoguo/shared';
import { api } from '../api';
import { shiftMonth, useApp } from '../appContext';
import { formatMonth, tagDisplayName, useI18n } from '../i18n';
import { RedeemDetailSheet, RedeemTimeline } from './RedeemTimeline';

type AlbumGroup = {
  rewardId: string;
  title: string;
  photoUrl?: string | null;
  items: RedemptionDto[];
};

function groupAlbum(rows: RedemptionDto[], fallback: string): AlbumGroup[] {
  const map = new Map<string, AlbumGroup>();
  for (const row of rows) {
    const existing = map.get(row.rewardId);
    if (existing) {
      existing.items.push(row);
      continue;
    }
    map.set(row.rewardId, {
      rewardId: row.rewardId,
      title: row.reward?.title ?? fallback,
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
  const { t, tr, locale } = useI18n();
  const [data, setData] = useState<MonthSummaryDto | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [albumItems, setAlbumItems] = useState<RedemptionDto[] | null>(null);
  const album = useMemo(
    () => (data ? groupAlbum(data.redemptions, t('rewardFallback')) : []),
    [data, t],
  );

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
        <h2>{t('monthSummary', { month: formatMonth(month, locale) })}</h2>
        <button className="icon-btn" type="button" onClick={() => setMonth(shiftMonth(month, 1))}>
          ›
        </button>
      </div>

      {error ? <div className="error-banner">{tr(error)}</div> : null}
      {loading || !data ? (
        <p className="empty-hint">{t('loading')}</p>
      ) : (
        <>
          <div className="stat-row">
            <div className="stat-card">
              <div className="num">{data.totalSmallEarned}</div>
              <div className="label">{t('smallEarned')}</div>
            </div>
            <div className="stat-card">
              <div className="num">{data.redemptions.length}</div>
              <div className="label">{t('redeemCount')}</div>
            </div>
          </div>

          <div className="panel">
            <h3>{t('achievements')}</h3>
            {data.tagStats.length === 0 ? (
              <p className="empty-hint">{t('noCheckins')}</p>
            ) : (
              data.tagStats.map((stat) => (
                <div key={stat.tagId} className="tag-stat">
                  <span className="tag-swatch" style={{ background: stat.color }} />
                  <div className="info" style={{ flex: 1 }}>
                    <div className="title">
                      {tagDisplayName({ name: stat.name, systemKey: stat.tagId === 'missed_day' ? 'missed_day' : null }, t('missedTagName'))}
                    </div>
                  </div>
                  <strong>×{stat.count}</strong>
                </div>
              ))
            )}
          </div>

          <RedeemTimeline redemptions={data.redemptions} emptyHint={t('noRedeems')} />

          <div className="panel">
            <h3>{t('albumTitle')}</h3>
            {data.redemptions.length === 0 ? (
              <p className="empty-hint">{t('noRedeems')}</p>
            ) : (
              <div className="redeem-wall">
                {album.map((g) => (
                  <button
                    key={g.rewardId}
                    type="button"
                    className="redeem-tile"
                    onClick={() => setAlbumItems(g.items)}
                    aria-label={g.items.length > 1 ? t('albumTimes', { title: g.title, n: g.items.length }) : g.title}
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

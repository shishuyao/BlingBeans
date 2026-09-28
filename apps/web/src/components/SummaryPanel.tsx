import { useEffect, useState } from 'react';
import type { MonthSummaryDto } from '@guoguo/shared';
import { api } from '../api';
import { monthLabel, shiftMonth, useApp } from '../appContext';

export function SummaryPanel() {
  const { profileId, month, setMonth } = useApp();
  const [data, setData] = useState<MonthSummaryDto | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
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

          <div className="panel">
            <h3>兑奖相册</h3>
            {data.redemptions.length === 0 ? (
              <p className="empty-hint">本月还没有兑换奖励</p>
            ) : (
              <div className="redeem-wall">
                {data.redemptions.map((r) => (
                  <div key={r.id} className="redeem-tile">
                    {r.reward?.photoUrl ? (
                      <img src={r.reward.photoUrl} alt={r.reward.title} />
                    ) : (
                      <div
                        style={{
                          height: '100%',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: '1.6rem',
                          background: '#e8e0d0',
                        }}
                      >
                        🎁
                      </div>
                    )}
                    <div className="cap">{r.reward?.title ?? '奖励'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

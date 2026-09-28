import type { BehaviorTagDto, CheckInDto } from '@guoguo/shared';

type Props = {
  date: string;
  tags: BehaviorTagDto[];
  checkIns: CheckInDto[];
  onClose: () => void;
  onAdd: (tagId: string) => void;
  onRemove: (tagId: string) => void;
  onUnlock: () => void;
  locked?: boolean;
  busy?: boolean;
};

export function DayCheckInSheet({
  date,
  tags,
  checkIns,
  onClose,
  onAdd,
  onRemove,
  onUnlock,
  locked,
  busy,
}: Props) {
  const activeTags = tags.filter((t) => t.active);
  const countMap = new Map(checkIns.filter((c) => c.date === date).map((c) => [c.tagId, c.count]));
  const [, , day] = date.split('-');
  const title = `${Number(date.slice(5, 7))}月${Number(day)}日打卡`;

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label={title}>
        <h3>{title}</h3>
        {locked ? (
          <div className="lock-hint">
            <p>当前是孩子模式，不能自己加减豆豆</p>
            <button type="button" className="btn btn-primary" onClick={onUnlock}>
              家长解锁
            </button>
          </div>
        ) : null}
        {activeTags.length === 0 ? (
          <p className="empty-hint">还没有行为标签，请先去「标签」页添加</p>
        ) : (
          <div className="tag-list">
            {activeTags.map((tag) => {
              const count = countMap.get(tag.id) ?? 0;
              return (
                <div
                  key={tag.id}
                  className={`tag-row${count > 0 ? ' checked' : ''}`}
                  style={{ color: tag.color }}
                >
                  <span className="tag-swatch" style={{ background: tag.color }} />
                  <div className="tag-name">
                    {tag.name}
                    {count > 1 ? ` ×${count}` : ''}
                  </div>
                  <span className="tag-meta">+{tag.beansOnComplete}豆</span>
                  {!locked ? (
                    <div className="tag-actions">
                      <button
                        type="button"
                        className="mini-btn"
                        disabled={busy || count === 0}
                        onClick={() => onRemove(tag.id)}
                        aria-label="减少一次"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        className="mini-btn plus"
                        disabled={busy}
                        onClick={() => onAdd(tag.id)}
                        aria-label="打卡"
                      >
                        +
                      </button>
                    </div>
                  ) : count > 0 ? (
                    <span className="tag-count">×{count}</span>
                  ) : (
                    <span className="tag-meta">未打卡</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 14 }} onClick={onClose}>
          关闭
        </button>
      </div>
    </>
  );
}

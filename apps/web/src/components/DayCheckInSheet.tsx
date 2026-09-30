import { awardBeansForQuest, type BehaviorTagDto, type CheckInDto, type DayQuestDto } from '@guoguo/shared';

type Props = {
  date: string;
  tags: BehaviorTagDto[];
  checkIns: CheckInDto[];
  quest?: DayQuestDto | null;
  readOnly?: boolean;
  onClose: () => void;
  onAdd: (tagId: string) => void;
  onRemove: (tagId: string) => void;
  onUnlock: () => void;
  locked?: boolean;
  busy?: boolean;
};

function TagRows({
  tags,
  countMap,
  quest,
  variant,
  hideActions,
  busy,
  onAdd,
  onRemove,
}: {
  tags: BehaviorTagDto[];
  countMap: Map<string, number>;
  quest?: DayQuestDto | null;
  variant: 'plus' | 'minus';
  hideActions: boolean;
  busy?: boolean;
  onAdd: (tagId: string) => void;
  onRemove: (tagId: string) => void;
}) {
  if (tags.length === 0) {
    return (
      <p className="empty-hint sheet-col-empty">
        {variant === 'plus' ? '还没有加豆标签' : '还没有扣豆标签'}
      </p>
    );
  }

  return (
    <div className="tag-list">
      {tags.map((tag) => {
        const count = countMap.get(tag.id) ?? 0;
        const base = tag.beansOnComplete;
        const minus = variant === 'minus';
        const award = minus
          ? base
          : quest?.revealed
            ? awardBeansForQuest(base, quest.kind, quest.multiplier)
            : base;
        const happyBoost = Boolean(
          !minus && quest?.revealed && quest.kind === 'happy' && Number(quest.multiplier.toFixed(1)) !== 1,
        );
        return (
          <div
            key={tag.id}
            className={`tag-row${minus ? ' minus' : ''}${count > 0 ? ' checked' : ''}`}
            style={{ color: tag.color }}
          >
            {minus ? (
              <span className="tag-bang" style={{ color: tag.color }} aria-hidden>
                !
              </span>
            ) : (
              <span className="tag-swatch" style={{ background: tag.color }} />
            )}
            <div className="tag-name">
              {tag.name}
              {count > 1 ? ` ×${count}` : ''}
            </div>
            {happyBoost ? (
              <span className="tag-formula" title={`${base} × ${quest!.multiplier.toFixed(1)} ≈ ${award}`}>
                <span className="tag-base">{base}</span>
                <span className="tag-op">×</span>
                <span className="tag-mult">{quest!.multiplier.toFixed(1)}</span>
                <span className="tag-op">≈</span>
                <span className="tag-award">+{award}</span>
              </span>
            ) : (
              <span className="tag-meta">{minus ? `−${award}豆` : `+${award}豆`}</span>
            )}
            {!hideActions ? (
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
                  className={`mini-btn plus${minus ? ' warn' : ''}`}
                  disabled={busy}
                  onClick={() => onAdd(tag.id)}
                  aria-label={minus ? '扣豆' : '打卡'}
                >
                  +
                </button>
              </div>
            ) : count > 0 ? (
              <span className="tag-count">×{count}</span>
            ) : (
              <span className="tag-meta">{minus ? '未扣' : '未打卡'}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DayCheckInSheet({
  date,
  tags,
  checkIns,
  quest,
  readOnly,
  onClose,
  onAdd,
  onRemove,
  onUnlock,
  locked,
  busy,
}: Props) {
  const activeTags = tags.filter((t) => t.active);
  const plusTags = activeTags.filter((t) => t.kind !== 'minus');
  const minusTags = activeTags.filter((t) => t.kind === 'minus');
  const countMap = new Map(checkIns.filter((c) => c.date === date).map((c) => [c.tagId, c.count]));
  const [, , day] = date.split('-');
  const title = `${Number(date.slice(5, 7))}月${Number(day)}日打卡`;
  const hideActions = Boolean(locked || readOnly);

  const questBanner = (() => {
    if (!quest?.revealed) return null;
    if (quest.kind === 'happy') {
      return <div className="quest-banner happy">开心日 · 豆豆 ×{quest.multiplier.toFixed(1)}</div>;
    }
    if (quest.settled) {
      return quest.beansAdded >= quest.dangerNeed ? (
        <div className="quest-banner danger ok">
          危险日过关 · 今日加豆 {quest.beansAdded}/{quest.dangerNeed}
        </div>
      ) : (
        <div className="quest-banner danger">
          危险日未过关 · 已扣除 {quest.dangerNeed} 豆
        </div>
      );
    }
    return (
      <div className="quest-banner danger">
        危险日 · 今天要加满 {quest.dangerNeed} 颗（已加 {quest.beansAdded}，兑奖不算）
      </div>
    );
  })();

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet sheet-checkin" role="dialog" aria-label={title}>
        <h3>{title}</h3>
        {questBanner}
        {readOnly ? (
          <div className="lock-hint">
            <p>这一天已经过去，只能看看，不能再改哦</p>
          </div>
        ) : locked ? (
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
          <div className="sheet-split">
            <section className="sheet-col plus">
              <h4>加豆</h4>
              <TagRows
                tags={plusTags}
                countMap={countMap}
                quest={quest}
                variant="plus"
                hideActions={hideActions}
                busy={busy}
                onAdd={onAdd}
                onRemove={onRemove}
              />
            </section>
            <section className="sheet-col minus">
              <h4>扣豆</h4>
              <TagRows
                tags={minusTags}
                countMap={countMap}
                quest={quest}
                variant="minus"
                hideActions={hideActions}
                busy={busy}
                onAdd={onAdd}
                onRemove={onRemove}
              />
            </section>
          </div>
        )}
        <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 14 }} onClick={onClose}>
          关闭
        </button>
      </div>
    </>
  );
}

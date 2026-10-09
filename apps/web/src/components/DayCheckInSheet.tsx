import {
  awardBeansForQuest,
  isMissedCheckInTag,
  type BehaviorTagDto,
  type CheckInDto,
  type DayQuestDto,
} from '@guoguo/shared';
import { useI18n } from '../i18n';

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
  const { t } = useI18n();
  if (tags.length === 0) {
    return (
      <p className="empty-hint sheet-col-empty">
        {variant === 'plus' ? t('noPlusTags') : t('noMinusTags')}
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
              <span className="tag-meta">
                {minus ? `−${t('beansShort', { n: award })}` : `+${t('beansShort', { n: award })}`}
              </span>
            )}
            {!hideActions ? (
              <div className="tag-actions">
                <button
                  type="button"
                  className="mini-btn"
                  disabled={busy || count === 0}
                  onClick={() => onRemove(tag.id)}
                  aria-label={t('undoOnce')}
                >
                  −
                </button>
                <button
                  type="button"
                  className={`mini-btn plus${minus ? ' warn' : ''}`}
                  disabled={busy}
                  onClick={() => onAdd(tag.id)}
                  aria-label={minus ? t('deduct') : t('checkIn')}
                >
                  +
                </button>
              </div>
            ) : count > 0 ? (
              <span className="tag-count">×{count}</span>
            ) : (
              <span className="tag-meta">{minus ? t('notDeducted') : t('notChecked')}</span>
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
  const minusTags = activeTags.filter((t) => t.kind === 'minus' && !isMissedCheckInTag(t));
  const countMap = new Map(checkIns.filter((c) => c.date === date).map((c) => [c.tagId, c.count]));
  const { t } = useI18n();
  const [, , day] = date.split('-');
  const title = t('checkinTitle', { month: Number(date.slice(5, 7)), day: Number(day) });
  const hideActions = Boolean(locked || readOnly);

  const questBanner = (() => {
    if (!quest?.revealed) return null;
    if (quest.kind === 'happy') {
      return <div className="quest-banner happy">{t('happyBanner', { mult: quest.multiplier.toFixed(1) })}</div>;
    }
    if (quest.settled) {
      return quest.beansAdded >= quest.dangerNeed ? (
        <div className="quest-banner danger ok">
          {t('dangerPass', { added: quest.beansAdded, need: quest.dangerNeed })}
        </div>
      ) : (
        <div className="quest-banner danger">
          {t('dangerFail', { need: quest.dangerNeed })}
        </div>
      );
    }
    return (
      <div className="quest-banner danger">
        {t('dangerToday', { need: quest.dangerNeed, added: quest.beansAdded })}
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
            <p>{t('pastReadOnly')}</p>
          </div>
        ) : locked ? (
          <div className="lock-hint">
            <p>{t('kidModeHint')}</p>
            <button type="button" className="btn btn-primary" onClick={onUnlock}>
              {t('parentUnlock')}
            </button>
          </div>
        ) : null}
        {activeTags.length === 0 ? (
          <p className="empty-hint">{t('noBehaviorTags')}</p>
        ) : (
          <div className="sheet-split">
            <section className="sheet-col plus">
              <h4>{t('plusCol')}</h4>
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
              <h4>{t('minusCol')}</h4>
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
          {t('close')}
        </button>
      </div>
    </>
  );
}

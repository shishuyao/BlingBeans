import { useEffect, useRef, useState } from 'react';
import {
  PENALTY_COLORS,
  TAG_COLORS,
  isMissedCheckInTag,
  type BehaviorTagDto,
  type TagKind,
} from '@guoguo/shared';
import { api } from '../api';
import { useApp } from '../appContext';
import { tagDisplayName, useI18n } from '../i18n';

export function TagsPanel() {
  const { profileId } = useApp();
  const { t, tr } = useI18n();
  const [tags, setTags] = useState<BehaviorTagDto[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(TAG_COLORS[0]);
  const [beans, setBeans] = useState(1);
  const [kind, setKind] = useState<TagKind>('plus');
  const [editing, setEditing] = useState<BehaviorTagDto | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!profileId) return;
    const list = await api.tags.list(profileId);
    setTags(list.filter((t) => t.active));
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [profileId]);

  useEffect(() => {
    if (!showForm) return;
    const t = window.setTimeout(() => nameRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [showForm]);

  const palette = kind === 'minus' ? PENALTY_COLORS : TAG_COLORS;

  const closeForm = () => {
    setName('');
    setColor(TAG_COLORS[0]);
    setBeans(1);
    setKind('plus');
    setEditing(null);
    setShowForm(false);
    setError('');
  };

  const openCreate = (nextKind: TagKind) => {
    setName('');
    setKind(nextKind);
    setColor(nextKind === 'minus' ? PENALTY_COLORS[0] : TAG_COLORS[0]);
    setBeans(1);
    setEditing(null);
    setError('');
    setShowForm(true);
  };

  const openEdit = (tag: BehaviorTagDto) => {
    setEditing(tag);
    setKind(tag.kind === 'minus' ? 'minus' : 'plus');
    setName(tag.name);
    setColor(tag.color);
    setBeans(tag.beansOnComplete);
    setError('');
    setShowForm(true);
  };

  const editingMissed = Boolean(editing && isMissedCheckInTag(editing));

  const submit = async () => {
    if (!profileId || !name.trim()) return;
    if (!editingMissed && beans < 1) {
      setError(kind === 'minus' ? t('tagMinMinus') : t('tagMinPlus'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (editing) {
        await api.tags.update(
          editing.id,
          editingMissed
            ? { beansOnComplete: beans }
            : {
                name: name.trim(),
                color,
                beansOnComplete: beans,
              },
        );
      } else {
        await api.tags.create({
          profileId,
          name: name.trim(),
          color,
          beansOnComplete: beans,
          kind,
        });
      }
      closeForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('saveFail'));
    } finally {
      setLoading(false);
    }
  };

  const remove = async (tag: BehaviorTagDto) => {
    if (isMissedCheckInTag(tag)) return;
    if (!confirm(t('deleteTagConfirm', { name: tagDisplayName(tag, t('missedTagName')) }))) return;
    await api.tags.remove(tag.id);
    if (editing?.id === tag.id) closeForm();
    await load();
  };

  const colors = (palette as readonly string[]).includes(color)
    ? palette
    : ([color, ...palette] as string[]);
  const beanMax = editingMissed ? 100 : 20;

  const missedLabel = (n: number) => {
    if (n <= 0) return t('missedOff');
    const big = n / 10;
    const bigText = Number.isInteger(big)
      ? t('bigBeansExact', { n: big })
      : t('bigBeansDecimal', { n: big.toFixed(1) });
    return t('missedDayLine', { n, big: bigText });
  };

  const plusTags = tags.filter((t) => t.kind !== 'minus');
  const minusTags = tags.filter((t) => t.kind === 'minus');
  const formTitle = editing
    ? kind === 'minus'
      ? t('editMinus')
      : t('editPlus')
    : kind === 'minus'
      ? t('newMinus')
      : t('newPlus');

  const renderList = (list: BehaviorTagDto[], variant: TagKind) => (
    <div className="manage-list">
      {list.length === 0 ? (
        <p className="empty-hint">{variant === 'plus' ? t('noPlusYet') : t('noMinusYet')}</p>
      ) : null}
      {list.map((tag) => {
        const missed = isMissedCheckInTag(tag);
        return (
          <div
            key={tag.id}
            className={`manage-item${missed ? ' system-missed' : ''}`}
            style={missed ? { background: tag.color } : undefined}
          >
            {variant === 'minus' ? (
              <span className="tag-bang" style={missed ? undefined : { color: tag.color }} aria-hidden>
                !
              </span>
            ) : (
              <span className="tag-swatch" style={{ background: tag.color }} />
            )}
            <div className="info">
              <div className="title">{tagDisplayName(tag, t('missedTagName'))}</div>
              <div className="sub">
                {missed
                  ? missedLabel(tag.beansOnComplete)
                  : variant === 'minus'
                    ? t('onceMinus', { n: tag.beansOnComplete })
                    : t('oncePlus', { n: tag.beansOnComplete })}
              </div>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => openEdit(tag)}>
              {t('edit')}
            </button>
            {missed ? null : (
              <button type="button" className="btn btn-danger" onClick={() => remove(tag)}>
                {t('delete')}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      <div className="tag-manage-split">
        <div className="panel">
          <div className="tag-manage-head">
            <h3>{t('plusTags')}</h3>
            <button type="button" className="btn btn-primary" onClick={() => openCreate('plus')}>
              {t('newBtn')}
            </button>
          </div>
          {renderList(plusTags, 'plus')}
        </div>
        <div className="panel tag-manage-minus">
          <div className="tag-manage-head">
            <h3>{t('minusTags')}</h3>
            <button type="button" className="btn btn-danger" onClick={() => openCreate('minus')}>
              {t('newBtn')}
            </button>
          </div>
          {renderList(minusTags, 'minus')}
        </div>
      </div>

      {showForm ? (
        <>
          <div className="sheet-backdrop" onClick={closeForm} />
          <div className="sheet" role="dialog" aria-label={formTitle}>
            <h3>{editingMissed ? t('missedTagName') : formTitle}</h3>
            {error ? <div className="error-banner">{tr(error)}</div> : null}
            {editingMissed ? (
              <p className="missed-tag-note">{t('missedNote')}</p>
            ) : (
              <>
                <div className="form-row">
                  <label>{t('nameLabel')}</label>
                  <input
                    ref={nameRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={kind === 'minus' ? t('exampleTantrum') : t('examplePolite')}
                  />
                </div>
                <div className="form-row">
                  <label>{t('colorLabel')}</label>
                  <div className="color-picker">
                    {colors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`color-dot${color === c ? ' selected' : ''}`}
                        style={{ background: c }}
                        onClick={() => setColor(c)}
                        aria-label={c}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="form-row">
              <label>{editingMissed ? t('missedAmountLabel') : kind === 'minus' ? t('onceDeduct') : t('beansToEarn')}</label>
              <input
                type="number"
                min={0}
                max={beanMax}
                inputMode="numeric"
                value={beans}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    setBeans(0);
                    return;
                  }
                  const n = Number(raw);
                  if (!Number.isFinite(n)) return;
                  setBeans(Math.min(beanMax, Math.max(0, Math.floor(n))));
                }}
              />
            </div>
            {editingMissed ? <p className="field-hint">{missedLabel(beans)}</p> : null}
            <div className="form-inline">
              <button type="button" className="btn btn-primary" disabled={loading || !name.trim()} onClick={submit}>
                {editing ? t('save') : t('add')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={closeForm}>
                {t('cancel')}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

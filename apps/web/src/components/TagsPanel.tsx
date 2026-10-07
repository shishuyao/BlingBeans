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

export function TagsPanel() {
  const { profileId } = useApp();
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
      setError(kind === 'minus' ? '扣豆数至少为 1' : '达标豆豆数至少为 1');
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
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (tag: BehaviorTagDto) => {
    if (isMissedCheckInTag(tag)) return;
    if (!confirm(`删除标签「${tag.name}」？历史打卡会保留。`)) return;
    await api.tags.remove(tag.id);
    if (editing?.id === tag.id) closeForm();
    await load();
  };

  const colors = (palette as readonly string[]).includes(color)
    ? palette
    : ([color, ...palette] as string[]);
  const beanMax = editingMissed ? 100 : 20;

  const missedLabel = (n: number) => {
    if (n <= 0) return '已关闭 · 漏打卡不扣豆';
    const big = n / 10;
    const bigText = Number.isInteger(big) ? `${big} 大豆` : `${big.toFixed(1)} 大豆`;
    return `漏打卡一天 −${n} 小豆（${bigText}）`;
  };

  const plusTags = tags.filter((t) => t.kind !== 'minus');
  const minusTags = tags.filter((t) => t.kind === 'minus');
  const formTitle = editing
    ? kind === 'minus'
      ? '编辑扣豆标签'
      : '编辑加豆标签'
    : kind === 'minus'
      ? '新增扣豆标签'
      : '新增加豆标签';

  const renderList = (list: BehaviorTagDto[], variant: TagKind) => (
    <div className="manage-list">
      {list.length === 0 ? (
        <p className="empty-hint">{variant === 'plus' ? '暂无加豆标签' : '暂无扣豆标签'}</p>
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
              <div className="title">{tag.name}</div>
              <div className="sub">
                {missed
                  ? missedLabel(tag.beansOnComplete)
                  : variant === 'minus'
                    ? `一次 −${tag.beansOnComplete} 小豆`
                    : `达标 +${tag.beansOnComplete} 小豆`}
              </div>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => openEdit(tag)}>
              编辑
            </button>
            {missed ? null : (
              <button type="button" className="btn btn-danger" onClick={() => remove(tag)}>
                删
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
            <h3>加豆标签</h3>
            <button type="button" className="btn btn-primary" onClick={() => openCreate('plus')}>
              ＋ 新增
            </button>
          </div>
          {renderList(plusTags, 'plus')}
        </div>
        <div className="panel tag-manage-minus">
          <div className="tag-manage-head">
            <h3>扣豆标签</h3>
            <button type="button" className="btn btn-danger" onClick={() => openCreate('minus')}>
              ＋ 新增
            </button>
          </div>
          {renderList(minusTags, 'minus')}
        </div>
      </div>

      {showForm ? (
        <>
          <div className="sheet-backdrop" onClick={closeForm} />
          <div className="sheet" role="dialog" aria-label={formTitle}>
            <h3>{editingMissed ? '未打卡扣豆' : formTitle}</h3>
            {error ? <div className="error-banner">{error}</div> : null}
            {editingMissed ? (
              <p className="missed-tag-note">
                从第一次打卡的第二天起，已经过去却没打卡的日子会自动扣这里的数量。10 小豆 = 1 大豆。填 0
                则不扣。要扣的比剩下的多时，扣到 0 并进入危险模式。这条不能删除。
              </p>
            ) : (
              <>
                <div className="form-row">
                  <label>名称</label>
                  <input
                    ref={nameRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={kind === 'minus' ? '例如：发脾气' : '例如：礼貌交友'}
                  />
                </div>
                <div className="form-row">
                  <label>颜色</label>
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
              <label>{editingMissed ? '未打卡扣几颗小豆' : kind === 'minus' ? '一次扣豆数' : '达标豆豆数'}</label>
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
                {editing ? '保存' : '添加'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={closeForm}>
                取消
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

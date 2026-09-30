import { useEffect, useRef, useState } from 'react';
import { PENALTY_COLORS, TAG_COLORS, type BehaviorTagDto, type TagKind } from '@guoguo/shared';
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

  const submit = async () => {
    if (!profileId || !name.trim()) return;
    if (beans < 1) {
      setError(kind === 'minus' ? '扣豆数至少为 1' : '达标豆豆数至少为 1');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (editing) {
        await api.tags.update(editing.id, {
          name: name.trim(),
          color,
          beansOnComplete: beans,
        });
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
    if (!confirm(`删除标签「${tag.name}」？历史打卡会保留。`)) return;
    await api.tags.remove(tag.id);
    if (editing?.id === tag.id) closeForm();
    await load();
  };

  const colors = (palette as readonly string[]).includes(color)
    ? palette
    : ([color, ...palette] as string[]);

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
      {list.map((tag) => (
        <div key={tag.id} className="manage-item">
          {variant === 'minus' ? (
            <span className="tag-bang" style={{ color: tag.color }} aria-hidden>
              !
            </span>
          ) : (
            <span className="tag-swatch" style={{ background: tag.color }} />
          )}
          <div className="info">
            <div className="title">{tag.name}</div>
            <div className="sub">
              {variant === 'minus' ? `一次 −${tag.beansOnComplete} 小豆` : `达标 +${tag.beansOnComplete} 小豆`}
            </div>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => openEdit(tag)}>
            编辑
          </button>
          <button type="button" className="btn btn-danger" onClick={() => remove(tag)}>
            删
          </button>
        </div>
      ))}
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
            <h3>{formTitle}</h3>
            {error ? <div className="error-banner">{error}</div> : null}
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
            <div className="form-row">
              <label>{kind === 'minus' ? '一次扣豆数' : '达标豆豆数'}</label>
              <input
                type="number"
                min={0}
                max={20}
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
                  setBeans(Math.min(20, Math.max(0, Math.floor(n))));
                }}
              />
            </div>
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

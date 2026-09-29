import { useEffect, useRef, useState } from 'react';
import { TAG_COLORS, type BehaviorTagDto } from '@guoguo/shared';
import { api } from '../api';
import { useApp } from '../appContext';

export function TagsPanel() {
  const { profileId } = useApp();
  const [tags, setTags] = useState<BehaviorTagDto[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(TAG_COLORS[0]);
  const [beans, setBeans] = useState(1);
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

  const closeForm = () => {
    setName('');
    setColor(TAG_COLORS[0]);
    setBeans(1);
    setEditing(null);
    setShowForm(false);
    setError('');
  };

  const openCreate = () => {
    setName('');
    setColor(TAG_COLORS[0]);
    setBeans(1);
    setEditing(null);
    setError('');
    setShowForm(true);
  };

  const openEdit = (tag: BehaviorTagDto) => {
    setEditing(tag);
    setName(tag.name);
    setColor(tag.color);
    setBeans(tag.beansOnComplete);
    setError('');
    setShowForm(true);
  };

  const submit = async () => {
    if (!profileId || !name.trim()) return;
    if (beans < 1) {
      setError('达标豆豆数至少为 1');
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

  const colors = TAG_COLORS.includes(color as (typeof TAG_COLORS)[number])
    ? TAG_COLORS
    : ([color, ...TAG_COLORS] as string[]);

  return (
    <div>
      <div className="form-inline" style={{ marginBottom: 12 }}>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          ＋ 新增
        </button>
      </div>

      <div className="panel">
        <h3>当前标签</h3>
        <div className="manage-list">
          {tags.length === 0 ? <p className="empty-hint">暂无标签，点上方新增</p> : null}
          {tags.map((tag) => (
            <div key={tag.id} className="manage-item">
              <span className="tag-swatch" style={{ background: tag.color }} />
              <div className="info">
                <div className="title">{tag.name}</div>
                <div className="sub">达标 +{tag.beansOnComplete} 小豆</div>
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
      </div>

      {showForm ? (
        <>
          <div className="sheet-backdrop" onClick={closeForm} />
          <div className="sheet" role="dialog" aria-label={editing ? '编辑标签' : '新增标签'}>
            <h3>{editing ? '编辑标签' : '新增标签'}</h3>
            {error ? <div className="error-banner">{error}</div> : null}
            <div className="form-row">
              <label>名称</label>
              <input
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：礼貌交友"
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
              <label>达标豆豆数</label>
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

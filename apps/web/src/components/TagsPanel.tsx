import { useEffect, useState } from 'react';
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!profileId) return;
    const list = await api.tags.list(profileId);
    setTags(list.filter((t) => t.active));
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [profileId]);

  const resetForm = () => {
    setName('');
    setColor(TAG_COLORS[0]);
    setBeans(1);
    setEditing(null);
  };

  const submit = async () => {
    if (!profileId || !name.trim()) return;
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
      resetForm();
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
    if (editing?.id === tag.id) resetForm();
    await load();
  };

  return (
    <div>
      <div className="panel">
        <h3>{editing ? '编辑标签' : '新建标签'}</h3>
        {error ? <div className="error-banner">{error}</div> : null}
        <div className="form-row">
          <label>名称</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：礼貌交友" />
        </div>
        <div className="form-row">
          <label>颜色</label>
          <div className="color-picker">
            {TAG_COLORS.map((c) => (
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
            min={1}
            max={20}
            value={beans}
            onChange={(e) => setBeans(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
        <div className="form-inline">
          <button type="button" className="btn btn-primary" disabled={loading || !name.trim()} onClick={submit}>
            {editing ? '保存' : '添加'}
          </button>
          {editing ? (
            <button type="button" className="btn btn-ghost" onClick={resetForm}>
              取消
            </button>
          ) : null}
        </div>
      </div>

      <div className="panel">
        <h3>当前标签</h3>
        <div className="manage-list">
          {tags.length === 0 ? <p className="empty-hint">暂无标签</p> : null}
          {tags.map((tag) => (
            <div key={tag.id} className="manage-item">
              <span className="tag-swatch" style={{ background: tag.color }} />
              <div className="info">
                <div className="title">{tag.name}</div>
                <div className="sub">达标 +{tag.beansOnComplete} 小豆</div>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setEditing(tag);
                  setName(tag.name);
                  setColor(tag.color);
                  setBeans(tag.beansOnComplete);
                }}
              >
                编辑
              </button>
              <button type="button" className="btn btn-danger" onClick={() => remove(tag)}>
                删
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

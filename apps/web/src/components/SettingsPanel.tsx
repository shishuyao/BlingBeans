import { useState } from 'react';
import { TAG_COLORS } from '@guoguo/shared';
import { api } from '../api';
import { useApp } from '../appContext';

export function SettingsPanel() {
  const { me, profiles, profileId, setProfileId, refreshMe, setMe } = useApp();
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(TAG_COLORS[1]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const addProfile = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const p = await api.profiles.create({ name: name.trim(), avatarColor: color });
      setName('');
      await refreshMe();
      setProfileId(p.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建失败');
    } finally {
      setBusy(false);
    }
  };

  const rename = async (id: string, next: string) => {
    const n = prompt('新名称', next);
    if (!n?.trim()) return;
    await api.profiles.update(id, { name: n.trim() });
    await refreshMe();
  };

  const remove = async (id: string, pname: string) => {
    if (!confirm(`删除档案「${pname}」？所有打卡与豆豆将一并删除。`)) return;
    try {
      await api.profiles.remove(id);
      await refreshMe();
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    }
  };

  const logout = async () => {
    await api.logout();
    setMe(null);
  };

  return (
    <div>
      <div className="panel">
        <h3>家庭账号</h3>
        <p style={{ margin: '0 0 8px', color: 'var(--ink-muted)', fontWeight: 700 }}>
          {me?.familyName} · {me?.user.email}
        </p>
        <button type="button" className="btn btn-ghost" onClick={logout}>
          退出登录
        </button>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="panel">
        <h3>成员档案</h3>
        <div className="manage-list">
          {profiles.map((p) => (
            <div key={p.id} className="manage-item">
              <span className="tag-swatch" style={{ background: p.avatarColor }} />
              <div className="info">
                <div className="title">
                  {p.name}
                  {p.id === profileId ? '（当前）' : ''}
                </div>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setProfileId(p.id)}>
                切换
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => rename(p.id, p.name)}>
                改名
              </button>
              <button type="button" className="btn btn-danger" onClick={() => remove(p.id, p.name)}>
                删
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>添加孩子档案</h3>
        <div className="form-row">
          <label>名字</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="孩子名字" />
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
              />
            ))}
          </div>
        </div>
        <button type="button" className="btn btn-primary" disabled={busy || !name.trim()} onClick={addProfile}>
          添加
        </button>
      </div>
    </div>
  );
}

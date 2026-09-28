import { useEffect, useState } from 'react';
import { canAfford, type RewardDto } from '@guoguo/shared';
import { api } from '../api';
import { useApp } from '../appContext';

function costLabel(r: { costBig: number; costSmall: number }) {
  const parts: string[] = [];
  if (r.costBig) parts.push(`${r.costBig} 大豆`);
  if (r.costSmall) parts.push(`${r.costSmall} 小豆`);
  return parts.join(' + ') || '免费';
}

export function RewardsPanel() {
  const { profileId, beans, setBeans } = useApp();
  const [rewards, setRewards] = useState<RewardDto[]>([]);
  const [title, setTitle] = useState('');
  const [costBig, setCostBig] = useState(0);
  const [costSmall, setCostSmall] = useState(5);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState<RewardDto | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    if (!profileId) return;
    setRewards(await api.rewards.list(profileId));
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [profileId]);

  const resetForm = () => {
    setTitle('');
    setCostBig(0);
    setCostSmall(5);
    setPhotoUrl(null);
    setEditing(null);
    setShowForm(false);
  };

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const { url } = await api.upload(file);
      setPhotoUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!profileId || !title.trim()) return;
    if (costBig === 0 && costSmall === 0) {
      setError('请设置兑换价格');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (editing) {
        await api.rewards.update(editing.id, {
          title: title.trim(),
          costBig,
          costSmall,
          photoUrl,
        });
      } else {
        await api.rewards.create({
          profileId,
          title: title.trim(),
          costBig,
          costSmall,
          photoUrl,
        });
      }
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  const redeem = async (reward: RewardDto) => {
    if (!confirm(`确认兑换「${reward.title}」？`)) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.rewards.redeem(reward.id);
      setBeans(res.beans);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '兑换失败');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (reward: RewardDto) => {
    if (!confirm(`删除奖励「${reward.title}」？`)) return;
    await api.rewards.remove(reward.id);
    await load();
  };

  return (
    <div>
      {error ? <div className="error-banner">{error}</div> : null}

      <div className="form-inline" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          ＋ 添加奖励
        </button>
      </div>

      {showForm ? (
        <div className="panel">
          <h3>{editing ? '编辑奖励' : '新建奖励'}</h3>
          <div className="form-row">
            <label>名称</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：一次冰淇淋" />
          </div>
          <div className="form-inline">
            <div className="form-row" style={{ flex: 1 }}>
              <label>大豆豆</label>
              <input
                type="number"
                min={0}
                value={costBig}
                onChange={(e) => setCostBig(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            <div className="form-row" style={{ flex: 1 }}>
              <label>小豆豆</label>
              <input
                type="number"
                min={0}
                max={9}
                value={costSmall}
                onChange={(e) => setCostSmall(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
          </div>
          <div className="form-row">
            <label>照片</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => onUpload(e.target.files?.[0])}
            />
            {photoUrl ? (
              <img src={photoUrl} alt="预览" style={{ marginTop: 8, borderRadius: 12, maxHeight: 140 }} />
            ) : null}
          </div>
          <div className="form-inline">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={submit}>
              保存
            </button>
            <button type="button" className="btn btn-ghost" onClick={resetForm}>
              取消
            </button>
          </div>
        </div>
      ) : null}

      <div className="reward-grid">
        {rewards.length === 0 ? <p className="empty-hint" style={{ gridColumn: '1 / -1' }}>还没有奖励，点上方添加</p> : null}
        {rewards.map((r) => {
          const affordable = beans ? canAfford(beans, r) : false;
          return (
            <div key={r.id} className="reward-card">
              {r.photoUrl ? (
                <img className="reward-photo" src={r.photoUrl} alt={r.title} />
              ) : (
                <div className="reward-photo placeholder">🎁</div>
              )}
              <div className="reward-body">
                <div className="reward-title">{r.title}</div>
                <div className="reward-cost">{costLabel(r)}</div>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || !affordable}
                  onClick={() => redeem(r)}
                >
                  兑换
                </button>
                <div className="form-inline">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ flex: 1, minHeight: 40 }}
                    onClick={() => {
                      setEditing(r);
                      setTitle(r.title);
                      setCostBig(r.costBig);
                      setCostSmall(r.costSmall);
                      setPhotoUrl(r.photoUrl);
                      setShowForm(true);
                    }}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ flex: 1, minHeight: 40 }}
                    onClick={() => remove(r)}
                  >
                    删
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

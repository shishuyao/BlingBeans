import { useEffect, useState } from 'react';
import { canAfford, type RewardDto } from '@guoguo/shared';
import { api } from '../api';
import { useApp } from '../appContext';
import { useI18n } from '../i18n';
import { ImageCropper } from './ImageCropper';
import { RedeemCelebration } from './RedeemCelebration';

export function RewardsPanel() {
  const { profileId, beans, setBeans } = useApp();
  const { t, tr } = useI18n();
  const costLabel = (r: { costBig: number; costSmall: number }) => {
    const parts: string[] = [];
    if (r.costBig) parts.push(t('costBig', { n: r.costBig }));
    if (r.costSmall) parts.push(t('costSmall', { n: r.costSmall }));
    return parts.join(' + ') || t('free');
  };
  const [rewards, setRewards] = useState<RewardDto[]>([]);
  const [title, setTitle] = useState('');
  const [costBig, setCostBig] = useState(0);
  const [costSmall, setCostSmall] = useState(5);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState<RewardDto | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [celebrating, setCelebrating] = useState<RewardDto | null>(null);

  const load = async () => {
    if (!profileId) return;
    setRewards(await api.rewards.list(profileId));
  };

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : t('saveFail')));
  }, [profileId]);

  const resetForm = () => {
    setTitle('');
    setCostBig(0);
    setCostSmall(5);
    setPhotoUrl(null);
    setEditing(null);
    setShowForm(false);
  };

  const onPickPhoto = (file: File | undefined) => {
    if (!file) return;
    setCropFile(file);
  };

  const onUpload = async (file: File) => {
    setBusy(true);
    try {
      const { url } = await api.upload(file);
      setPhotoUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('uploadFail'));
    } finally {
      setBusy(false);
    }
  };

  const onCropped = async (file: File) => {
    setCropFile(null);
    await onUpload(file);
  };

  const submit = async () => {
    if (!profileId || !title.trim()) return;
    if (costBig === 0 && costSmall === 0) {
      setError(t('setPrice'));
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
      setError(e instanceof Error ? e.message : t('saveFail'));
    } finally {
      setBusy(false);
    }
  };

  const dangerLocked = Boolean(beans?.dangerLocked);

  const redeem = async (reward: RewardDto) => {
    if (dangerLocked) {
      setError(t('dangerBanner'));
      return;
    }
    if (!confirm(t('redeemConfirm', { title: reward.title }))) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.rewards.redeem(reward.id);
      setBeans(res.beans);
      setCelebrating(reward);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('redeemFail'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (reward: RewardDto) => {
    if (!confirm(t('deleteRewardConfirm', { title: reward.title }))) return;
    await api.rewards.remove(reward.id);
    await load();
  };

  return (
    <div>
      {error ? <div className="error-banner">{tr(error)}</div> : null}
      {dangerLocked ? (
        <div className="danger-mode-banner" style={{ marginBottom: 12 }}>
          {t('dangerRedeemBanner')}
        </div>
      ) : null}

      <div className="form-inline" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          {t('addReward')}
        </button>
      </div>

      {showForm ? (
        <div className="panel">
          <h3>{editing ? t('editReward') : t('newReward')}</h3>
          <div className="form-row">
            <label>{t('nameLabel')}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('exampleIceCream')} />
          </div>
          <div className="form-inline">
            <div className="form-row" style={{ flex: 1 }}>
              <label>{t('bigBeansLabel')}</label>
              <input
                type="number"
                min={0}
                value={costBig}
                onChange={(e) => setCostBig(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            <div className="form-row" style={{ flex: 1 }}>
              <label>{t('smallBeansLabel')}</label>
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
            <label>{t('photo')}</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                onPickPhoto(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            {photoUrl ? (
              <img src={photoUrl} alt={t('preview')} style={{ marginTop: 8, borderRadius: 12, maxHeight: 140, objectFit: 'cover' }} />
            ) : null}
          </div>
          <div className="form-inline">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={submit}>
              {t('save')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={resetForm}>
              {t('cancel')}
            </button>
          </div>
        </div>
      ) : null}

      <div className="reward-grid">
        {rewards.length === 0 ? <p className="empty-hint" style={{ gridColumn: '1 / -1' }}>{t('noRewards')}</p> : null}
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
                  disabled={busy || !affordable || dangerLocked}
                  onClick={() => redeem(r)}
                >
                  {dangerLocked ? t('locked') : t('redeem')}
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
                    {t('edit')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ flex: 1, minHeight: 40 }}
                    onClick={() => remove(r)}
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {cropFile ? (
        <ImageCropper
          file={cropFile}
          aspect={4 / 3}
          onCancel={() => setCropFile(null)}
          onConfirm={onCropped}
        />
      ) : null}
      {celebrating ? (
        <RedeemCelebration reward={celebrating} onDone={() => setCelebrating(null)} />
      ) : null}
    </div>
  );
}

import { useState } from 'react';
import { TAG_COLORS } from '@guoguo/shared';
import { api } from '../api';
import { useApp } from '../appContext';
import { useI18n } from '../i18n';

export function SettingsPanel() {
  const {
    me,
    profiles,
    profileId,
    setProfileId,
    refreshMe,
    setMe,
    hasPin,
    parentUnlocked,
    unlockUntil,
    lockParent,
    openPinModal,
  } = useApp();
  const { t, tr, locale } = useI18n();
  const remain = (until: string | null) => {
    if (!until) return '';
    const ms = new Date(until).getTime() - Date.now();
    if (ms <= 0) return t('unlockExpired');
    return t('minutes', { m: Math.ceil(ms / 60000) });
  };
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(TAG_COLORS[1]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [happyRate, setHappyRate] = useState(() => Math.round((me?.happyDayRate ?? 0.8) * 100));
  const [rateBusy, setRateBusy] = useState(false);

  const addProfile = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const p = await api.profiles.create({ name: name.trim(), avatarColor: color, locale });
      setName('');
      await refreshMe();
      setProfileId(p.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('createFail'));
    } finally {
      setBusy(false);
    }
  };

  const saveHappyRate = async (percent: number) => {
    const next = Math.min(100, Math.max(50, percent)) / 100;
    if (Math.round((me?.happyDayRate ?? 0.8) * 100) === Math.round(next * 100)) return;
    setRateBusy(true);
    setError('');
    try {
      const res = await api.settings.update({ happyDayRate: next });
      setHappyRate(Math.round(res.happyDayRate * 100));
      await refreshMe();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('saveFail'));
    } finally {
      setRateBusy(false);
    }
  };

  const rename = async (id: string, next: string) => {
    const n = prompt(t('newNamePrompt'), next);
    if (!n?.trim()) return;
    await api.profiles.update(id, { name: n.trim() });
    await refreshMe();
  };

  const remove = async (id: string, pname: string) => {
    if (!confirm(t('deleteProfileConfirm', { name: pname }))) return;
    try {
      await api.profiles.remove(id);
      await refreshMe();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('deleteFail'));
    }
  };

  const logout = async () => {
    await api.logout();
    setMe(null);
  };

  return (
    <div>
      <div className="panel">
        <h3>{t('pinLockTitle')}</h3>
        <p style={{ margin: '0 0 12px', color: 'var(--ink-muted)', fontWeight: 700, fontSize: '0.9rem' }}>
          {hasPin
            ? parentUnlocked
              ? t('pinStatusUnlocked', { time: remain(unlockUntil) })
              : t('pinStatusLocked')
            : t('pinStatusUnset')}
        </p>
        <div className="form-inline">
          {!hasPin ? (
            <button type="button" className="btn btn-primary" onClick={() => openPinModal('setup')}>
              {t('setPin')}
            </button>
          ) : (
            <>
              {parentUnlocked ? (
                <button type="button" className="btn btn-ghost" onClick={() => lockParent()}>
                  {t('lockNow')}
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => openPinModal('unlock')}>
                  {t('unlock')}
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={() => openPinModal('change')}>
                {t('changePin')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="panel">
        <h3>{t('familyAccount')}</h3>
        <p style={{ margin: '0 0 8px', color: 'var(--ink-muted)', fontWeight: 700 }}>
          {me?.familyName} · {me?.user.email}
        </p>
        <button type="button" className="btn btn-ghost" onClick={logout}>
          {t('logout')}
        </button>
      </div>

      {error ? <div className="error-banner">{tr(error)}</div> : null}

      <div className="panel">
        <h3>{t('questCalendar')}</h3>
        <p style={{ margin: '0 0 10px', color: 'var(--ink-muted)', fontWeight: 700, fontSize: '0.9rem' }}>
          {t('happyRate', { happy: happyRate, danger: 100 - happyRate })}
          <br />
          {t('happyRateHint')}
        </p>
        <input
          type="range"
          min={50}
          max={100}
          step={5}
          value={happyRate}
          aria-label={t('happyRateAria')}
          onChange={(e) => setHappyRate(Number(e.target.value))}
          onPointerUp={(e) => {
            void saveHappyRate(Number((e.currentTarget as HTMLInputElement).value));
          }}
          onKeyUp={(e) => {
            void saveHappyRate(Number((e.currentTarget as HTMLInputElement).value));
          }}
          style={{ width: '100%' }}
        />
        {rateBusy ? (
          <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--ink-muted)' }}>{t('saving')}</p>
        ) : null}
      </div>

      <div className="panel">
        <h3>{t('profiles')}</h3>
        <div className="manage-list">
          {profiles.map((p) => (
            <div key={p.id} className="manage-item">
              <span className="tag-swatch" style={{ background: p.avatarColor }} />
              <div className="info">
                <div className="title">
                  {p.name}
                  {p.id === profileId ? t('current') : ''}
                </div>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setProfileId(p.id)}>
                {t('switchProfile')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => rename(p.id, p.name)}>
                {t('rename')}
              </button>
              <button type="button" className="btn btn-danger" onClick={() => remove(p.id, p.name)}>
                {t('delete')}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>{t('addChild')}</h3>
        <div className="form-row">
          <label>{t('nameLabel')}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('childNamePh')} />
        </div>
        <div className="form-row">
          <label>{t('colorLabel')}</label>
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
          {t('addBtn')}
        </button>
      </div>
    </div>
  );
}

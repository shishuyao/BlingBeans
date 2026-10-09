import { useEffect, useState } from 'react';
import { api } from '../api';
import { useApp } from '../appContext';
import { LanguageSwitch, useI18n } from '../i18n';

export function AuthPage() {
  const { refreshMe, setProfileId } = useApp();
  const { t, tr, locale } = useI18n();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [profileName, setProfileName] = useState(locale === 'en' ? 'Kid' : '果果');
  const [error, setError] = useState('');
  useEffect(() => {
    setProfileName((prev) => {
      if (locale === 'en' && prev === '果果') return 'Kid';
      if (locale === 'zh' && prev === 'Kid') return '果果';
      return prev;
    });
  }, [locale]);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'register') {
        const res = await api.register({
          email,
          password,
          name: name || t('parentFallback'),
          familyName: familyName || undefined,
          profileName: profileName || t('kidFallback'),
          locale,
        });
        localStorage.setItem('guoguo_profileId', res.profile.id);
        setProfileId(res.profile.id);
      } else {
        await api.login({ email, password });
      }
      await refreshMe();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('actionFail'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-lang">
          <LanguageSwitch />
        </div>
        <h1>{t('brand')}</h1>
        <p className="subtitle">{t('subtitle')}</p>
        {error ? <div className="error-banner">{tr(error)}</div> : null}

        {mode === 'register' ? (
          <>
            <div className="form-row">
              <label>{t('parentNickname')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-row">
              <label>{t('familyName')}</label>
              <input value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder={t('optional')} />
            </div>
            <div className="form-row">
              <label>{t('firstChild')}</label>
              <input value={profileName} onChange={(e) => setProfileName(e.target.value)} required />
            </div>
          </>
        ) : null}

        <div className="form-row">
          <label>{t('email')}</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-row">
          <label>{t('password')}</label>
          <input
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
          {mode === 'login' ? t('login') : t('registerFamily')}
        </button>

        <div className="auth-toggle">
          {mode === 'login' ? (
            <>
              {t('noAccount')}
              <button type="button" onClick={() => setMode('register')}>
                {t('register')}
              </button>
            </>
          ) : (
            <>
              {t('hasAccount')}
              <button type="button" onClick={() => setMode('login')}>
                {t('login')}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

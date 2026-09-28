import { useState } from 'react';
import { api } from '../api';
import { useApp } from '../appContext';

export function AuthPage() {
  const { refreshMe, setProfileId } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [profileName, setProfileName] = useState('果果');
  const [error, setError] = useState('');
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
          name: name || '家长',
          familyName: familyName || undefined,
          profileName: profileName || '孩子',
        });
        localStorage.setItem('guoguo_profileId', res.profile.id);
        setProfileId(res.profile.id);
      } else {
        await api.login({ email, password });
      }
      await refreshMe();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>果果豆豆</h1>
        <p className="subtitle">行为打卡 · 豆豆奖励</p>
        {error ? <div className="error-banner">{error}</div> : null}

        {mode === 'register' ? (
          <>
            <div className="form-row">
              <label>家长昵称</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-row">
              <label>家庭名称</label>
              <input value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="可选" />
            </div>
            <div className="form-row">
              <label>第一个孩子名字</label>
              <input value={profileName} onChange={(e) => setProfileName(e.target.value)} required />
            </div>
          </>
        ) : null}

        <div className="form-row">
          <label>邮箱</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-row">
          <label>密码</label>
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
          {mode === 'login' ? '登录' : '注册家庭'}
        </button>

        <div className="auth-toggle">
          {mode === 'login' ? (
            <>
              还没有账号？
              <button type="button" onClick={() => setMode('register')}>
                注册
              </button>
            </>
          ) : (
            <>
              已有账号？
              <button type="button" onClick={() => setMode('login')}>
                登录
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BeanBalanceDto, MergeEvent, ProfileDto } from '@guoguo/shared';
import { api, type MeResponse } from './api';
import {
  AppContext,
  type AppView,
  currentMonth,
  todayStr,
} from './appContext';
import { AuthPage } from './components/AuthPage';
import { BeanProgressBar } from './components/BeanProgressBar';
import { BottomNav } from './components/BottomNav';
import { CalendarView } from './components/CalendarView';
import { MergeCelebration } from './components/MergeCelebration';
import { RewardsPanel } from './components/RewardsPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { SummaryPanel } from './components/SummaryPanel';
import { TagsPanel } from './components/TagsPanel';

const PROFILE_KEY = 'guoguo_profileId';

export function App() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [booting, setBooting] = useState(true);
  const [profiles, setProfiles] = useState<ProfileDto[]>([]);
  const [profileId, setProfileIdState] = useState<string | null>(
    () => localStorage.getItem(PROFILE_KEY)
  );
  const [beans, setBeans] = useState<BeanBalanceDto | null>(null);
  const [view, setView] = useState<AppView>('calendar');
  const [month, setMonth] = useState(currentMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [mergeQueue, setMergeQueue] = useState<MergeEvent[]>([]);

  const setProfileId = useCallback((id: string) => {
    localStorage.setItem(PROFILE_KEY, id);
    setProfileIdState(id);
  }, []);

  const refreshMe = useCallback(async () => {
    const data = await api.me();
    setMe(data);
    setProfiles(data.profiles);
    const saved = localStorage.getItem(PROFILE_KEY);
    const valid = data.profiles.find((p) => p.id === saved) ?? data.profiles[0];
    if (valid) setProfileId(valid.id);
  }, [setProfileId]);

  const refreshBeans = useCallback(async () => {
    if (!profileId) {
      setBeans(null);
      return;
    }
    const b = await api.beans.get(profileId);
    setBeans(b);
  }, [profileId]);

  useEffect(() => {
    api
      .me()
      .then((data) => {
        setMe(data);
        setProfiles(data.profiles);
        const saved = localStorage.getItem(PROFILE_KEY);
        const valid = data.profiles.find((p) => p.id === saved) ?? data.profiles[0];
        if (valid) setProfileId(valid.id);
      })
      .catch(() => setMe(null))
      .finally(() => setBooting(false));
  }, [setProfileId]);

  useEffect(() => {
    if (!profileId || !me) return;
    refreshBeans().catch(() => setBeans(null));
  }, [profileId, me, refreshBeans]);

  const enqueueMerges = useCallback((events: MergeEvent[]) => {
    if (!events.length) return;
    setMergeQueue((q) => [...q, ...events]);
  }, []);

  const shiftMerge = useCallback(() => {
    setMergeQueue((q) => q.slice(1));
  }, []);

  const ctx = useMemo(
    () => ({
      me,
      profileId,
      profiles,
      beans,
      view,
      month,
      selectedDate,
      mergeQueue,
      setMe,
      setProfileId,
      setProfiles,
      setBeans,
      setView,
      setMonth,
      setSelectedDate,
      enqueueMerges,
      shiftMerge,
      refreshBeans,
      refreshMe,
    }),
    [
      me,
      profileId,
      profiles,
      beans,
      view,
      month,
      selectedDate,
      mergeQueue,
      setProfileId,
      enqueueMerges,
      shiftMerge,
      refreshBeans,
      refreshMe,
    ]
  );

  if (booting) {
    return (
      <div className="auth-page">
        <p className="empty-hint">加载中…</p>
      </div>
    );
  }

  return (
    <AppContext.Provider value={ctx}>
      {!me ? (
        <AuthPage />
      ) : (
        <div className="app-shell">
          <header className="top-bar">
            <div className="brand-row">
              <div className="brand">果果豆豆</div>
              <div className="profile-switch">
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`profile-chip${p.id === profileId ? ' active' : ''}`}
                    style={p.id === profileId ? { borderColor: p.avatarColor } : undefined}
                    onClick={() => setProfileId(p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <BeanProgressBar />
          </header>

          <main>
            {view === 'calendar' ? <CalendarView /> : null}
            {view === 'tags' ? <TagsPanel /> : null}
            {view === 'rewards' ? <RewardsPanel /> : null}
            {view === 'summary' ? <SummaryPanel /> : null}
            {view === 'settings' ? <SettingsPanel /> : null}
          </main>

          <BottomNav />
          <MergeCelebration />
        </div>
      )}
    </AppContext.Provider>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BeanBalanceDto, MergeEvent, ProfileDto } from '@guoguo/shared';
import { api, type MeResponse, type PinStatus } from './api';
import {
  AppContext,
  type AppView,
  type PinModalMode,
  currentMonth,
  remainingUnlockLabel,
  todayStr,
} from './appContext';
import { AuthPage } from './components/AuthPage';
import { BeanProgressBar } from './components/BeanProgressBar';
import { BottomNav } from './components/BottomNav';
import { CalendarView } from './components/CalendarView';
import { MergeCelebration } from './components/MergeCelebration';
import { PinGate } from './components/PinGate';
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
  const [view, setViewState] = useState<AppView>('calendar');
  const [month, setMonth] = useState(currentMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [mergeQueue, setMergeQueue] = useState<MergeEvent[]>([]);
  const [hasPin, setHasPin] = useState(false);
  const [parentUnlocked, setParentUnlocked] = useState(true);
  const [unlockUntil, setUnlockUntil] = useState<string | null>(null);
  const [pinModal, setPinModal] = useState<PinModalMode | null>(null);
  const [nowTick, setNowTick] = useState(0);
  const [headerCompact, setHeaderCompact] = useState(false);
  const pinResolver = useRef<((ok: boolean) => void) | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);

  const applyPinStatus = useCallback((pin?: PinStatus) => {
    if (!pin) {
      setHasPin(false);
      setParentUnlocked(true);
      setUnlockUntil(null);
      return;
    }
    setHasPin(pin.hasPin);
    setParentUnlocked(pin.unlocked);
    setUnlockUntil(pin.expiresAt);
  }, []);

  const setProfileId = useCallback((id: string) => {
    localStorage.setItem(PROFILE_KEY, id);
    setProfileIdState(id);
  }, []);

  const refreshMe = useCallback(async () => {
    const data = await api.me();
    setMe(data);
    setProfiles(data.profiles);
    applyPinStatus(data.pin);
    const saved = localStorage.getItem(PROFILE_KEY);
    const valid = data.profiles.find((p) => p.id === saved) ?? data.profiles[0];
    if (valid) setProfileId(valid.id);
  }, [setProfileId, applyPinStatus]);

  const refreshPinStatus = useCallback(async () => {
    const status = await api.pin.status();
    applyPinStatus(status);
  }, [applyPinStatus]);

  const refreshBeans = useCallback(async () => {
    if (!profileId) {
      setBeans(null);
      return;
    }
    const b = await api.beans.get(profileId);
    setBeans(b);
  }, [profileId]);

  const closePinModal = useCallback((ok = false) => {
    setPinModal(null);
    const resolve = pinResolver.current;
    pinResolver.current = null;
    resolve?.(ok);
  }, []);

  const openPinModal = useCallback((mode: PinModalMode) => {
    setPinModal(mode);
  }, []);

  const ensureParent = useCallback(async () => {
    try {
      const status = await api.pin.status();
      applyPinStatus(status);
      if (status.hasPin && status.unlocked) return true;

      const mode: PinModalMode = status.hasPin ? 'unlock' : 'setup';
      return await new Promise<boolean>((resolve) => {
        pinResolver.current = async (ok) => {
          if (ok) {
            try {
              await api.pin.status().then(applyPinStatus);
            } catch {
              applyPinStatus({ hasPin: true, unlocked: true, expiresAt: null });
            }
          }
          resolve(ok);
        };
        setPinModal(mode);
      });
    } catch {
      return false;
    }
  }, [applyPinStatus]);

  const lockParent = useCallback(async () => {
    setParentUnlocked(false);
    setUnlockUntil(null);
    if (view === 'tags' || view === 'rewards' || view === 'settings') {
      setViewState('calendar');
    }
    try {
      await api.pin.lock();
    } catch {
      /* keep locked locally even if the request fails */
    }
  }, [view]);

  const setView = useCallback(
    async (next: AppView) => {
      const needsParent = next === 'tags' || next === 'rewards' || next === 'settings';
      if (needsParent) {
        const ok = await ensureParent();
        if (!ok) return;
      }
      setViewState(next);
    },
    [ensureParent]
  );

  useEffect(() => {
    api
      .me()
      .then((data) => {
        setMe(data);
        setProfiles(data.profiles);
        applyPinStatus(data.pin);
        const saved = localStorage.getItem(PROFILE_KEY);
        const valid = data.profiles.find((p) => p.id === saved) ?? data.profiles[0];
        if (valid) setProfileId(valid.id);
      })
      .catch(() => setMe(null))
      .finally(() => setBooting(false));
  }, [setProfileId, applyPinStatus]);

  useEffect(() => {
    if (!profileId || !me) return;
    refreshBeans().catch(() => setBeans(null));
  }, [profileId, me, refreshBeans]);

  // Auto-lock when unlock expires
  useEffect(() => {
    if (!hasPin || !parentUnlocked || !unlockUntil) return;
    const ms = new Date(unlockUntil).getTime() - Date.now();
    if (ms <= 0) {
      setParentUnlocked(false);
      setUnlockUntil(null);
      return;
    }
    const t = setTimeout(() => {
      setParentUnlocked(false);
      setUnlockUntil(null);
      setViewState((v) => (v === 'tags' || v === 'rewards' || v === 'settings' ? 'calendar' : v));
    }, ms + 200);
    const tick = setInterval(() => setNowTick((n) => n + 1), 30000);
    return () => {
      clearTimeout(t);
      clearInterval(tick);
    };
  }, [hasPin, parentUnlocked, unlockUntil]);

  useEffect(() => {
    setHeaderCompact(false);
    lastScrollY.current = 0;
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [view, profileId]);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => {
      const y = el.scrollTop;
      if (y < 12) {
        setHeaderCompact(false);
        lastScrollY.current = y;
        return;
      }
      const dy = y - lastScrollY.current;
      if (dy > 8) setHeaderCompact(true);
      else if (dy < -8) setHeaderCompact(false);
      lastScrollY.current = y;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [me]);

  const enqueueMerges = useCallback((events: MergeEvent[]) => {
    if (!events.length) return;
    setMergeQueue((q) => [...q, ...events]);
  }, []);

  const shiftMerge = useCallback(() => {
    setMergeQueue((q) => q.slice(1));
  }, []);

  const onPinDone = useCallback(
    async (ok: boolean) => {
      if (ok) {
        try {
          await refreshPinStatus();
        } catch {
          /* ignore */
        }
      }
      closePinModal(ok);
    },
    [closePinModal, refreshPinStatus]
  );

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
      hasPin,
      parentUnlocked,
      unlockUntil,
      pinModal,
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
      refreshPinStatus,
      ensureParent,
      lockParent,
      openPinModal,
      closePinModal,
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
      hasPin,
      parentUnlocked,
      unlockUntil,
      pinModal,
      setProfileId,
      setView,
      enqueueMerges,
      shiftMerge,
      refreshBeans,
      refreshMe,
      refreshPinStatus,
      ensureParent,
      lockParent,
      openPinModal,
      closePinModal,
      nowTick,
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
          <header className={`top-bar${headerCompact ? ' compact' : ''}`}>
            <div className="top-chrome">
              <div className="brand-row">
                <div className="brand">果果豆豆</div>
                <div className="brand-actions">
                  <button
                    type="button"
                    className={`lock-btn${parentUnlocked && hasPin ? ' unlocked' : ''}`}
                    aria-label={
                      !hasPin
                        ? '设置家长 PIN'
                        : parentUnlocked
                          ? '锁定家长 PIN'
                          : '解锁家长 PIN'
                    }
                    title={
                      !hasPin
                        ? '未设置家长 PIN'
                        : parentUnlocked
                          ? `已解锁 · 点击锁定 · 剩余 ${remainingUnlockLabel(unlockUntil)}`
                          : '已锁定 · 点击解锁'
                    }
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!hasPin) {
                        openPinModal('setup');
                        return;
                      }
                      if (parentUnlocked) {
                        await lockParent();
                      } else {
                        openPinModal('unlock');
                      }
                    }}
                  >
                    {!hasPin ? '🔑' : parentUnlocked ? '🔓' : '🔒'}
                  </button>
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
              </div>
            </div>
            <BeanProgressBar />
            <div className="top-chrome">
              {beans?.dangerLocked ? (
                <div className="danger-mode-banner">危险模式 · 先打卡攒够豆（当天超过 5 颗即可解锁兑奖）</div>
              ) : null}
              {hasPin && !parentUnlocked ? (
                <div className="kid-mode-banner">孩子模式 · 打卡/兑奖需家长解锁</div>
              ) : null}
              {hasPin && parentUnlocked ? (
                <div className="parent-mode-banner">
                  家长已解锁 · 约 {remainingUnlockLabel(unlockUntil)}后自动锁定
                </div>
              ) : null}
            </div>
          </header>

          <main ref={mainRef}>
            {view === 'calendar' ? <CalendarView /> : null}
            {view === 'tags' ? <TagsPanel /> : null}
            {view === 'rewards' ? <RewardsPanel /> : null}
            {view === 'summary' ? <SummaryPanel /> : null}
            {view === 'settings' ? <SettingsPanel /> : null}
          </main>

          <BottomNav />
          <MergeCelebration />
          {pinModal ? <PinGate mode={pinModal} onDone={onPinDone} /> : null}
        </div>
      )}
    </AppContext.Provider>
  );
}

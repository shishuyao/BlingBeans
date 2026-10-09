import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BeanBalanceDto, MergeEvent, ProfileDto } from '@guoguo/shared';
import { api, type MeResponse, type PinStatus } from './api';
import {
  AppContext,
  type AppView,
  type PinModalMode,
  currentMonth,
  todayStr,
} from './appContext';
import { LanguageSwitch, useI18n } from './i18n';
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
  const { t } = useI18n();
  const pinResolver = useRef<((ok: boolean) => void) | null>(null);

  const remain = (until: string | null) => {
    if (!until) return '';
    const ms = new Date(until).getTime() - Date.now();
    if (ms <= 0) return t('unlockExpired');
    return t('minutes', { m: Math.ceil(ms / 60000) });
  };
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

  // Nested overflow-x regions (timeline, calendar, bean track) otherwise trap
  // vertical pans on tablets — only a gap between cards would scroll the page.
  useEffect(() => {
    const scroller = mainRef.current;
    if (!scroller) return;
    const nestedSel = '.tl-scroller, .cal-board, .small-track, .profile-switch';
    let startX = 0;
    let startY = 0;
    let startScroll = 0;
    let axis: 'x' | 'y' | null = null;
    let nested = false;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startScroll = scroller.scrollTop;
      axis = null;
      nested = Boolean((e.target as Element | null)?.closest?.(nestedSel));
    };

    const onMove = (e: TouchEvent) => {
      if (!nested || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (axis == null) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        axis = Math.abs(dy) >= Math.abs(dx) ? 'y' : 'x';
      }
      if (axis !== 'y') return;
      scroller.scrollTop = startScroll - dy;
      if (e.cancelable) e.preventDefault();
    };

    document.addEventListener('touchstart', onStart, { passive: true, capture: true });
    document.addEventListener('touchmove', onMove, { passive: false, capture: true });
    return () => {
      document.removeEventListener('touchstart', onStart, true);
      document.removeEventListener('touchmove', onMove, true);
    };
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
        <p className="empty-hint">{t('loading')}</p>
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
                <div className="brand">{t('brand')}</div>
                <div className="brand-actions">
                  <LanguageSwitch />
                  <button
                    type="button"
                    className={`lock-btn${parentUnlocked && hasPin ? ' unlocked' : ''}`}
                    aria-label={
                      !hasPin ? t('pinSetupAria') : parentUnlocked ? t('pinLockAria') : t('pinUnlockAria')
                    }
                    title={
                      !hasPin
                        ? t('pinUnsetTitle')
                        : parentUnlocked
                          ? t('pinUnlockedTitle', { time: remain(unlockUntil) })
                          : t('pinLockedTitle')
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
              {beans?.debtLocked ? (
                <div className="danger-mode-banner">{t('debtBanner')}</div>
              ) : beans?.dangerLocked ? (
                <div className="danger-mode-banner">{t('dangerBanner')}</div>
              ) : null}
              {hasPin && !parentUnlocked ? (
                <div className="kid-mode-banner">{t('kidBanner')}</div>
              ) : null}
              {hasPin && parentUnlocked ? (
                <div className="parent-mode-banner">{t('parentBanner', { time: remain(unlockUntil) })}</div>
              ) : null}
            </div>
          </header>

          <main ref={mainRef}>
            <div className="page-body">
              {view === 'calendar' ? <CalendarView /> : null}
              {view === 'tags' ? <TagsPanel /> : null}
              {view === 'rewards' ? <RewardsPanel /> : null}
              {view === 'summary' ? <SummaryPanel /> : null}
              {view === 'settings' ? <SettingsPanel /> : null}
            </div>
          </main>

          <BottomNav />
          <MergeCelebration />
          {pinModal ? <PinGate mode={pinModal} onDone={onPinDone} /> : null}
        </div>
      )}
    </AppContext.Provider>
  );
}

import { createContext, useContext } from 'react';
import type { BeanBalanceDto, MergeEvent, ProfileDto } from '@guoguo/shared';
import type { MeResponse } from './api';

export type AppView = 'calendar' | 'tags' | 'rewards' | 'summary' | 'settings';

export type PinModalMode = 'setup' | 'unlock' | 'change';

export type AppState = {
  me: MeResponse | null;
  profileId: string | null;
  profiles: ProfileDto[];
  beans: BeanBalanceDto | null;
  view: AppView;
  month: string;
  selectedDate: string;
  mergeQueue: MergeEvent[];
  hasPin: boolean;
  parentUnlocked: boolean;
  unlockUntil: string | null;
  pinModal: PinModalMode | null;
  setMe: (me: MeResponse | null) => void;
  setProfileId: (id: string) => void;
  setProfiles: (p: ProfileDto[]) => void;
  setBeans: (b: BeanBalanceDto | null) => void;
  setView: (v: AppView) => void | Promise<void>;
  setMonth: (m: string) => void;
  setSelectedDate: (d: string) => void;
  enqueueMerges: (events: MergeEvent[]) => void;
  shiftMerge: () => void;
  refreshBeans: () => Promise<void>;
  refreshMe: () => Promise<void>;
  refreshPinStatus: () => Promise<void>;
  ensureParent: () => Promise<boolean>;
  lockParent: () => Promise<void>;
  openPinModal: (mode: PinModalMode) => void;
  closePinModal: (ok?: boolean) => void;
};

export const AppContext = createContext<AppState | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function todayStr() {
  const d = new Date();
  return formatDate(d);
}

export function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function currentMonth() {
  return todayStr().slice(0, 7);
}

export function monthLabel(month: string) {
  const [y, m] = month.split('-');
  return `${y}年${Number(m)}月`;
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function daysInMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function firstWeekday(month: string) {
  const [y, m] = month.split('-').map(Number);
  const day = new Date(y, m - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export function remainingUnlockLabel(unlockUntil: string | null) {
  if (!unlockUntil) return '';
  const ms = new Date(unlockUntil).getTime() - Date.now();
  if (ms <= 0) return '已过期';
  const m = Math.ceil(ms / 60000);
  return `${m}分钟`;
}

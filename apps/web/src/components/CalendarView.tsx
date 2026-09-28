import { useCallback, useEffect, useState } from 'react';
import type { BehaviorTagDto, CheckInDto } from '@guoguo/shared';
import { ApiError, api } from '../api';
import { useApp } from '../appContext';
import { playCheckInSound } from '../sound';
import { MonthCalendar } from './MonthCalendar';
import { DayCheckInSheet } from './DayCheckInSheet';

export function CalendarView() {
  const { profileId, month, setBeans, enqueueMerges, hasPin, parentUnlocked, ensureParent } = useApp();
  const [checkIns, setCheckIns] = useState<CheckInDto[]>([]);
  const [tags, setTags] = useState<BehaviorTagDto[]>([]);
  const [sheetDate, setSheetDate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const locked = hasPin && !parentUnlocked;

  const reload = useCallback(async () => {
    if (!profileId) return;
    const [c, t] = await Promise.all([
      api.checkIns.list(profileId, month),
      api.tags.list(profileId),
    ]);
    setCheckIns(c);
    setTags(t);
  }, [profileId, month]);

  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, [reload]);

  const onAdd = async (tagId: string) => {
    if (!profileId || !sheetDate) return;
    const ok = await ensureParent();
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.checkIns.add({ profileId, tagId, date: sheetDate });
      setBeans(res.beans);
      if (res.mergeEvents.length) enqueueMerges(res.mergeEvents);
      else playCheckInSound();
      await reload();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'PARENT_LOCK') {
        const unlocked = await ensureParent();
        if (unlocked) return onAdd(tagId);
      }
      setError(e instanceof Error ? e.message : '打卡失败');
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async (tagId: string) => {
    if (!profileId || !sheetDate) return;
    const ok = await ensureParent();
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.checkIns.decrement({ profileId, tagId, date: sheetDate });
      setBeans(res.beans);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : '撤销失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {error ? <div className="error-banner">{error}</div> : null}
      <MonthCalendar checkIns={checkIns} onSelectDay={setSheetDate} />
      {sheetDate ? (
        <DayCheckInSheet
          date={sheetDate}
          tags={tags}
          checkIns={checkIns}
          onClose={() => setSheetDate(null)}
          onAdd={onAdd}
          onRemove={onRemove}
          locked={locked}
          onUnlock={async () => {
            await ensureParent();
          }}
          busy={busy}
        />
      ) : null}
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import type { BehaviorTagDto, CheckInDto, DayQuestDto, MergeEvent, RevealEvent } from '@guoguo/shared';
import { ApiError, api } from '../api';
import { todayStr, useApp } from '../appContext';
import { playCheckInSound, playUndoSound } from '../sound';
import { MonthCalendar } from './MonthCalendar';
import { DayCheckInSheet } from './DayCheckInSheet';
import { MysteryReveal } from './MysteryReveal';

export function CalendarView() {
  const { profileId, month, setBeans, enqueueMerges, hasPin, parentUnlocked, ensureParent, refreshBeans } = useApp();
  const [checkIns, setCheckIns] = useState<CheckInDto[]>([]);
  const [tags, setTags] = useState<BehaviorTagDto[]>([]);
  const [quests, setQuests] = useState<DayQuestDto[]>([]);
  const [sheetDate, setSheetDate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [reveal, setReveal] = useState<RevealEvent | null>(null);
  const [pendingMerges, setPendingMerges] = useState<MergeEvent[]>([]);

  const locked = hasPin && !parentUnlocked;
  const today = todayStr();

  const reload = useCallback(async () => {
    if (!profileId) return;
    const [c, t, q] = await Promise.all([
      api.checkIns.list(profileId, month),
      api.tags.list(profileId),
      api.quests.month(profileId, month),
    ]);
    setCheckIns(c);
    setTags(t);
    setQuests(q.quests);
    await refreshBeans();
  }, [profileId, month, refreshBeans]);

  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, [reload]);

  useEffect(() => {
    if (!hint) return;
    const t = window.setTimeout(() => setHint(''), 2200);
    return () => window.clearTimeout(t);
  }, [hint]);

  const onSelectDay = (date: string) => {
    setError('');
    if (date > today) {
      setHint('这一天还没到，先保持神秘哦');
      return;
    }
    setSheetDate(date);
  };

  const onAdd = async (tagId: string) => {
    if (!profileId || !sheetDate) return;
    const ok = await ensureParent();
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.checkIns.add({ profileId, tagId, date: sheetDate });
      setBeans(res.beans);
      if (res.reveal) {
        setPendingMerges(res.mergeEvents);
        setReveal(res.reveal);
      } else if (res.mergeEvents.length) {
        enqueueMerges(res.mergeEvents);
      } else {
        playCheckInSound();
      }
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
      playUndoSound();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : '撤销失败');
    } finally {
      setBusy(false);
    }
  };

  const sheetQuest = sheetDate ? quests.find((q) => q.date === sheetDate) : undefined;

  return (
    <div>
      {error ? <div className="error-banner">{error}</div> : null}
      {hint ? <div className="hint-banner">{hint}</div> : null}
      <MonthCalendar quests={quests} onSelectDay={onSelectDay} />
      {sheetDate ? (
        <DayCheckInSheet
          date={sheetDate}
          tags={tags}
          checkIns={checkIns}
          quest={sheetQuest}
          readOnly={sheetDate < today}
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
      {reveal ? (
        <MysteryReveal
          event={reveal}
          onDone={() => {
            setReveal(null);
            if (pendingMerges.length) {
              enqueueMerges(pendingMerges);
              setPendingMerges([]);
            }
          }}
        />
      ) : null}
    </div>
  );
}

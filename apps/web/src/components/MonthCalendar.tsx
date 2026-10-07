import type { DayQuestDto } from '@guoguo/shared';
import {
  daysInMonth,
  firstWeekday,
  monthLabel,
  shiftMonth,
  todayStr,
  useApp,
} from '../appContext';

function DangerBomb({ uid }: { uid: string }) {
  return (
    <span className="day-bomb" aria-hidden>
      <svg viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="18.6" r="8.2" fill={`url(#${uid})`} />
        <ellipse cx="13.2" cy="16.2" rx="3.1" ry="2.2" fill="rgba(255,255,255,0.22)" />
        <path
          d="M13.4 11.2 L15.4 8 Q16.4 6.4 18.6 7.2 L21 5.3"
          stroke="#6d4c41"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <rect x="13.2" y="10.2" width="5.4" height="2.5" rx="0.7" fill="#6d4c41" />
        <circle cx="21.6" cy="4.4" r="2.2" fill="#FFB300" />
        <circle cx="22.3" cy="3.9" r="0.9" fill="#FFF59D" />
        <defs>
          <radialGradient id={uid} cx="38%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#5c5555" />
            <stop offset="55%" stopColor="#3a3232" />
            <stop offset="100%" stopColor="#261e1e" />
          </radialGradient>
        </defs>
      </svg>
    </span>
  );
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

type Props = {
  quests: DayQuestDto[];
  onSelectDay: (date: string) => void;
};

function footer(opts: { mystery: boolean; isFuture: boolean; quest?: DayQuestDto }) {
  if (opts.isFuture) return '还没到';
  if (opts.mystery && ((opts.quest?.missedDeducted ?? 0) > 0 || opts.quest?.missedFrozen)) return '未打卡';
  if (opts.mystery) return '待开';
  const q = opts.quest;
  if (!q) return '';
  if (q.kind === 'happy') {
    if (q.beansEarned !== 0) return `${q.beansEarned}豆`;
    return '';
  }
  return `${q.beansAdded}/${q.dangerNeed}豆`;
}

export function MonthCalendar({ quests, onSelectDay }: Props) {
  const { month, setMonth, selectedDate, setSelectedDate } = useApp();
  const today = todayStr();
  const total = daysInMonth(month);
  const offset = firstWeekday(month);
  const cells: Array<number | null> = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const questByDate = new Map(quests.map((q) => [q.date, q]));

  return (
    <div>
      <div className="month-nav">
        <button
          className="icon-btn"
          type="button"
          aria-label="上个月"
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          ‹
        </button>
        <h2>{monthLabel(month)}</h2>
        <button
          className="icon-btn"
          type="button"
          aria-label="下个月"
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          ›
        </button>
      </div>
      <div className="cal-board">
      <div className="weekday-row">
        {WEEKDAYS.map((w) => (
          <div key={w} className="weekday">
            {w}
          </div>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} className="day-cell empty" />;
          const date = `${month}-${String(day).padStart(2, '0')}`;
          const quest = questByDate.get(date);
          const isToday = date === today;
          const isFuture = date > today;
          const revealed = Boolean(quest?.revealed);
          const mystery = isFuture || !revealed;
          const missed = !isFuture && ((quest?.missedDeducted ?? 0) > 0 || Boolean(quest?.missedFrozen));
          const dangerSafe = Boolean(
            revealed && quest?.kind === 'danger' && quest.beansAdded >= quest.dangerNeed,
          );
          const dangerFailed = Boolean(
            revealed && quest?.kind === 'danger' && quest.settled && quest.beansAdded < quest.dangerNeed,
          );
          const classes = [
            'day-cell',
            isToday ? 'today' : '',
            date === selectedDate ? 'selected' : '',
            mystery ? 'mystery' : '',
            isFuture ? 'future' : '',
            revealed && quest?.kind === 'happy' ? 'quest-happy' : '',
            revealed && quest?.kind === 'danger' ? 'quest-danger' : '',
            dangerFailed ? 'failed' : '',
            dangerSafe ? 'safe' : '',
            missed ? 'missed' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={date}
              type="button"
              className={classes}
              onClick={() => {
                setSelectedDate(date);
                onSelectDay(date);
              }}
            >
              <span className="day-head">
                <span className="day-num">{day}</span>
                {isToday ? <span className="today-mark">今</span> : null}
              </span>
              {revealed && quest?.kind === 'danger' ? <DangerBomb uid={`bomb-${date}`} /> : null}
              <span className="day-art">
                {missed && (quest?.missedDeducted ?? 0) > 0 ? (
                  <span className="day-missed-amt">−{quest?.missedDeducted}</span>
                ) : null}
                {revealed && quest?.kind === 'happy' ? (
                  <span className="day-mult">×{quest.multiplier.toFixed(1)}</span>
                ) : null}
                {revealed && quest?.kind === 'danger' ? (
                  <span className="day-need">
                    <span className="day-need-label">需</span>
                    {quest.dangerNeed}
                  </span>
                ) : null}
              </span>
              <span className={`day-caption${mystery ? '' : quest?.kind === 'danger' ? ' danger' : ' happy'}`}>
                {footer({ mystery, isFuture, quest })}
              </span>
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}

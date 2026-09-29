import type { DayQuestDto } from '@guoguo/shared';
import {
  daysInMonth,
  firstWeekday,
  monthLabel,
  shiftMonth,
  todayStr,
  useApp,
} from '../appContext';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

type Props = {
  quests: DayQuestDto[];
  onSelectDay: (date: string) => void;
};

function footer(opts: { mystery: boolean; isFuture: boolean; quest?: DayQuestDto }) {
  if (opts.isFuture) return '还没到';
  if (opts.mystery) return '待开';
  const q = opts.quest;
  if (!q) return '';
  if (q.kind === 'happy') {
    return q.beansEarned > 0 ? `${q.beansEarned}豆` : '';
  }
  if (q.settled) {
    return q.beansEarned >= q.dangerNeed ? `过关 ${q.beansEarned}豆` : `−${q.dangerNeed}`;
  }
  return `需满${q.dangerNeed}`;
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
          const classes = [
            'day-cell',
            isToday ? 'today' : '',
            date === selectedDate ? 'selected' : '',
            mystery ? 'mystery' : '',
            isFuture ? 'future' : '',
            revealed && quest?.kind === 'happy' ? 'quest-happy' : '',
            revealed && quest?.kind === 'danger' ? 'quest-danger' : '',
            revealed && quest?.kind === 'danger' && quest.settled && quest.beansEarned < quest.dangerNeed
              ? 'failed'
              : '',
            revealed && quest?.kind === 'danger' && quest.settled && quest.beansEarned >= quest.dangerNeed
              ? 'passed'
              : '',
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
              <span className="day-art">
                {revealed && quest?.kind === 'happy' ? (
                  <span className="day-mult">×{quest.multiplier.toFixed(1)}</span>
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
  );
}

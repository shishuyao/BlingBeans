import type { CheckInDto } from '@guoguo/shared';
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
  checkIns: CheckInDto[];
  onSelectDay: (date: string) => void;
};

export function MonthCalendar({ checkIns, onSelectDay }: Props) {
  const { month, setMonth, selectedDate, setSelectedDate } = useApp();
  const today = todayStr();
  const total = daysInMonth(month);
  const offset = firstWeekday(month);
  const cells: Array<number | null> = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const byDate = new Map<string, CheckInDto[]>();
  for (const c of checkIns) {
    const list = byDate.get(c.date) ?? [];
    list.push(c);
    byDate.set(c.date, list);
  }

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
          const items = byDate.get(date) ?? [];
          return (
            <button
              key={date}
              type="button"
              className={`day-cell${date === today ? ' today' : ''}${date === selectedDate ? ' selected' : ''}`}
              onClick={() => {
                setSelectedDate(date);
                onSelectDay(date);
              }}
            >
              <span className="day-num">{day}</span>
              <div className="day-dots">
                {(() => {
                  const MAX = 5;
                  const visible = items.length <= MAX ? items : items.slice(0, MAX - 1);
                  const overflow = items.length <= MAX ? [] : items.slice(MAX - 1);
                  return (
                    <>
                      {visible.map((c) => (
                        <span
                          key={c.id}
                          className="day-chip"
                          style={{ ['--chip' as string]: c.tag?.color ?? '#888' }}
                          title={`${c.tag?.name ?? ''}${c.count > 1 ? ` ×${c.count}` : ''}`}
                        >
                          <span className="day-chip-dot" />
                          {c.count > 1 ? <span className="day-chip-count">×{c.count}</span> : null}
                        </span>
                      ))}
                      {overflow.length > 0 ? (
                        <span
                          className="day-chip-more"
                          title={overflow
                            .map((c) => `${c.tag?.name ?? ''}×${c.count}`)
                            .join('、')}
                        >
                          <span className="day-more-dots">
                            {overflow.slice(0, 4).map((c) => (
                              <i
                                key={c.id}
                                style={{ background: c.tag?.color ?? '#888' }}
                              />
                            ))}
                          </span>
                          <span>+{overflow.length}</span>
                        </span>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

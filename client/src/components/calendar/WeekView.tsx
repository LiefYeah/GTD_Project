import { useRef, useEffect } from 'react';
import {
  startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, format, getHours, getMinutes,
} from 'date-fns';
import { DAY_NAMES, HOUR_HEIGHT, HOURS } from '../../lib/calendar';
import type { Task, Pomodoro, Project } from '../../types';

function toTopPx(ts: number): number {
  const d = new Date(ts);
  return getHours(d) * HOUR_HEIGHT + getMinutes(d);
}

function durationPx(startTs: number, endTs: number): number {
  return Math.max(28, (endTs - startTs) / 60000);
}

interface Props {
  currentDate: Date;
  tasks: Task[];
  pomodoros: Pomodoro[];
  projects: Project[];
  onTaskClick: (task: Task) => void;
}

export function WeekView({ currentDate, tasks, pomodoros, projects, onTaskClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const days = eachDayOfInterval({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  });
  const today = new Date();
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 8 * HOUR_HEIGHT;
  }, []);

  function taskColor(task: Task): string {
    return (task.projectId && projectMap[task.projectId]?.color) ?? 'var(--c-plan)';
  }

  const allDayFor = (day: Date) =>
    tasks.filter(
      (t) =>
        (t.allDay === 1 || (!t.scheduledStart && t.dueDate)) &&
        t.dueDate != null &&
        isSameDay(new Date(t.dueDate), day),
    );

  const timedFor = (day: Date) =>
    tasks.filter(
      (t) => t.scheduledStart && t.allDay !== 1 && isSameDay(new Date(t.scheduledStart), day),
    );

  const pomCountFor = (day: Date) =>
    pomodoros.filter(
      (p) => p.status === 'completed' && isSameDay(new Date(p.startedAt), day),
    ).length;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Day column headers */}
      <div
        className="flex flex-shrink-0"
        style={{
          paddingLeft: '60px',
          borderBottom: '1px solid var(--line-soft)',
          background: 'var(--surface)',
        }}
      >
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          const poms = pomCountFor(day);
          return (
            <div
              key={day.toISOString()}
              className="flex-1 text-center py-2"
              style={{ borderLeft: '1px solid var(--line-soft)' }}
            >
              <div
                className="text-[10px] uppercase tracking-wider"
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: isToday ? 'var(--brand)' : 'var(--ink-mute)',
                  letterSpacing: '0.06em',
                }}
              >
                {DAY_NAMES[day.getDay() === 0 ? 6 : day.getDay() - 1]}
              </div>
              <div
                className="text-base font-semibold mx-auto w-8 h-8 flex items-center justify-center rounded-full"
                style={{
                  fontFamily: 'var(--font-mono)',
                  ...(isToday
                    ? { background: 'var(--brand)', color: '#fff' }
                    : { color: 'var(--ink)' }),
                }}
              >
                {format(day, 'd')}
              </div>
              {poms > 0 && (
                <div
                  className="text-[10px] pb-0.5"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)' }}
                >
                  🍅{poms}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* All-day strip */}
      <div
        className="flex flex-shrink-0 min-h-8"
        style={{
          paddingLeft: '60px',
          borderBottom: '1px solid var(--line-soft)',
          background: 'var(--bg-2)',
        }}
      >
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="flex-1 px-1 py-1"
            style={{ borderLeft: '1px solid var(--line-soft)' }}
          >
            {allDayFor(day).map((t) => {
              const color = taskColor(t);
              return (
                <div
                  key={t.id}
                  onClick={() => onTaskClick(t)}
                  className="text-xs truncate px-1.5 py-0.5 rounded-md cursor-pointer mb-0.5 transition-colors duration-100"
                  style={{
                    background: `color-mix(in oklab, ${color} 12%, var(--surface))`,
                    borderLeft: `3px solid ${color}`,
                    color: 'var(--ink-soft)',
                  }}
                >
                  {t.title}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ background: 'var(--surface)' }}>
        <div className="flex" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          {/* Time gutter */}
          <div className="relative flex-shrink-0" style={{ width: '60px' }}>
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute text-right pr-3"
                style={{
                  top: `${h * HOUR_HEIGHT - 8}px`,
                  width: '56px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--ink-faint)',
                  letterSpacing: '0.02em',
                }}
              >
                {h === 0 ? '' : `${h.toString().padStart(2, '0')}:00`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className="flex-1 relative"
              style={{ borderLeft: '1px solid var(--line-soft)' }}
            >
              {/* Hour lines */}
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute w-full"
                  style={{
                    top: `${h * HOUR_HEIGHT}px`,
                    borderTop: '1px dashed var(--line-soft)',
                  }}
                />
              ))}
              {/* Half-hour lines */}
              {HOURS.map((h) => (
                <div
                  key={`hh-${h}`}
                  className="absolute w-full"
                  style={{
                    top: `${h * HOUR_HEIGHT + 30}px`,
                    borderTop: '1px solid var(--bg-2)',
                  }}
                />
              ))}

              {timedFor(day).map((task) => {
                const top = toTopPx(task.scheduledStart!);
                const height = task.scheduledEnd
                  ? durationPx(task.scheduledStart!, task.scheduledEnd)
                  : 30;
                const color = taskColor(task);
                return (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    style={{
                      position: 'absolute',
                      top: `${top}px`,
                      height: `${height}px`,
                      left: '4px',
                      right: '4px',
                      background: `color-mix(in oklab, ${color} 10%, var(--surface))`,
                      border: `1px solid color-mix(in oklab, ${color} 25%, var(--line))`,
                      borderLeft: `3px solid ${color}`,
                      borderRadius: 8,
                      padding: '4px 8px',
                      cursor: 'pointer',
                      overflow: 'hidden',
                    }}
                    className="transition-all duration-150"
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = `color-mix(in oklab, ${color} 18%, var(--surface))`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = `color-mix(in oklab, ${color} 10%, var(--surface))`;
                    }}
                  >
                    <div
                      className="font-medium truncate leading-tight text-xs"
                      style={{ color: 'var(--ink)' }}
                    >
                      {task.title}
                    </div>
                    {height > 24 && (
                      <div
                        className="text-[10px] mt-0.5"
                        style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)' }}
                      >
                        {format(new Date(task.scheduledStart!), 'HH:mm')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

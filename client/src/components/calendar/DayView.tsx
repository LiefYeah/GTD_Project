import { useRef, useEffect } from 'react';
import { isSameDay, format, getHours, getMinutes } from 'date-fns';
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

export function DayView({ currentDate, tasks, pomodoros, projects, onTaskClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const isToday = isSameDay(currentDate, today);
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 8 * HOUR_HEIGHT;
  }, [currentDate]);

  function taskColor(task: Task): string {
    return (task.projectId && projectMap[task.projectId]?.color) ?? 'var(--c-plan)';
  }

  const timedTasks = tasks.filter(
    (t) => t.scheduledStart && t.allDay !== 1 && isSameDay(new Date(t.scheduledStart), currentDate),
  );
  const allDayTasks = tasks.filter(
    (t) =>
      (t.allDay === 1 || (!t.scheduledStart && t.dueDate)) &&
      t.dueDate != null &&
      isSameDay(new Date(t.dueDate), currentDate),
  );
  const pomCount = pomodoros.filter(
    (p) => p.status === 'completed' && isSameDay(new Date(p.startedAt), currentDate),
  ).length;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Day header */}
      <div
        className="flex-shrink-0 px-5 py-3 flex items-center gap-4"
        style={{
          borderBottom: '1px solid var(--line-soft)',
          background: 'var(--surface)',
        }}
      >
        <div
          className="text-2xl font-bold w-12 h-12 flex items-center justify-center rounded-full flex-shrink-0"
          style={{
            fontFamily: 'var(--font-mono)',
            ...(isToday
              ? { background: 'var(--brand)', color: '#fff' }
              : { background: 'var(--bg-2)', color: 'var(--ink)' }),
          }}
        >
          {format(currentDate, 'd')}
        </div>
        <div>
          <div
            className="font-semibold"
            style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}
          >
            {format(currentDate, 'yyyy年M月')}
          </div>
          <div
            className="text-sm"
            style={{ color: 'var(--ink-mute)', fontFamily: 'var(--font-mono)', fontSize: 12 }}
          >
            星期{DAY_NAMES[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1]}
            {pomCount > 0 && (
              <span style={{ color: 'var(--brand)', marginLeft: 8 }}>🍅 {pomCount} 个番茄</span>
            )}
          </div>
        </div>
      </div>

      {/* All-day strip */}
      {allDayTasks.length > 0 && (
        <div
          className="flex-shrink-0 px-5 py-2 space-y-1"
          style={{
            borderBottom: '1px solid var(--line-soft)',
            background: 'var(--bg-2)',
          }}
        >
          {allDayTasks.map((t) => {
            const color = taskColor(t);
            return (
              <div
                key={t.id}
                onClick={() => onTaskClick(t)}
                className="text-sm truncate px-2.5 py-1 rounded-lg cursor-pointer transition-colors duration-100"
                style={{
                  background: `color-mix(in oklab, ${color} 10%, var(--surface))`,
                  borderLeft: `3px solid ${color}`,
                  color: 'var(--ink-soft)',
                }}
              >
                {t.title}
              </div>
            );
          })}
        </div>
      )}

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

          {/* Single day column */}
          <div
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

            {timedTasks.map((task) => {
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
                    left: '12px',
                    right: '12px',
                    background: `color-mix(in oklab, ${color} 10%, var(--surface))`,
                    border: `1px solid color-mix(in oklab, ${color} 25%, var(--line))`,
                    borderLeft: `3px solid ${color}`,
                    borderRadius: 10,
                    padding: '6px 12px',
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
                    className="font-medium truncate"
                    style={{ color: 'var(--ink)', fontSize: 13 }}
                  >
                    {task.title}
                  </div>
                  {height > 36 && task.scheduledStart && (
                    <div
                      className="mt-0.5"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-mute)' }}
                    >
                      {format(new Date(task.scheduledStart), 'HH:mm')}
                      {task.scheduledEnd
                        ? ` – ${format(new Date(task.scheduledEnd), 'HH:mm')}`
                        : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

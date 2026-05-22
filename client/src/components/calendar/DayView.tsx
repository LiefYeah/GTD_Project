import { useRef, useEffect } from 'react';
import { isSameDay, format, getHours, getMinutes } from 'date-fns';
import { cn } from '../../lib/utils';
import { DAY_NAMES, HOUR_HEIGHT, HOURS } from '../../lib/calendar';
import type { Task, Pomodoro } from '../../types';

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
  onTaskClick: (task: Task) => void;
}

export function DayView({ currentDate, tasks, pomodoros, onTaskClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const isToday = isSameDay(currentDate, today);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 8 * HOUR_HEIGHT;
  }, [currentDate]);

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
      <div className="flex-shrink-0 border-b border-border px-4 py-3 flex items-center gap-3">
        <div
          className={cn(
            'text-2xl font-bold w-12 h-12 flex items-center justify-center rounded-full flex-shrink-0',
            isToday && 'bg-primary text-primary-foreground',
          )}
        >
          {format(currentDate, 'd')}
        </div>
        <div>
          <div className="font-medium">{format(currentDate, 'yyyy年M月')}</div>
          <div className="text-sm text-muted-foreground">
            星期{DAY_NAMES[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1]}
            {pomCount > 0 && ` · 🍅 ${pomCount} 个番茄`}
          </div>
        </div>
      </div>

      {/* All-day strip */}
      {allDayTasks.length > 0 && (
        <div className="flex-shrink-0 border-b border-border px-4 py-1.5 space-y-1">
          {allDayTasks.map((t) => (
            <div
              key={t.id}
              onClick={() => onTaskClick(t)}
              className="text-sm truncate px-2 py-1 rounded bg-muted hover:bg-muted/80 cursor-pointer"
            >
              {t.title}
            </div>
          ))}
        </div>
      )}

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          {/* Time gutter */}
          <div className="relative flex-shrink-0" style={{ width: '60px' }}>
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute text-xs text-muted-foreground text-right pr-2"
                style={{ top: `${h * HOUR_HEIGHT - 8}px`, width: '56px' }}
              >
                {h === 0 ? '' : `${h.toString().padStart(2, '0')}:00`}
              </div>
            ))}
          </div>

          {/* Single day column */}
          <div className="flex-1 relative border-l border-border">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute w-full border-t border-border/30"
                style={{ top: `${h * HOUR_HEIGHT}px` }}
              />
            ))}
            {HOURS.map((h) => (
              <div
                key={`hh-${h}`}
                className="absolute w-full border-t border-border/10"
                style={{ top: `${h * HOUR_HEIGHT + 30}px` }}
              />
            ))}

            {timedTasks.map((task) => {
              const top = toTopPx(task.scheduledStart!);
              const height = task.scheduledEnd
                ? durationPx(task.scheduledStart!, task.scheduledEnd)
                : 30;
              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  style={{
                    position: 'absolute',
                    top: `${top}px`,
                    height: `${height}px`,
                    left: '8px',
                    right: '8px',
                  }}
                  className="bg-primary/15 border-l-2 border-primary rounded px-2 py-1 text-sm cursor-pointer overflow-hidden hover:bg-primary/25 transition-colors"
                >
                  <div className="font-medium truncate">{task.title}</div>
                  {height > 36 && task.scheduledStart && (
                    <div className="text-xs text-muted-foreground">
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

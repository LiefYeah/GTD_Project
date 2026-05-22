import { useRef, useEffect } from 'react';
import {
  startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, format, getHours, getMinutes,
} from 'date-fns';
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

export function WeekView({ currentDate, tasks, pomodoros, onTaskClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const days = eachDayOfInterval({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  });
  const today = new Date();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 8 * HOUR_HEIGHT;
  }, []);

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
      <div className="flex flex-shrink-0 border-b border-border" style={{ paddingLeft: '60px' }}>
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          const poms = pomCountFor(day);
          return (
            <div key={day.toISOString()} className="flex-1 text-center py-1.5 border-l border-border">
              <div className={cn('text-xs', isToday ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                {DAY_NAMES[day.getDay() === 0 ? 6 : day.getDay() - 1]}
              </div>
              <div
                className={cn(
                  'text-base font-semibold mx-auto w-8 h-8 flex items-center justify-center rounded-full',
                  isToday && 'bg-primary text-primary-foreground',
                )}
              >
                {format(day, 'd')}
              </div>
              {poms > 0 && <div className="text-xs text-muted-foreground pb-0.5">🍅{poms}</div>}
            </div>
          );
        })}
      </div>

      {/* All-day strip */}
      <div className="flex flex-shrink-0 border-b border-border min-h-8" style={{ paddingLeft: '60px' }}>
        {days.map((day) => (
          <div key={day.toISOString()} className="flex-1 border-l border-border px-1 py-1">
            {allDayFor(day).map((t) => (
              <div
                key={t.id}
                onClick={() => onTaskClick(t)}
                className="text-xs truncate px-1 py-0.5 rounded bg-muted hover:bg-muted/80 cursor-pointer mb-0.5"
              >
                {t.title}
              </div>
            ))}
          </div>
        ))}
      </div>

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

          {/* Day columns */}
          {days.map((day) => (
            <div key={day.toISOString()} className="flex-1 relative border-l border-border">
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

              {timedFor(day).map((task) => {
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
                      left: '2px',
                      right: '2px',
                    }}
                    className="bg-primary/15 border-l-2 border-primary rounded px-1 py-0.5 text-xs cursor-pointer overflow-hidden hover:bg-primary/25 transition-colors"
                  >
                    <div className="font-medium truncate leading-tight">{task.title}</div>
                    {height > 24 && (
                      <div className="text-muted-foreground text-[10px]">
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

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  startOfWeek, endOfWeek, eachDayOfInterval,
  isSameDay, isToday, format,
  addWeeks, subWeeks, differenceInCalendarDays,
} from 'date-fns';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';
import { cn } from '../../lib/utils';
import type { Task } from '../../types';

// Smaller hour height for the embedded panel
const HOUR_H = 44;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_SHORT = ['一', '二', '三', '四', '五', '六', '日'];
const GUTTER = 36; // px width of the time gutter

function toTopPx(ts: number): number {
  const d = new Date(ts);
  return d.getHours() * HOUR_H + d.getMinutes() * (HOUR_H / 60);
}

function heightPx(startTs: number, endTs: number): number {
  return Math.max(22, (endTs - startTs) / 60000 * (HOUR_H / 60));
}

/** A task spans multiple calendar days */
function isMultiDay(t: Task): boolean {
  if (!t.scheduledStart || !t.scheduledEnd) return false;
  return differenceInCalendarDays(new Date(t.scheduledEnd), new Date(t.scheduledStart)) >= 1;
}

interface Props {
  onTaskClick: (task: Task) => void;
}

export function WeekPanel({ onTaskClick }: Props) {
  const navigate = useNavigate();
  const { tasks, projects } = useBoardStore();
  const [week, setWeek] = useState(() => new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  const weekStart = startOfWeek(week, { weekStartsOn: 1 });
  const weekEnd   = endOfWeek(week,   { weekStartsOn: 1 });
  const days      = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weekStartMs = weekStart.getTime();
  const weekEndMs   = weekEnd.getTime() + 86400000 - 1; // inclusive end of Sunday

  // Scroll to 8 am on mount / week change
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 8 * HOUR_H;
  }, []);

  function taskColor(t: Task): string {
    return (t.projectId && projectMap[t.projectId]?.color) ?? '#6366f1';
  }

  // Multi-day tasks overlapping this week → Gantt strip
  const ganttTasks = tasks.filter(
    (t) =>
      isMultiDay(t) &&
      t.scheduledStart! <= weekEndMs &&
      t.scheduledEnd!   >= weekStartMs,
  );

  // Single-day timed tasks for a given day
  function timedFor(day: Date): Task[] {
    return tasks.filter(
      (t) => t.scheduledStart && !isMultiDay(t) && isSameDay(new Date(t.scheduledStart), day),
    );
  }

  // Gantt bar position as percentages of the 7-day week
  const weekSpanMs = weekEndMs - weekStartMs;
  function ganttGeometry(t: Task) {
    const clampedStart = Math.max(t.scheduledStart!, weekStartMs);
    const clampedEnd   = Math.min(t.scheduledEnd!,   weekEndMs);
    const left  = ((clampedStart - weekStartMs) / weekSpanMs) * 100;
    const width = Math.max(2, ((clampedEnd - clampedStart) / weekSpanMs) * 100);
    return { left, width };
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* ── Week nav header ── */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border flex-shrink-0 bg-background/80">
        <button
          onClick={() => setWeek(subWeeks(week, 1))}
          className="p-0.5 rounded hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <span className="text-xs font-semibold flex-1 text-center select-none">
          {format(weekStart, 'M/d')} – {format(weekEnd, 'M/d')}
        </span>
        <button
          onClick={() => setWeek(addWeeks(week, 1))}
          className="p-0.5 rounded hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={() => navigate('/calendar')}
          title="打开日历页"
          className="p-0.5 rounded hover:bg-muted transition-colors ml-1"
        >
          <ExternalLink className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>

      {/* ── Day column headers ── */}
      <div
        className="flex flex-shrink-0 border-b border-border"
        style={{ paddingLeft: `${GUTTER}px` }}
      >
        {days.map((day, i) => {
          const today = isToday(day);
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center py-1 border-l border-border first:border-l-0"
            >
              <span className={cn(
                'text-[10px] font-medium',
                today ? 'text-primary' : 'text-muted-foreground',
              )}>
                {DAY_SHORT[i]}
              </span>
              <span className={cn(
                'text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full',
                today && 'bg-primary text-primary-foreground',
              )}>
                {format(day, 'd')}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Gantt strip (multi-day tasks) ── */}
      {ganttTasks.length > 0 && (
        <div
          className="flex-shrink-0 border-b border-border relative bg-muted/20"
          style={{ paddingLeft: `${GUTTER}px`, minHeight: `${ganttTasks.length * 24 + 6}px` }}
        >
          {/* Column grid lines */}
          <div className="absolute inset-0 flex pointer-events-none" style={{ left: `${GUTTER}px` }}>
            {days.map((_, i) => (
              <div key={i} className="flex-1 border-l border-border/30 first:border-l-0" />
            ))}
          </div>

          {/* Gantt bars */}
          <div className="relative" style={{ height: `${ganttTasks.length * 24 + 6}px` }}>
            {ganttTasks.map((task, idx) => {
              const { left, width } = ganttGeometry(task);
              const color = taskColor(task);
              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  title={task.title}
                  style={{
                    position: 'absolute',
                    top: `${idx * 24 + 3}px`,
                    left: `${left}%`,
                    width: `${width}%`,
                    height: '18px',
                    backgroundColor: `${color}28`,
                    borderLeft: `3px solid ${color}`,
                  }}
                  className="rounded-r px-1 flex items-center text-[10px] font-medium truncate cursor-pointer hover:brightness-95 transition-all"
                >
                  <span className="truncate" style={{ color }}>{task.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Scrollable time grid ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex" style={{ height: `${24 * HOUR_H}px` }}>
          {/* Time gutter */}
          <div className="relative flex-shrink-0 border-r border-border/30" style={{ width: `${GUTTER}px` }}>
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute text-[9px] text-muted-foreground/60 text-right pr-1 select-none"
                style={{ top: `${h * HOUR_H - 5}px`, width: `${GUTTER - 2}px` }}
              >
                {h === 0 ? '' : `${h.toString().padStart(2, '0')}`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, i) => (
            <div key={i} className="flex-1 relative border-l border-border/30">
              {/* Hour lines */}
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute w-full border-t border-border/20"
                  style={{ top: `${h * HOUR_H}px` }}
                />
              ))}
              {/* Half-hour lines */}
              {HOURS.map((h) => (
                <div
                  key={`hh-${h}`}
                  className="absolute w-full border-t border-border/10"
                  style={{ top: `${h * HOUR_H + HOUR_H / 2}px` }}
                />
              ))}

              {/* Timed task blocks */}
              {timedFor(day).map((task) => {
                const top    = toTopPx(task.scheduledStart!);
                const height = task.scheduledEnd
                  ? heightPx(task.scheduledStart!, task.scheduledEnd)
                  : HOUR_H * 0.8;
                const color = taskColor(task);
                return (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    title={task.title}
                    style={{
                      position: 'absolute',
                      top: `${top}px`,
                      height: `${height}px`,
                      left: '1px',
                      right: '1px',
                      backgroundColor: `${color}22`,
                      borderLeft: `2px solid ${color}`,
                    }}
                    className="rounded-r px-1 py-0.5 text-[10px] cursor-pointer overflow-hidden hover:brightness-95 transition-all"
                  >
                    <div
                      className="font-medium leading-tight truncate"
                      style={{ color }}
                    >
                      {task.title}
                    </div>
                    {height > 30 && (
                      <div className="text-muted-foreground text-[9px]">
                        {format(new Date(task.scheduledStart!), 'HH:mm')}
                        {task.scheduledEnd
                          ? `–${format(new Date(task.scheduledEnd), 'HH:mm')}`
                          : ''}
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

import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, format,
} from 'date-fns';
import { DAY_NAMES } from '../../lib/calendar';
import type { Task, Pomodoro, Project } from '../../types';

interface Props {
  currentDate: Date;
  tasks: Task[];
  pomodoros: Pomodoro[];
  projects: Project[];
  onTaskClick: (task: Task) => void;
  onDayClick: (date: Date) => void;
}

export function MonthView({ currentDate, tasks, pomodoros, projects, onTaskClick, onDayClick }: Props) {
  const today = new Date();
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
  });

  function taskColor(task: Task): string {
    return (task.projectId && projectMap[task.projectId]?.color) ?? 'var(--c-plan)';
  }

  return (
    <div className="flex-1 overflow-auto flex flex-col">
      {/* Week-day headers */}
      <div
        className="grid grid-cols-7 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--line-soft)' }}
      >
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center py-2 text-[11px] font-medium uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)', letterSpacing: '0.06em' }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 flex-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, today);

          const dayTasks = tasks.filter((t) => {
            if (t.scheduledStart && isSameDay(new Date(t.scheduledStart), day)) return true;
            if (!t.scheduledStart && t.dueDate && isSameDay(new Date(t.dueDate), day)) return true;
            return false;
          });

          const pomCount = pomodoros.filter(
            (p) => p.status === 'completed' && isSameDay(new Date(p.startedAt), day),
          ).length;

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className="min-h-[90px] p-1.5 cursor-pointer transition-colors duration-100"
              style={{
                background: inMonth ? 'var(--surface)' : 'var(--bg-2)',
                borderBottom: '1px solid var(--line-soft)',
                borderRight: '1px solid var(--line-soft)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = inMonth ? 'var(--surface)' : 'var(--bg-2)';
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-sm w-6 h-6 flex items-center justify-center rounded-full font-medium"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    ...(isToday
                      ? { background: 'var(--brand)', color: '#fff', fontWeight: 700 }
                      : inMonth
                      ? { color: 'var(--ink)' }
                      : { color: 'var(--ink-faint)' }),
                  }}
                >
                  {format(day, 'd')}
                </span>
                {pomCount > 0 && (
                  <span
                    className="text-[10px] font-medium"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)' }}
                  >
                    🍅{pomCount}
                  </span>
                )}
              </div>

              {dayTasks.slice(0, 2).map((task) => {
                const color = taskColor(task);
                return (
                  <div
                    key={task.id}
                    onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                    className="text-xs truncate px-1.5 py-0.5 rounded-md mb-0.5 cursor-pointer transition-colors duration-100"
                    style={{
                      background: `color-mix(in oklab, ${color} 10%, var(--surface))`,
                      borderLeft: `3px solid ${color}`,
                      color: 'var(--ink-soft)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = `color-mix(in oklab, ${color} 20%, var(--surface))`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = `color-mix(in oklab, ${color} 10%, var(--surface))`;
                    }}
                  >
                    {task.scheduledStart
                      ? `${format(new Date(task.scheduledStart), 'HH:mm')} ${task.title}`
                      : `🚩 ${task.title}`}
                  </div>
                );
              })}
              {dayTasks.length > 2 && (
                <div
                  className="text-[10px] px-1"
                  style={{ color: 'var(--ink-mute)', fontFamily: 'var(--font-mono)' }}
                >
                  +{dayTasks.length - 2} 更多
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

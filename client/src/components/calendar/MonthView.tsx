import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, format,
} from 'date-fns';
import { cn } from '../../lib/utils';
import { DAY_NAMES } from '../../lib/calendar';
import type { Task, Pomodoro } from '../../types';

interface Props {
  currentDate: Date;
  tasks: Task[];
  pomodoros: Pomodoro[];
  onTaskClick: (task: Task) => void;
  onDayClick: (date: Date) => void;
}

export function MonthView({ currentDate, tasks, pomodoros, onTaskClick, onDayClick }: Props) {
  const today = new Date();
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
  });

  return (
    <div className="flex-1 overflow-auto flex flex-col">
      {/* Week-day headers */}
      <div className="grid grid-cols-7 border-b border-border flex-shrink-0">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground py-2 font-medium">
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
              className={cn(
                'min-h-[90px] p-1 border-b border-r border-border cursor-pointer',
                'hover:bg-muted/30 transition-colors',
                !inMonth && 'bg-muted/10',
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    'text-sm w-6 h-6 flex items-center justify-center rounded-full font-medium',
                    isToday && 'bg-primary text-primary-foreground',
                    !isToday && inMonth && 'text-foreground',
                    !isToday && !inMonth && 'text-muted-foreground/40',
                  )}
                >
                  {format(day, 'd')}
                </span>
                {pomCount > 0 && (
                  <span className="text-xs text-muted-foreground">🍅{pomCount}</span>
                )}
              </div>

              {dayTasks.slice(0, 2).map((task) => (
                <div
                  key={task.id}
                  onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                  className="text-xs truncate px-1 py-0.5 rounded mb-0.5 bg-primary/10 hover:bg-primary/20 cursor-pointer"
                >
                  {task.scheduledStart
                    ? `${format(new Date(task.scheduledStart), 'HH:mm')} ${task.title}`
                    : `📅 ${task.title}`}
                </div>
              ))}
              {dayTasks.length > 2 && (
                <div className="text-xs text-muted-foreground px-1">
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

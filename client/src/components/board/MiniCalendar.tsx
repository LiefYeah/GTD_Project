import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay,
  format, addMonths, subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';
import { cn } from '../../lib/utils';

const WEEK_HEADS = ['一', '二', '三', '四', '五', '六', '日'];

export function MiniCalendar() {
  const navigate = useNavigate();
  const tasks = useBoardStore((s) => s.tasks);
  const [month, setMonth] = useState(() => new Date());

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(month),     { weekStartsOn: 1 }),
  });

  function hasTasks(day: Date) {
    return tasks.some((t) => {
      if (t.scheduledStart) return isSameDay(t.scheduledStart, day);
      if (t.dueDate)        return isSameDay(t.dueDate, day);
      return false;
    });
  }

  return (
    <div className="p-3 border-b border-border flex-shrink-0">
      {/* Month header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold">{format(month, 'yyyy年M月')}</span>
        <div className="flex gap-0.5">
          <button
            onClick={() => setMonth(subMonths(month, 1))}
            className="p-0.5 rounded hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={() => setMonth(addMonths(month, 1))}
            className="p-0.5 rounded hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_HEADS.map((h) => (
          <div key={h} className="text-[10px] text-center text-muted-foreground font-medium">
            {h}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day) => {
          const inMonth = isSameMonth(day, month);
          const today   = isToday(day);
          const dot     = inMonth && hasTasks(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => navigate('/calendar')}
              disabled={!inMonth}
              className={cn(
                'relative flex flex-col items-center justify-center h-7 rounded text-[11px] transition-colors',
                inMonth
                  ? 'text-foreground hover:bg-muted cursor-pointer'
                  : 'text-muted-foreground/25 cursor-default',
                today && 'bg-primary text-primary-foreground hover:bg-primary/90 font-bold',
              )}
            >
              {format(day, 'd')}
              {dot && !today && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary/60" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

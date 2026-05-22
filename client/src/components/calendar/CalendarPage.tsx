import { useEffect } from 'react';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCalendarStore } from '../../store/calendarStore';
import { useBoardStore } from '../../store/boardStore';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { TaskDrawer } from '../board/TaskDrawer';
import { cn } from '../../lib/utils';

export function CalendarPage() {
  const {
    view, currentDate, tasks, pomodoros, isLoading,
    setView, setCurrentDate, navigate, goToday, load,
  } = useCalendarStore();

  const { projects, selectedTask, setSelectedTask, patchTask, removeTask, load: loadBoard } =
    useBoardStore();

  useEffect(() => {
    if (projects.length === 0) loadBoard();
  }, [projects.length, loadBoard]);

  useEffect(() => {
    load();
  }, [view, currentDate, load]);

  const headerLabel = () => {
    if (view === 'month') return format(currentDate, 'yyyy年M月');
    if (view === 'week') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      return ws.getMonth() === we.getMonth()
        ? format(ws, 'yyyy年M月')
        : `${format(ws, 'M月')}–${format(we, 'M月 yyyy')}`;
    }
    return format(currentDate, 'yyyy年M月d日');
  };

  const viewBtn = (v: typeof view, label: string) => (
    <button
      key={v}
      onClick={() => setView(v)}
      className={cn(
        'text-sm px-3 py-1 rounded-md transition-colors',
        view === v
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full animate-in fade-in-0 duration-150">
      {/* Calendar toolbar */}
      <div className="flex-shrink-0 flex items-center gap-1 px-4 py-2 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => navigate(1)}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold ml-1 min-w-[110px]">{headerLabel()}</span>
        <button
          onClick={goToday}
          className="text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors"
        >
          今天
        </button>
        <div className="ml-auto flex gap-1">
          {viewBtn('month', '月')}
          {viewBtn('week', '周')}
          {viewBtn('day', '日')}
        </div>
      </div>

      {isLoading && tasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          加载中…
        </div>
      ) : view === 'month' ? (
        <MonthView
          currentDate={currentDate}
          tasks={tasks}
          pomodoros={pomodoros}
          onTaskClick={setSelectedTask}
          onDayClick={(date) => { setCurrentDate(date); setView('day'); }}
        />
      ) : view === 'week' ? (
        <WeekView
          currentDate={currentDate}
          tasks={tasks}
          pomodoros={pomodoros}
          onTaskClick={setSelectedTask}
        />
      ) : (
        <DayView
          currentDate={currentDate}
          tasks={tasks}
          pomodoros={pomodoros}
          onTaskClick={setSelectedTask}
        />
      )}

      <TaskDrawer
        task={selectedTask}
        projects={projects}
        onClose={() => setSelectedTask(null)}
        onPatch={(id, data) => patchTask(id, data as Parameters<typeof patchTask>[1])}
        onDelete={(id) => { removeTask(id); load(); }}
      />
    </div>
  );
}

import { useEffect } from 'react';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCalendarStore } from '../../store/calendarStore';
import { useBoardStore } from '../../store/boardStore';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { TaskDrawer } from '../board/TaskDrawer';

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

  return (
    <div className="flex flex-col h-full animate-in fade-in-0 duration-150">
      {/* Calendar toolbar */}
      <div
        className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5"
        style={{
          background: 'color-mix(in oklab, var(--bg) 85%, transparent)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--line-soft)',
        }}
      >
        {/* Nav arrows */}
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--ink-mute)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '')}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => navigate(1)}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--ink-mute)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '')}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Date label */}
        <span
          className="text-sm font-semibold ml-1 min-w-[110px]"
          style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}
        >
          {headerLabel()}
        </span>

        {/* Today button */}
        <button
          onClick={goToday}
          className="text-xs px-2.5 py-1 rounded-lg transition-colors"
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--line)',
            color: 'var(--ink-soft)',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--ink)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--ink-soft)')}
        >
          今天
        </button>

        {/* View switcher pill */}
        <div
          className="ml-auto flex gap-0.5 p-1 rounded-xl"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
        >
          {(['month', 'week', 'day'] as const).map((v, i) => {
            const labels = ['月', '周', '日'];
            const isActive = view === v;
            return (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1 text-xs font-medium rounded-lg transition-all duration-150"
                style={isActive ? {
                  background: 'var(--ink)',
                  color: 'var(--bg)',
                  boxShadow: 'var(--shadow-sm)',
                } : {
                  color: 'var(--ink-mute)',
                }}
              >
                {labels[i]}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading && tasks.length === 0 ? (
        <div
          className="flex-1 flex items-center justify-center text-sm"
          style={{ color: 'var(--ink-mute)' }}
        >
          加载中…
        </div>
      ) : view === 'month' ? (
        <MonthView
          currentDate={currentDate}
          tasks={tasks}
          pomodoros={pomodoros}
          projects={projects}
          onTaskClick={setSelectedTask}
          onDayClick={(date) => { setCurrentDate(date); setView('day'); }}
        />
      ) : view === 'week' ? (
        <WeekView
          currentDate={currentDate}
          tasks={tasks}
          pomodoros={pomodoros}
          projects={projects}
          onTaskClick={setSelectedTask}
        />
      ) : (
        <DayView
          currentDate={currentDate}
          tasks={tasks}
          pomodoros={pomodoros}
          projects={projects}
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

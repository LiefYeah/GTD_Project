import { useState } from 'react';
import { CheckCircle, XCircle, Timer, Play } from 'lucide-react';
import { usePomodoroStore } from '../../store/pomodoroStore';
import { useBoardStore } from '../../store/boardStore';
import { cn } from '../../lib/utils';

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function Ring({ progress }: { progress: number }) {
  const R = 38;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - Math.min(1, Math.max(0, progress)));
  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
      <circle cx="50" cy="50" r={R} fill="none" strokeWidth="6"
        stroke="currentColor" className="text-muted" />
      <circle cx="50" cy="50" r={R} fill="none" strokeWidth="6"
        stroke="currentColor" strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={offset}
        className={cn(
          'transition-[stroke-dashoffset] duration-1000 ease-linear',
          progress > 0.9 ? 'text-red-500' :
          progress > 0.75 ? 'text-orange-400' :
          'text-primary',
        )} />
    </svg>
  );
}

export function PomodoroCard() {
  const { status, taskTitle, secondsLeft, durationSeconds, start, complete, interrupt, error, clearError } =
    usePomodoroStore();
  const tasks = useBoardStore((s) => s.tasks);

  const [selectedTaskId, setSelectedTaskId] = useState('');

  const progress = durationSeconds > 0 ? (durationSeconds - secondsLeft) / durationSeconds : 0;
  const isRunning = status === 'running';

  // Tasks available for association (active ones first)
  const activeTasks = [
    ...tasks.filter((t) => t.status === 'in_progress'),
    ...tasks.filter((t) => t.status === 'planned'),
  ];

  const handleStart = () => {
    const task = activeTasks.find((t) => t.id === selectedTaskId);
    start(selectedTaskId || null, task?.title ?? '自由专注');
  };

  return (
    <div className="border-b border-border flex-shrink-0">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1">
        <Timer className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">番茄钟</span>
        {isRunning && (
          <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">
            {formatTime(secondsLeft)}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 mb-1 text-xs text-destructive flex items-center justify-between">
          <span className="truncate">{error}</span>
          <button onClick={clearError} className="underline ml-2 flex-shrink-0">关闭</button>
        </div>
      )}

      {/* ── Idle state ── */}
      {!isRunning && (
        <div className="flex items-center gap-3 px-3 pb-3 pt-1">
          {/* Compact ring (empty) */}
          <div className="relative flex items-center justify-center flex-shrink-0">
            <Ring progress={0} />
            <span className="absolute text-2xl select-none">🍅</span>
          </div>

          {/* Task picker + start */}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 outline-none cursor-pointer focus:ring-1 focus:ring-primary/30"
            >
              <option value="">自由专注（不关联任务）</option>
              {activeTasks.length > 0 && (
                <optgroup label="进行中">
                  {tasks.filter((t) => t.status === 'in_progress').map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </optgroup>
              )}
              {tasks.filter((t) => t.status === 'planned').length > 0 && (
                <optgroup label="计划中">
                  {tasks.filter((t) => t.status === 'planned').map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </optgroup>
              )}
            </select>
            <button
              onClick={handleStart}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-md hover:opacity-90 transition-opacity font-medium"
            >
              <Play className="w-3 h-3 fill-current" />
              开始专注
            </button>
          </div>
        </div>
      )}

      {/* ── Running state ── */}
      {isRunning && (
        <div className="flex items-center gap-3 px-3 pb-3 pt-1">
          {/* Ring with countdown */}
          <div className="relative flex items-center justify-center flex-shrink-0">
            <Ring progress={progress} />
            <div className="absolute flex flex-col items-center select-none">
              <span className={cn(
                'font-mono text-lg font-bold tabular-nums leading-none',
                secondsLeft <= 60 && 'text-orange-500',
                secondsLeft <= 10 && 'text-red-500',
              )}>
                {formatTime(secondsLeft)}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">
                {Math.round(progress * 100)}%
              </span>
            </div>
          </div>

          {/* Task name + controls */}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <p className="text-xs font-medium line-clamp-2 text-foreground leading-snug">
              {taskTitle}
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => complete()}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-opacity hover:opacity-80 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              >
                <CheckCircle className="w-3 h-3" /> 完成
              </button>
              <button
                onClick={() => interrupt()}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-opacity hover:opacity-80 bg-muted text-muted-foreground"
              >
                <XCircle className="w-3 h-3" /> 中断
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

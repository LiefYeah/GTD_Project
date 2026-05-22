import { CheckCircle, XCircle, Timer } from 'lucide-react';
import { usePomodoroStore } from '../../store/pomodoroStore';
import { cn } from '../../lib/utils';

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function Ring({ progress }: { progress: number }) {
  const R = 38;
  const C = 2 * Math.PI * R; // ≈ 238.76
  const offset = C * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
      {/* Background track */}
      <circle
        cx="50" cy="50" r={R}
        fill="none" strokeWidth="6"
        stroke="currentColor"
        className="text-muted"
      />
      {/* Progress arc */}
      <circle
        cx="50" cy="50" r={R}
        fill="none" strokeWidth="6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={offset}
        className={cn(
          'transition-[stroke-dashoffset] duration-1000 ease-linear',
          progress > 0.9 ? 'text-red-500' :
          progress > 0.75 ? 'text-orange-400' :
          'text-primary',
        )}
      />
    </svg>
  );
}

export function PomodoroCard() {
  const {
    status, taskTitle, secondsLeft, durationSeconds,
    complete, interrupt, error, clearError,
  } = usePomodoroStore();

  const progress = durationSeconds > 0 ? (durationSeconds - secondsLeft) / durationSeconds : 0;
  const isRunning = status === 'running';

  return (
    <div className="p-3 border-b border-border flex-shrink-0">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-2">
        <Timer className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          番茄钟
        </span>
        {isRunning && (
          <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
            {formatTime(secondsLeft)}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-2 text-xs text-destructive flex items-center justify-between">
          <span className="truncate">{error}</span>
          <button onClick={clearError} className="underline ml-2 flex-shrink-0">关闭</button>
        </div>
      )}

      {/* Ring + info */}
      <div className="flex flex-col items-center gap-2 py-1">
        {/* Circular ring with countdown overlay */}
        <div className="relative flex items-center justify-center">
          <Ring progress={isRunning ? progress : 0} />
          <div className="absolute flex flex-col items-center select-none">
            {isRunning ? (
              <>
                <span
                  className={cn(
                    'font-mono text-2xl font-bold tabular-nums leading-none',
                    secondsLeft <= 60 && 'text-orange-500',
                    secondsLeft <= 10 && 'text-red-500',
                  )}
                >
                  {formatTime(secondsLeft)}
                </span>
                <span className="text-[10px] text-muted-foreground mt-1">
                  {Math.round(progress * 100)}%
                </span>
              </>
            ) : (
              <span className="text-3xl">🍅</span>
            )}
          </div>
        </div>

        {/* Task name or idle hint */}
        {isRunning ? (
          <p className="text-xs font-medium text-center line-clamp-2 px-2 text-foreground">
            {taskTitle}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground text-center leading-snug">
            点击任务卡片的&nbsp;🍅&nbsp;开始
          </p>
        )}

        {/* Action buttons */}
        {isRunning && (
          <div className="flex gap-2 mt-0.5">
            <button
              onClick={() => complete()}
              className="flex items-center gap-1 px-3 py-1 text-xs rounded-md transition-opacity hover:opacity-80 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            >
              <CheckCircle className="w-3 h-3" />
              完成
            </button>
            <button
              onClick={() => interrupt()}
              className="flex items-center gap-1 px-3 py-1 text-xs rounded-md transition-opacity hover:opacity-80 bg-muted text-muted-foreground"
            >
              <XCircle className="w-3 h-3" />
              中断
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

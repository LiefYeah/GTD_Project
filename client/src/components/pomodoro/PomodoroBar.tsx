import { useLocation } from 'react-router-dom';
import { usePomodoroStore } from '../../store/pomodoroStore';
import { cn } from '../../lib/utils';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function PomodoroBar() {
  const { pathname } = useLocation();
  const {
    status, taskTitle, secondsLeft, durationSeconds,
    complete, interrupt,
    startBreak, skipBreak, startNextFocus,
    phase, breakCountdown,
    error, clearError,
  } = usePomodoroStore();

  // On board page, PomodoroCard in the right panel takes over
  if (pathname === '/board') return null;

  const isVisible =
    !!error ||
    status === 'running' ||
    phase === 'awaitingBreak' ||
    phase === 'awaitingFocus';

  if (!isVisible) return null;

  const progress = durationSeconds > 0 ? (durationSeconds - secondsLeft) / durationSeconds : 0;
  const isBreak = phase === 'shortBreak' || phase === 'longBreak';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur">
      {/* Progress bar */}
      {status === 'running' && (
        <div className="h-0.5 bg-primary/20">
          <div
            className="h-full transition-all duration-1000 ease-linear"
            style={{
              width: `${progress * 100}%`,
              background: isBreak ? '#52A8FF' : 'hsl(var(--primary))',
            }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-1.5 bg-destructive/10 text-destructive text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="underline ml-3">关闭</button>
        </div>
      )}

      {/* Focus: running */}
      {phase === 'focus' && status === 'running' && (
        <div className="flex items-center gap-3 px-4 py-2">
          <span className="text-lg select-none">🍅</span>
          <span className="text-sm font-medium flex-1 truncate text-foreground">{taskTitle || '自由专注'}</span>
          <span className={cn(
            'font-mono text-lg tabular-nums font-semibold',
            secondsLeft <= 60 && 'text-orange-500',
            secondsLeft <= 10 && 'text-red-500',
          )}>
            {formatTime(secondsLeft)}
          </span>
          <button
            onClick={() => complete()}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
          >
            完成
          </button>
          <button
            onClick={() => interrupt()}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
          >
            中断
          </button>
        </div>
      )}

      {/* Awaiting break: 5s countdown */}
      {phase === 'awaitingBreak' && (
        <div className="flex items-center gap-3 px-4 py-2">
          <span className="text-lg select-none">🎉</span>
          <span className="text-sm font-medium flex-1 text-foreground">
            专注结束！休息将在 {breakCountdown}s 后开始
          </span>
          <button
            onClick={() => startBreak()}
            className="px-2.5 py-1 text-xs rounded-md transition-colors"
            style={{ background: '#52A8FF', color: '#fff' }}
          >
            立即开始
          </button>
          <button
            onClick={() => skipBreak()}
            className="px-2.5 py-1 text-xs bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
          >
            跳过
          </button>
        </div>
      )}

      {/* Break: running */}
      {(phase === 'shortBreak' || phase === 'longBreak') && status === 'running' && (
        <div className="flex items-center gap-3 px-4 py-2">
          <span className="text-lg select-none">☕</span>
          <span className="text-sm font-medium flex-1 text-foreground">
            {phase === 'longBreak' ? '长休' : '短休'}中
          </span>
          <span className="font-mono text-lg tabular-nums font-semibold" style={{ color: '#52A8FF' }}>
            {formatTime(secondsLeft)}
          </span>
          <button
            onClick={() => skipBreak()}
            className="px-2.5 py-1 text-xs bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
          >
            跳过
          </button>
        </div>
      )}

      {/* Awaiting focus */}
      {phase === 'awaitingFocus' && (
        <div className="flex items-center gap-3 px-4 py-2">
          <span className="text-lg select-none">☕</span>
          <span className="text-sm font-medium flex-1 text-foreground">休息结束，准备好了吗？</span>
          <button
            onClick={() => startNextFocus()}
            className="px-2.5 py-1 text-xs rounded-md transition-colors"
            style={{ background: 'hsl(var(--primary))', color: '#fff' }}
          >
            开始专注
          </button>
        </div>
      )}
    </div>
  );
}

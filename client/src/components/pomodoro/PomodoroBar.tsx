import { useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { usePomodoroStore } from '../../store/pomodoroStore';
import { cn } from '../../lib/utils';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function PomodoroBar() {
  const {
    status, taskTitle, secondsLeft, durationSeconds,
    tick, complete, interrupt, error, clearError,
  } = usePomodoroStore();

  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status, tick]);

  useEffect(() => {
    if (status === 'running' && secondsLeft <= 0) {
      complete();
    }
  }, [status, secondsLeft, complete]);

  if (status === 'idle' && !error) return null;

  const progress = durationSeconds > 0 ? (durationSeconds - secondsLeft) / durationSeconds : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur">
      {status === 'running' && (
        <div className="h-0.5 bg-primary/20">
          <div
            className="h-full bg-primary transition-all duration-1000 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      {error && (
        <div className="px-4 py-1.5 bg-destructive/10 text-destructive text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="underline ml-3">关闭</button>
        </div>
      )}

      {status === 'running' && (
        <div className="flex items-center gap-3 px-4 py-2">
          <span className="text-lg select-none">🍅</span>
          <span className="text-sm font-medium flex-1 truncate text-foreground">{taskTitle}</span>
          <span
            className={cn(
              'font-mono text-lg tabular-nums font-semibold',
              secondsLeft <= 60 && 'text-orange-500',
              secondsLeft <= 10 && 'text-red-500',
            )}
          >
            {formatTime(secondsLeft)}
          </span>
          <button
            onClick={() => complete()}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            完成
          </button>
          <button
            onClick={() => interrupt()}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
            中断
          </button>
        </div>
      )}
    </div>
  );
}

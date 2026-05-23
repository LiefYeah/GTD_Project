import { useState, useEffect } from 'react';
import { usePomodoroStore } from '../../store/pomodoroStore';
import { useBoardStore } from '../../store/boardStore';

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** 200px SVG ring with 60 tick marks and countdown arc */
function Ring({
  progress,
  accent,
  children,
}: {
  progress: number;
  accent: string;
  children?: React.ReactNode;
}) {
  const R = 88;
  const C = 2 * Math.PI * R;
  // countdown: progress=0 → full ring, progress=1 → empty
  const offset = C * Math.min(1, Math.max(0, progress));

  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const r1 = 72;
    const r2 = i % 5 === 0 ? 64 : 68;
    return {
      x1: 100 + Math.cos(a) * r1,
      y1: 100 + Math.sin(a) * r1,
      x2: 100 + Math.cos(a) * r2,
      y2: 100 + Math.sin(a) * r2,
      major: i % 5 === 0,
    };
  });

  return (
    <div className="relative" style={{ width: 200, height: 200, flexShrink: 0 }}>
      <svg viewBox="0 0 200 200" width={200} height={200}>
        {/* Track */}
        <circle cx="100" cy="100" r={R} stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
        {/* Countdown arc */}
        <circle
          cx="100" cy="100" r={R}
          stroke={accent}
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={C}
          strokeDashoffset={offset}
          transform="rotate(-90 100 100)"
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
        {/* Tick marks */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke="var(--ink-mute)"
            strokeWidth={t.major ? 1.5 : 0.8}
            opacity={t.major ? 0.9 : 0.4}
          />
        ))}
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

/** Today pip bars (8 slots) */
function TodayPips({ count }: { count: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className="flex-1 rounded-sm"
          style={{
            height: 4,
            background: i < count ? 'var(--brand)' : 'rgba(255,255,255,0.1)',
          }}
        />
      ))}
    </div>
  );
}

interface Props {
  /** dark=true means used inside FocusHero (dark bg), false = standalone */
  dark?: boolean;
}

export function PomodoroCard({ dark = false }: Props) {
  const {
    status, taskTitle, secondsLeft, durationSeconds,
    start, complete, interrupt, error, clearError,
    todayPomodoros, loadToday,
  } = usePomodoroStore();
  const tasks = useBoardStore((s) => s.tasks);

  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [mode, setMode] = useState<'专注' | '短休' | '长休'>('专注');
  const [round, setRound] = useState(1);

  useEffect(() => { loadToday(); }, []);

  const isRunning = status === 'running';
  const progress = durationSeconds > 0 ? (durationSeconds - secondsLeft) / durationSeconds : 0;

  const todayPomCount = todayPomodoros.length;
  const todayPoms = Math.min(8, todayPomCount);
  const focusMin = Math.round(todayPomodoros.reduce((s, p) => s + p.durationSeconds, 0) / 60);
  const focusH = Math.floor(focusMin / 60);
  const focusM = focusMin % 60;

  const activeTasks = [
    ...tasks.filter((t) => t.status === 'in_progress'),
    ...tasks.filter((t) => t.status === 'planned'),
  ];

  const handleStart = () => {
    const task = activeTasks.find((t) => t.id === selectedTaskId);
    start(selectedTaskId || null, task?.title ?? '自由专注');
    if (mode !== '专注') setMode('专注');
  };

  const accent = 'var(--brand)';

  // Color palette: in dark card, text uses light colors
  const textPrimary = dark ? 'var(--bg)' : 'var(--ink)';
  const textMuted   = dark ? 'color-mix(in oklab, var(--bg) 55%, transparent)' : 'var(--ink-mute)';
  const textLabel   = dark ? 'color-mix(in oklab, var(--bg) 50%, transparent)' : 'var(--ink-mute)';
  const btnBg       = dark ? 'rgba(255,255,255,0.08)' : 'hsl(var(--muted))';
  const btnBorder   = dark ? 'rgba(255,255,255,0.06)' : 'hsl(var(--border))';
  const btnText     = dark ? 'var(--bg)' : 'var(--ink-soft)';
  const modeBg      = dark ? 'rgba(255,255,255,0.08)' : 'hsl(var(--muted))';
  const modeText    = dark ? 'color-mix(in oklab, var(--bg) 70%, transparent)' : 'var(--ink-mute)';

  return (
    <div className="relative flex flex-col h-full p-6 gap-4" style={{ color: textPrimary }}>
      {/* Header: title + mode tabs */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🍅</span>
          <span className="font-semibold text-[15px]">番茄钟</span>
          <span
            className="text-xs"
            style={{ fontFamily: 'var(--font-mono)', color: textMuted }}
          >
            · 第 {round} 颗
          </span>
        </div>
        {/* Mode tabs */}
        <div
          className="flex gap-0.5 p-0.5 rounded-lg"
          style={{ background: modeBg }}
        >
          {(['专注', '短休', '长休'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-3 py-1 text-xs rounded-md font-medium transition-all duration-150"
              style={mode === m ? {
                background: 'var(--brand)',
                color: '#fff',
              } : {
                color: modeText,
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-xs flex items-center justify-between" style={{ color: 'hsl(var(--destructive))' }}>
          <span className="truncate">{error}</span>
          <button onClick={clearError} className="underline ml-2 flex-shrink-0">关闭</button>
        </div>
      )}

      {/* Main: ring + side */}
      <div className="flex gap-6 items-center flex-1 min-h-0">
        {/* Ring */}
        {isRunning ? (
          <Ring progress={progress} accent={accent}>
            <div
              className="font-mono text-4xl font-semibold leading-none"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '-0.04em', color: textPrimary }}
            >
              {formatTime(secondsLeft).split(':')[0]}
              <span className="blink" style={{ color: 'var(--brand)' }}>:</span>
              {formatTime(secondsLeft).split(':')[1]}
            </div>
            <div
              className="text-[11px] mt-1 truncate max-w-[120px]"
              style={{ fontFamily: 'var(--font-mono)', color: textMuted, letterSpacing: '0.02em' }}
            >
              {taskTitle || '自由专注'}
            </div>
          </Ring>
        ) : (
          <Ring progress={0} accent={accent}>
            <div
              className="font-mono text-4xl font-semibold leading-none"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '-0.04em', color: textPrimary }}
            >
              {formatTime(durationSeconds).split(':')[0]}
              <span style={{ color: 'var(--brand)' }}>:</span>
              {formatTime(durationSeconds).split(':')[1]}
            </div>
            <div
              className="text-[11px] mt-1"
              style={{ fontFamily: 'var(--font-mono)', color: textMuted, letterSpacing: '0.02em' }}
            >
              {mode === '专注' ? '25:00 专注' : mode === '短休' ? '5:00 短休' : '15:00 长休'}
            </div>
          </Ring>
        )}

        {/* Side: metrics + controls */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          {/* Today pomodoros metric */}
          <div>
            <div
              className="text-[11px] uppercase tracking-wider mb-1"
              style={{ fontFamily: 'var(--font-mono)', color: textLabel }}
            >
              今日番茄
            </div>
            <div
              className="text-xl font-semibold"
              style={{ fontFamily: 'var(--font-mono)', color: textPrimary, letterSpacing: '-0.02em' }}
            >
              {todayPomCount}{' '}
              <span className="text-sm font-normal" style={{ color: textMuted }}>颗</span>
            </div>
            <div className="mt-1.5">
              <TodayPips count={todayPoms} />
            </div>
          </div>

          {/* Focus duration metric */}
          <div>
            <div
              className="text-[11px] uppercase tracking-wider mb-1"
              style={{ fontFamily: 'var(--font-mono)', color: textLabel }}
            >
              专注时长
            </div>
            <div
              className="text-xl font-semibold"
              style={{ fontFamily: 'var(--font-mono)', color: textPrimary, letterSpacing: '-0.02em' }}
            >
              {focusH > 0 && <>{focusH}<span className="text-sm font-normal" style={{ color: textMuted }}>h</span>{' '}</>}
              {focusM}<span className="text-sm font-normal" style={{ color: textMuted }}>m</span>
            </div>
            {/* Duration bar */}
            <div
              className="mt-1.5 h-1 rounded-full overflow-hidden"
              style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'hsl(var(--muted))' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (focusMin / (8 * 25)) * 100)}%`,
                  background: 'linear-gradient(90deg, var(--brand), color-mix(in oklab, var(--brand) 60%, #ffd76b))',
                }}
              />
            </div>
          </div>

          {/* Task selector (only when idle) */}
          {!isRunning && (
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full text-xs rounded-lg px-2 py-1.5 outline-none cursor-pointer"
              style={{
                background: btnBg,
                border: `1px solid ${btnBorder}`,
                color: textPrimary,
                fontFamily: 'var(--font-sans)',
              }}
            >
              <option value="">自由专注</option>
              {tasks.filter((t) => t.status === 'in_progress').length > 0 && (
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
          )}

          {/* Controls */}
          <div className="flex gap-2 flex-wrap">
            {isRunning ? (
              <>
                <button
                  onClick={() => complete()}
                  className="flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-150"
                  style={{ background: 'var(--brand)', color: '#fff', border: 'none' }}
                >
                  完成
                </button>
                <button
                  onClick={() => interrupt()}
                  className="px-3 py-2 text-xs font-medium rounded-lg transition-all duration-150"
                  style={{ background: btnBg, color: btnText, border: `1px solid ${btnBorder}` }}
                >
                  中断
                </button>
                <button
                  onClick={() => { interrupt(); setRound((r) => r + 1); }}
                  className="px-3 py-2 text-xs rounded-lg transition-all duration-150"
                  style={{ background: 'transparent', color: textMuted, border: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : btnBorder}` }}
                >
                  跳过
                </button>
              </>
            ) : (
              <button
                onClick={handleStart}
                className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-150"
                style={{ background: 'var(--brand)', color: '#fff', border: 'none' }}
              >
                开始专注
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

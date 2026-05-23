import { useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { useBoardStore } from '../../store/boardStore';
import { usePomodoroStore } from '../../store/pomodoroStore';
import { useNow } from '../../hooks/useNow';
import { PomodoroCard } from './PomodoroCard';

const WEEKDAY_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function HOUR_GREET(date: Date): string {
  const h = date.getHours();
  if (h < 5) return '深夜好';
  if (h < 9) return '早上好';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  if (h < 22) return '晚上好';
  return '深夜好';
}

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  accent: string;
  glyph: string;
}

function StatCard({ label, value, sub, accent, glyph }: StatCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-3.5 flex gap-3 items-start"
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--line)',
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <div
        className="flex-shrink-0 w-8 h-8 rounded-lg grid place-items-center text-base"
        style={{
          background: `color-mix(in oklab, ${accent} 14%, var(--surface))`,
          color: accent,
        }}
      >
        {glyph}
      </div>
      <div className="min-w-0">
        <div
          className="text-[11px] uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)', letterSpacing: '0.04em' }}
        >
          {label}
        </div>
        <div
          className="text-2xl font-semibold tracking-tight mt-0.5"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)', letterSpacing: '-0.02em' }}
        >
          {value}
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-soft)' }}>{sub}</div>
      </div>
    </div>
  );
}

export function FocusHero() {
  const { tasks } = useBoardStore();
  const { todayPomodoros } = usePomodoroStore();
  const now = useNow();

  const dateLabel = `${WEEKDAY_ZH[now.getDay()]} · ${format(now, 'M月d日')}`;
  const greeting = HOUR_GREET(now);

  const stats = useMemo(() => {
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const doneToday = tasks.filter(
      (t) => t.status === 'done' && t.completedAt && isToday(new Date(t.completedAt)),
    ).length;
    const totalToday = inProgress + doneToday;

    const todayPomCount = todayPomodoros.length;
    const focusMin = Math.round(todayPomodoros.reduce((s, p) => s + p.durationSeconds, 0) / 60);
    const focusH = Math.floor(focusMin / 60);
    const focusM = focusMin % 60;
    const focusStr = focusH > 0 ? `${focusH}h${focusM}m` : `${focusM}m`;

    return {
      tasks: String(inProgress),
      tasksSub: `共 ${totalToday} · ${doneToday} 已完成`,
      poms: String(todayPomCount),
      doneToday,
      focusStr,
      focusSub: todayPomCount > 0 ? '今日累计专注时长' : '暂无番茄记录',
    };
  }, [tasks, todayPomodoros, now]);

  return (
    <section
      className="grid gap-5"
      style={{ gridTemplateColumns: '1.05fr 1fr' }}
    >
      {/* Left: greeting + stats */}
      <div
        className="relative overflow-hidden rounded-3xl p-8"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Background radial gradients */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(400px 240px at 100% 0%, color-mix(in oklab, var(--brand) 12%, transparent), transparent 70%),
              radial-gradient(360px 220px at 0% 100%, color-mix(in oklab, var(--c-plan) 9%, transparent), transparent 70%)
            `,
          }}
        />

        {/* Eyebrow chip */}
        <div
          className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] mb-4"
          style={{
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.14em',
            color: 'var(--ink-soft)',
            background: 'var(--bg-2)',
            borderColor: 'var(--line)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              background: 'var(--brand)',
              boxShadow: '0 0 0 4px color-mix(in oklab, var(--brand) 18%, transparent)',
            }}
          />
          <span className="uppercase">{dateLabel}</span>
        </div>

        {/* Title */}
        <h1
          className="relative font-serif text-4xl leading-tight mb-2.5"
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 500,
            letterSpacing: '-0.025em',
            color: 'var(--ink)',
          }}
        >
          {greeting}，今天是<br />
          <span className="italic" style={{ color: 'var(--brand)' }}>高效搞定的一天</span>。
        </h1>

        {/* Quote */}
        <p
          className="relative italic text-sm mb-6 max-w-lg"
          style={{ color: 'var(--ink-soft)' }}
        >
          "先把所有事情写下来，再决定下一步行动。" — GTD
        </p>

        {/* Stat cards */}
        <div
          className="relative grid gap-3"
          style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
        >
          <StatCard
            label="进行中"
            value={stats.tasks}
            sub={stats.tasksSub}
            accent="var(--c-plan)"
            glyph="◐"
          />
          <StatCard
            label="番茄钟"
            value={stats.poms}
            sub="今日累计番茄"
            accent="var(--brand)"
            glyph="🍅"
          />
          <StatCard
            label="专注时长"
            value={stats.focusStr === '0m' ? '—' : stats.focusStr}
            sub={stats.focusSub}
            accent="var(--c-done)"
            glyph="◉"
          />
          <StatCard
            label="已完成"
            value={String(stats.doneToday)}
            sub="今日完成任务"
            accent="var(--c-doing)"
            glyph="✓"
          />
        </div>
      </div>

      {/* Right: dark Pomodoro card */}
      <div
        className="relative overflow-hidden rounded-3xl"
        style={{
          background: 'var(--ink)',
          boxShadow: 'var(--shadow-md)',
        } as React.CSSProperties}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(500px 320px at 100% 0%, color-mix(in oklab, var(--brand) 28%, transparent), transparent 70%),
              radial-gradient(500px 320px at 0% 100%, color-mix(in oklab, var(--brand) 12%, transparent), transparent 70%)
            `,
          }}
        />
        <PomodoroCard dark />
      </div>
    </section>
  );
}

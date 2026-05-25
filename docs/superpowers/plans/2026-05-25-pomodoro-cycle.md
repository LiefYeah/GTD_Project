# 番茄钟完整循环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让番茄钟在专注结束时发出通知+音效、经 5 秒缓冲后自动进入休息倒计时，休息结束后由用户手动触发下一轮专注，并遵守 1-3 颗短休、第 4 颗长休的循环规则。

**Architecture:** 在 `pomodoroStore` 中新增 `Phase` 状态机（focus / awaitingBreak / shortBreak / longBreak / awaitingFocus）和 `cycleCount` 字段；`App.tsx` 的 `PomodoroTicker` 无渲染组件驱动所有阶段转换和通知触发；`PomodoroCard` 和 `PomodoroBar` 订阅 `phase` 渲染对应 UI。休息阶段纯前端，不写 API。

**Tech Stack:** React 18, Zustand, TypeScript, Web Audio API, Browser Notification API, Vite

---

### 文件变更清单

| 文件 | 操作 |
|------|------|
| `client/src/lib/sound.ts` | 新建：音效 + 通知工具函数 |
| `client/src/store/pomodoroStore.ts` | 修改：Phase 类型、新字段、新 actions |
| `client/src/App.tsx` | 修改：PomodoroTicker 扩展相位驱动逻辑 |
| `client/src/components/board/PomodoroCard.tsx` | 修改：按 phase 渲染 Ring + 按钮 |
| `client/src/components/pomodoro/PomodoroBar.tsx` | 修改：按 phase 渲染悬浮条 |

---

### Task 1: 新建 `sound.ts` 工具模块

**Files:**
- Create: `client/src/lib/sound.ts`

- [ ] **Step 1: 创建文件**

```typescript
// client/src/lib/sound.ts

export function playChime(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.9);
  } catch {
    // AudioContext 不可用时静默失败
  }
}

export function requestNotificationPermission(): void {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function sendNotification(title: string, body: string): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}
```

- [ ] **Step 2: 类型检查**

```bash
cd /Users/qq/Documents/Claude/GTDProject/gtd-app/client && npx tsc --noEmit
```

Expected: 0 errors（如有其他已存在的错误可忽略，只要 sound.ts 本身无报错）

- [ ] **Step 3: Commit**

```bash
git add client/src/lib/sound.ts
git commit -m "feat: add sound and notification utilities for pomodoro"
```

---

### Task 2: 扩展 `pomodoroStore.ts`

**Files:**
- Modify: `client/src/store/pomodoroStore.ts`

- [ ] **Step 1: 替换文件内容**

用以下完整内容替换 `client/src/store/pomodoroStore.ts`：

```typescript
import { create } from 'zustand';
import * as api from '../api/client';
import { useBoardStore } from './boardStore';
import { useSettingsStore } from './settingsStore';
import type { Pomodoro } from '../types';

export type Phase =
  | 'focus'         // 专注倒计时中（或 idle 待机）
  | 'awaitingBreak' // 专注结束，5 秒缓冲
  | 'shortBreak'    // 短休倒计时中
  | 'longBreak'     // 长休倒计时中
  | 'awaitingFocus' // 休息结束，等用户手动开始

type TimerStatus = 'idle' | 'running';

const SESSION_KEY = 'gtd-pomodoro-session';

interface PersistedSession {
  // focus phase
  pomId: string | null;
  taskId: string | null;
  taskTitle: string;
  durationSeconds: number;
  startedAt: number | null;
  // cycle state
  phase: Phase;
  cycleCount: number;
  // break phase
  breakStartedAt: number | null;
  breakDuration: number;
}

function saveSession(s: PersistedSession) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

function readSession(): Partial<PomodoroState> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    const s = JSON.parse(raw) as PersistedSession;

    if (s.phase === 'focus' && s.pomId && s.startedAt) {
      const elapsed = Math.floor((Date.now() - s.startedAt) / 1000);
      const secondsLeft = Math.max(0, s.durationSeconds - elapsed);
      if (secondsLeft <= 0) { clearSession(); return {}; }
      return {
        pomId: s.pomId, taskId: s.taskId, taskTitle: s.taskTitle,
        durationSeconds: s.durationSeconds, secondsLeft,
        status: 'running', phase: 'focus',
        cycleCount: s.cycleCount,
      };
    }

    if ((s.phase === 'shortBreak' || s.phase === 'longBreak') && s.breakStartedAt) {
      const elapsed = Math.floor((Date.now() - s.breakStartedAt) / 1000);
      const secondsLeft = Math.max(0, s.breakDuration - elapsed);
      if (secondsLeft <= 0) {
        // break already expired while away → go to awaitingFocus
        return {
          taskId: s.taskId, taskTitle: s.taskTitle,
          phase: 'awaitingFocus', status: 'idle',
          cycleCount: s.phase === 'longBreak' ? 0 : s.cycleCount,
        };
      }
      return {
        taskId: s.taskId, taskTitle: s.taskTitle,
        phase: s.phase, status: 'running',
        secondsLeft, durationSeconds: s.breakDuration,
        cycleCount: s.cycleCount,
      };
    }

    if (s.phase === 'awaitingBreak' || s.phase === 'awaitingFocus') {
      return {
        taskId: s.taskId, taskTitle: s.taskTitle,
        phase: s.phase, status: 'idle',
        cycleCount: s.cycleCount,
        breakCountdown: 5,
      };
    }

    return {};
  } catch {
    return {};
  }
}

interface PomodoroState {
  pomId: string | null;
  taskId: string | null;
  taskTitle: string;
  durationSeconds: number;
  secondsLeft: number;
  status: TimerStatus;
  phase: Phase;
  cycleCount: number;
  breakCountdown: number;
  error: string | null;
  todayPomodoros: Pomodoro[];

  start: (taskId: string | null, taskTitle: string, durationSeconds?: number) => Promise<void>;
  complete: () => Promise<void>;
  interrupt: () => Promise<void>;
  tick: () => void;
  tickBreakCountdown: () => void;
  startBreak: () => void;
  skipBreak: () => void;
  breakComplete: () => void;
  startNextFocus: () => Promise<void>;
  clearError: () => void;
  loadToday: () => Promise<void>;
}

const restored = readSession();

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  pomId: null,
  taskId: null,
  taskTitle: '',
  durationSeconds: 1500,
  secondsLeft: 1500,
  status: 'idle',
  phase: 'focus',
  cycleCount: 0,
  breakCountdown: 5,
  error: null,
  todayPomodoros: [],
  ...restored,

  start: async (taskId, taskTitle, durationSeconds?) => {
    durationSeconds ??= useSettingsStore.getState().pomodoroDuration;
    const { pomId } = get();
    if (pomId) await get().interrupt();
    try {
      const pom = await api.startPomodoro(taskId, durationSeconds);
      const startedAt = Date.now();
      const { cycleCount } = get();
      saveSession({
        pomId: pom.id, taskId, taskTitle, durationSeconds, startedAt,
        phase: 'focus', cycleCount,
        breakStartedAt: null, breakDuration: 0,
      });
      set({
        pomId: pom.id, taskId, taskTitle, durationSeconds,
        secondsLeft: durationSeconds, status: 'running',
        phase: 'focus', error: null,
      });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  complete: async () => {
    const { pomId, taskId, taskTitle, cycleCount } = get();
    if (!pomId) return;
    const newCycleCount = cycleCount + 1;
    clearSession();
    saveSession({
      pomId: null, taskId, taskTitle, durationSeconds: 0, startedAt: null,
      phase: 'awaitingBreak', cycleCount: newCycleCount,
      breakStartedAt: null, breakDuration: 0,
    });
    set({
      status: 'idle', pomId: null,
      phase: 'awaitingBreak', breakCountdown: 5,
      cycleCount: newCycleCount,
      // keep taskId + taskTitle for next focus
    });
    try {
      await api.completePomodoro(pomId);
      if (taskId) useBoardStore.getState().load();
      await get().loadToday();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  interrupt: async () => {
    const { pomId } = get();
    if (!pomId) return;
    clearSession();
    set({ status: 'idle', pomId: null, taskId: null, taskTitle: '', phase: 'focus' });
    try {
      await api.interruptPomodoro(pomId);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  tick: () => {
    set((s) => ({ secondsLeft: Math.max(0, s.secondsLeft - 1) }));
  },

  tickBreakCountdown: () => {
    set((s) => ({ breakCountdown: Math.max(0, s.breakCountdown - 1) }));
  },

  startBreak: () => {
    const { cycleCount, taskId, taskTitle } = get();
    const settings = useSettingsStore.getState();
    const isLong = cycleCount >= 4;
    const breakDuration = isLong ? settings.longBreak : settings.shortBreak;
    const breakPhase: Phase = isLong ? 'longBreak' : 'shortBreak';
    const breakStartedAt = Date.now();
    saveSession({
      pomId: null, taskId, taskTitle, durationSeconds: 0, startedAt: null,
      phase: breakPhase, cycleCount,
      breakStartedAt, breakDuration,
    });
    set({
      phase: breakPhase, status: 'running',
      secondsLeft: breakDuration, durationSeconds: breakDuration,
    });
  },

  skipBreak: () => {
    const { phase, cycleCount, taskId, taskTitle } = get();
    // Reset cycle after long break OR after skipping what would have been a long break
    const isLongReset = phase === 'longBreak' || (phase === 'awaitingBreak' && cycleCount >= 4);
    const newCycleCount = isLongReset ? 0 : cycleCount;
    saveSession({
      pomId: null, taskId, taskTitle, durationSeconds: 0, startedAt: null,
      phase: 'awaitingFocus', cycleCount: newCycleCount,
      breakStartedAt: null, breakDuration: 0,
    });
    set({ status: 'idle', phase: 'awaitingFocus', cycleCount: newCycleCount });
  },

  breakComplete: () => {
    const { phase, cycleCount, taskId, taskTitle } = get();
    const newCycleCount = phase === 'longBreak' ? 0 : cycleCount;
    saveSession({
      pomId: null, taskId, taskTitle, durationSeconds: 0, startedAt: null,
      phase: 'awaitingFocus', cycleCount: newCycleCount,
      breakStartedAt: null, breakDuration: 0,
    });
    set({ status: 'idle', phase: 'awaitingFocus', cycleCount: newCycleCount });
  },

  startNextFocus: async () => {
    const { taskId, taskTitle } = get();
    await get().start(taskId, taskTitle);
  },

  clearError: () => set({ error: null }),

  loadToday: async () => {
    try {
      const todayPomodoros = await api.getTodayPomodoros();
      set({ todayPomodoros });
    } catch {
      // non-critical: silently ignore
    }
  },
}));
```

- [ ] **Step 2: 类型检查**

```bash
cd /Users/qq/Documents/Claude/GTDProject/gtd-app/client && npx tsc --noEmit 2>&1 | head -40
```

Expected: 0 errors（PomodoroCard 和 PomodoroBar 会报错因为还未更新，先确认 store 本身无误）

- [ ] **Step 3: Commit**

```bash
git add client/src/store/pomodoroStore.ts
git commit -m "feat: extend pomodoroStore with Phase state machine and cycle tracking"
```

---

### Task 3: 扩展 `App.tsx` PomodoroTicker

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: 替换 PomodoroTicker 函数**

将 `client/src/App.tsx` 中的 imports 部分修改为（顶部追加两个 import）：

```typescript
import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BoardPage } from './components/board/BoardPage';
import { CalendarPage } from './components/calendar/CalendarPage';
import { ProjectsPage } from './components/projects/ProjectsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { PomodoroBar } from './components/pomodoro/PomodoroBar';
import { NavBar } from './components/NavBar';
import { useSettingsStore } from './store/settingsStore';
import { usePomodoroStore } from './store/pomodoroStore';
import type { Phase } from './store/pomodoroStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { playChime, requestNotificationPermission, sendNotification } from './lib/sound';
```

然后将 `PomodoroTicker` 函数整体替换为：

```typescript
/** Headless: drives tick + phase transitions + notifications for the pomodoro timer */
function PomodoroTicker() {
  const {
    status, secondsLeft, tick, complete,
    phase, breakCountdown, tickBreakCountdown, startBreak, breakComplete,
  } = usePomodoroStore();

  // Request notification permission on first mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Drive tick for both focus and break running phases
  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status, tick]);

  // Auto-complete focus when timer hits 0
  useEffect(() => {
    if (status === 'running' && phase === 'focus' && secondsLeft <= 0) complete();
  }, [status, phase, secondsLeft, complete]);

  // Drive awaitingBreak countdown (5→0)
  useEffect(() => {
    if (phase !== 'awaitingBreak') return;
    const id = setInterval(tickBreakCountdown, 1000);
    return () => clearInterval(id);
  }, [phase, tickBreakCountdown]);

  // Auto-start break when 5s countdown expires
  useEffect(() => {
    if (phase === 'awaitingBreak' && breakCountdown <= 0) startBreak();
  }, [phase, breakCountdown, startBreak]);

  // Auto-complete break when timer hits 0
  useEffect(() => {
    if ((phase === 'shortBreak' || phase === 'longBreak') && status === 'running' && secondsLeft <= 0) {
      breakComplete();
    }
  }, [phase, status, secondsLeft, breakComplete]);

  // Fire notification + chime on phase transitions
  const prevPhaseRef = useRef<Phase>(phase);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    if (phase !== prev) {
      if (phase === 'awaitingBreak') {
        playChime();
        sendNotification('🍅 专注结束！', '休息将在 5 秒后开始...');
      }
      if (phase === 'awaitingFocus') {
        playChime();
        sendNotification('☕ 休息结束！', '准备好了吗？点击开始专注');
      }
      prevPhaseRef.current = phase;
    }
  }, [phase]);

  return null;
}
```

- [ ] **Step 2: 类型检查**

```bash
cd /Users/qq/Documents/Claude/GTDProject/gtd-app/client && npx tsc --noEmit 2>&1 | head -40
```

Expected: 0 errors for App.tsx（PomodoroCard/PomodoroBar 仍可能有 error，后续任务修复）

- [ ] **Step 3: Commit**

```bash
git add client/src/App.tsx
git commit -m "feat: extend PomodoroTicker to drive break phases and notifications"
```

---

### Task 4: 更新 `PomodoroCard.tsx`

**Files:**
- Modify: `client/src/components/board/PomodoroCard.tsx`

- [ ] **Step 1: 替换文件内容（以下为最终正确版本）**

用以下完整内容替换 `client/src/components/board/PomodoroCard.tsx`：

```typescript
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
        <circle cx="100" cy="100" r={R} stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
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
  dark?: boolean;
}

const BREAK_ACCENT = '#52A8FF';
const FOCUS_ACCENT = 'var(--brand)';

const PHASE_MODE_LABEL: Record<string, string> = {
  focus: '专注',
  awaitingBreak: '专注',
  shortBreak: '短休',
  longBreak: '长休',
  awaitingFocus: '短休',
};

export function PomodoroCard({ dark = false }: Props) {
  const {
    status, taskTitle, secondsLeft, durationSeconds,
    start, complete, interrupt,
    startBreak, skipBreak, startNextFocus,
    phase, cycleCount, breakCountdown,
    error, clearError,
    todayPomodoros, loadToday,
  } = usePomodoroStore();
  const tasks = useBoardStore((s) => s.tasks);
  const [selectedTaskId, setSelectedTaskId] = usePomodoroCardTaskSelection();

  useEffect(() => { loadToday(); }, []);

  const isRunning = status === 'running';
  const isBreakPhase = phase === 'shortBreak' || phase === 'longBreak';
  const accent = isBreakPhase || phase === 'awaitingBreak' || phase === 'awaitingFocus'
    ? BREAK_ACCENT
    : FOCUS_ACCENT;

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
  };

  // Color palette
  const textPrimary = dark ? 'var(--bg)' : 'var(--ink)';
  const textMuted   = dark ? 'color-mix(in oklab, var(--bg) 55%, transparent)' : 'var(--ink-mute)';
  const textLabel   = dark ? 'color-mix(in oklab, var(--bg) 50%, transparent)' : 'var(--ink-mute)';
  const btnBg       = dark ? 'rgba(255,255,255,0.08)' : 'hsl(var(--muted))';
  const btnBorder   = dark ? 'rgba(255,255,255,0.06)' : 'hsl(var(--border))';
  const btnText     = dark ? 'var(--bg)' : 'var(--ink-soft)';
  const modeBg      = dark ? 'rgba(255,255,255,0.08)' : 'hsl(var(--muted))';
  const modeText    = dark ? 'color-mix(in oklab, var(--bg) 70%, transparent)' : 'var(--ink-mute)';

  // Round number: completed + 1 (current), reset after long break
  const roundDisplay = cycleCount + 1;
  const currentModeLabel = PHASE_MODE_LABEL[phase] ?? '专注';

  return (
    <div className="relative flex flex-col h-full p-6 gap-4" style={{ color: textPrimary }}>
      {/* Header: title + mode tabs (readonly) */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🍅</span>
          <span className="font-semibold text-[15px]">番茄钟</span>
          <span className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: textMuted }}>
            · 第 {roundDisplay} 颗
          </span>
        </div>
        {/* Mode tabs: readonly, follows phase */}
        <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: modeBg }}>
          {(['专注', '短休', '长休'] as const).map((m) => (
            <span
              key={m}
              className="px-3 py-1 text-xs rounded-md font-medium"
              style={m === currentModeLabel ? {
                background: accent,
                color: '#fff',
              } : {
                color: modeText,
              }}
            >
              {m}
            </span>
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
        {phase === 'focus' && isRunning && (
          <Ring progress={progress} accent={FOCUS_ACCENT}>
            <div className="font-mono text-4xl font-semibold leading-none" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '-0.04em', color: textPrimary }}>
              {formatTime(secondsLeft).split(':')[0]}
              <span className="blink" style={{ color: 'var(--brand)' }}>:</span>
              {formatTime(secondsLeft).split(':')[1]}
            </div>
            <div className="text-[11px] mt-1 truncate max-w-[120px]" style={{ fontFamily: 'var(--font-mono)', color: textMuted, letterSpacing: '0.02em' }}>
              {taskTitle || '自由专注'}
            </div>
          </Ring>
        )}

        {phase === 'focus' && !isRunning && (
          <Ring progress={0} accent={FOCUS_ACCENT}>
            <div className="font-mono text-4xl font-semibold leading-none" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '-0.04em', color: textPrimary }}>
              {formatTime(durationSeconds).split(':')[0]}
              <span style={{ color: 'var(--brand)' }}>:</span>
              {formatTime(durationSeconds).split(':')[1]}
            </div>
            <div className="text-[11px] mt-1" style={{ fontFamily: 'var(--font-mono)', color: textMuted, letterSpacing: '0.02em' }}>
              25:00 专注
            </div>
          </Ring>
        )}

        {phase === 'awaitingBreak' && (
          <Ring progress={0} accent={BREAK_ACCENT}>
            <div className="font-mono text-5xl font-semibold leading-none" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '-0.04em', color: BREAK_ACCENT }}>
              {breakCountdown}
            </div>
            <div className="text-[11px] mt-1" style={{ fontFamily: 'var(--font-mono)', color: textMuted }}>
              即将休息...
            </div>
          </Ring>
        )}

        {(phase === 'shortBreak' || phase === 'longBreak') && (
          <Ring progress={progress} accent={BREAK_ACCENT}>
            <div className="font-mono text-4xl font-semibold leading-none" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '-0.04em', color: textPrimary }}>
              {formatTime(secondsLeft).split(':')[0]}
              <span style={{ color: BREAK_ACCENT }}>:</span>
              {formatTime(secondsLeft).split(':')[1]}
            </div>
            <div className="text-[11px] mt-1" style={{ fontFamily: 'var(--font-mono)', color: textMuted }}>
              {phase === 'longBreak' ? '长休' : '短休'}中
            </div>
          </Ring>
        )}

        {phase === 'awaitingFocus' && (
          <Ring progress={1} accent={BREAK_ACCENT}>
            <div className="text-2xl mb-1">☕</div>
            <div className="text-[11px] text-center" style={{ fontFamily: 'var(--font-mono)', color: textMuted }}>
              休息结束
            </div>
            <div className="text-[11px] text-center mt-0.5" style={{ fontFamily: 'var(--font-mono)', color: textMuted }}>
              准备好了吗？
            </div>
          </Ring>
        )}

        {/* Side: metrics + controls */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          {/* Today pomodoros metric */}
          <div>
            <div className="text-[11px] uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-mono)', color: textLabel }}>
              今日番茄
            </div>
            <div className="text-xl font-semibold" style={{ fontFamily: 'var(--font-mono)', color: textPrimary, letterSpacing: '-0.02em' }}>
              {todayPomCount}{' '}
              <span className="text-sm font-normal" style={{ color: textMuted }}>颗</span>
            </div>
            <div className="mt-1.5">
              <TodayPips count={todayPoms} />
            </div>
          </div>

          {/* Focus duration metric */}
          <div>
            <div className="text-[11px] uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-mono)', color: textLabel }}>
              专注时长
            </div>
            <div className="text-xl font-semibold" style={{ fontFamily: 'var(--font-mono)', color: textPrimary, letterSpacing: '-0.02em' }}>
              {focusH > 0 && <>{focusH}<span className="text-sm font-normal" style={{ color: textMuted }}>h</span>{' '}</>}
              {focusM}<span className="text-sm font-normal" style={{ color: textMuted }}>m</span>
            </div>
            <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'hsl(var(--muted))' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (focusMin / (8 * 25)) * 100)}%`,
                  background: 'linear-gradient(90deg, var(--brand), color-mix(in oklab, var(--brand) 60%, #ffd76b))',
                }}
              />
            </div>
          </div>

          {/* Task selector: only when idle in focus phase */}
          {phase === 'focus' && !isRunning && (
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full text-xs rounded-lg px-2 py-1.5 outline-none cursor-pointer"
              style={{ background: btnBg, border: `1px solid ${btnBorder}`, color: textPrimary, fontFamily: 'var(--font-sans)' }}
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
            {/* Focus: running */}
            {phase === 'focus' && isRunning && (
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
              </>
            )}

            {/* Focus: idle */}
            {phase === 'focus' && !isRunning && (
              <button
                onClick={handleStart}
                className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-150"
                style={{ background: 'var(--brand)', color: '#fff', border: 'none' }}
              >
                开始专注
              </button>
            )}

            {/* Awaiting break: 5s countdown */}
            {phase === 'awaitingBreak' && (
              <>
                <button
                  onClick={() => startBreak()}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-150"
                  style={{ background: BREAK_ACCENT, color: '#fff', border: 'none' }}
                >
                  立即开始休息
                </button>
                <button
                  onClick={() => skipBreak()}
                  className="px-3 py-2 text-xs rounded-lg transition-all duration-150"
                  style={{ background: btnBg, color: btnText, border: `1px solid ${btnBorder}` }}
                >
                  跳过休息
                </button>
              </>
            )}

            {/* Break: running */}
            {(phase === 'shortBreak' || phase === 'longBreak') && (
              <button
                onClick={() => skipBreak()}
                className="flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-150"
                style={{ background: btnBg, color: btnText, border: `1px solid ${btnBorder}` }}
              >
                跳过休息
              </button>
            )}

            {/* Awaiting focus: user manually starts */}
            {phase === 'awaitingFocus' && (
              <button
                onClick={() => startNextFocus()}
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

```typescript
import { useState, useEffect } from 'react';
import { usePomodoroStore } from '../../store/pomodoroStore';
import { useBoardStore } from '../../store/boardStore';

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

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
        <circle cx="100" cy="100" r={R} stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
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
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

function TodayPips({ count }: { count: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className="flex-1 rounded-sm"
          style={{ height: 4, background: i < count ? 'var(--brand)' : 'rgba(255,255,255,0.1)' }}
        />
      ))}
    </div>
  );
}

interface Props {
  dark?: boolean;
}

const BREAK_ACCENT = '#52A8FF';

export function PomodoroCard({ dark = false }: Props) {
  const {
    status, taskTitle, secondsLeft, durationSeconds,
    start, complete, interrupt,
    startBreak, skipBreak, startNextFocus,
    phase, cycleCount, breakCountdown,
    error, clearError,
    todayPomodoros, loadToday,
  } = usePomodoroStore();
  const tasks = useBoardStore((s) => s.tasks);
  const [selectedTaskId, setSelectedTaskId] = useState('');

  useEffect(() => { loadToday(); }, []);

  const isRunning = status === 'running';
  const isBreakPhase = phase === 'shortBreak' || phase === 'longBreak';
  const accent = (isBreakPhase || phase === 'awaitingBreak' || phase === 'awaitingFocus')
    ? BREAK_ACCENT
    : 'var(--brand)';

  const progress = durationSeconds > 0 ? (durationSeconds - secondsLeft) / durationSeconds : 0;
  const todayPomCount = todayPomodoros.length;
  const todayPoms = Math.min(8, todayPomCount);
  const focusMin = Math.round(todayPomodoros.reduce((s, p) => s + p.durationSeconds, 0) / 60);
  const focusH = Math.floor(focusMin / 60);
  const focusM = focusMin % 60;

  const handleStart = () => {
    const task = tasks.find((t) => t.id === selectedTaskId);
    start(selectedTaskId || null, task?.title ?? '自由专注');
  };

  const textPrimary = dark ? 'var(--bg)' : 'var(--ink)';
  const textMuted   = dark ? 'color-mix(in oklab, var(--bg) 55%, transparent)' : 'var(--ink-mute)';
  const textLabel   = dark ? 'color-mix(in oklab, var(--bg) 50%, transparent)' : 'var(--ink-mute)';
  const btnBg       = dark ? 'rgba(255,255,255,0.08)' : 'hsl(var(--muted))';
  const btnBorder   = dark ? 'rgba(255,255,255,0.06)' : 'hsl(var(--border))';
  const btnText     = dark ? 'var(--bg)' : 'var(--ink-soft)';
  const modeBg      = dark ? 'rgba(255,255,255,0.08)' : 'hsl(var(--muted))';
  const modeText    = dark ? 'color-mix(in oklab, var(--bg) 70%, transparent)' : 'var(--ink-mute)';

  // Display "第 N 颗" — cycleCount is completed pomodoros this cycle
  const roundDisplay = cycleCount + 1;

  // Readonly mode tab follows phase
  const activeTab =
    phase === 'shortBreak' || phase === 'awaitingFocus' ? '短休'
    : phase === 'longBreak' ? '长休'
    : '专注';

  return (
    <div className="relative flex flex-col h-full p-6 gap-4" style={{ color: textPrimary }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🍅</span>
          <span className="font-semibold text-[15px]">番茄钟</span>
          <span className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: textMuted }}>
            · 第 {roundDisplay} 颗
          </span>
        </div>
        <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: modeBg }}>
          {(['专注', '短休', '长休'] as const).map((m) => (
            <span
              key={m}
              className="px-3 py-1 text-xs rounded-md font-medium"
              style={m === activeTab
                ? { background: accent, color: '#fff' }
                : { color: modeText }}
            >
              {m}
            </span>
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

      {/* Main */}
      <div className="flex gap-6 items-center flex-1 min-h-0">
        {/* Ring — one branch per phase */}
        {phase === 'focus' && isRunning && (
          <Ring progress={progress} accent="var(--brand)">
            <div className="font-mono text-4xl font-semibold leading-none"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '-0.04em', color: textPrimary }}>
              {formatTime(secondsLeft).split(':')[0]}
              <span className="blink" style={{ color: 'var(--brand)' }}>:</span>
              {formatTime(secondsLeft).split(':')[1]}
            </div>
            <div className="text-[11px] mt-1 truncate max-w-[120px]"
              style={{ fontFamily: 'var(--font-mono)', color: textMuted, letterSpacing: '0.02em' }}>
              {taskTitle || '自由专注'}
            </div>
          </Ring>
        )}

        {phase === 'focus' && !isRunning && (
          <Ring progress={0} accent="var(--brand)">
            <div className="font-mono text-4xl font-semibold leading-none"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '-0.04em', color: textPrimary }}>
              {formatTime(durationSeconds).split(':')[0]}
              <span style={{ color: 'var(--brand)' }}>:</span>
              {formatTime(durationSeconds).split(':')[1]}
            </div>
            <div className="text-[11px] mt-1"
              style={{ fontFamily: 'var(--font-mono)', color: textMuted, letterSpacing: '0.02em' }}>
              25:00 专注
            </div>
          </Ring>
        )}

        {phase === 'awaitingBreak' && (
          <Ring progress={0} accent={BREAK_ACCENT}>
            <div className="font-mono text-5xl font-bold leading-none"
              style={{ fontFamily: 'var(--font-mono)', color: BREAK_ACCENT }}>
              {breakCountdown}
            </div>
            <div className="text-[11px] mt-1.5"
              style={{ fontFamily: 'var(--font-mono)', color: textMuted }}>
              即将休息...
            </div>
          </Ring>
        )}

        {(phase === 'shortBreak' || phase === 'longBreak') && (
          <Ring progress={progress} accent={BREAK_ACCENT}>
            <div className="font-mono text-4xl font-semibold leading-none"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '-0.04em', color: textPrimary }}>
              {formatTime(secondsLeft).split(':')[0]}
              <span style={{ color: BREAK_ACCENT }}>:</span>
              {formatTime(secondsLeft).split(':')[1]}
            </div>
            <div className="text-[11px] mt-1"
              style={{ fontFamily: 'var(--font-mono)', color: textMuted }}>
              {phase === 'longBreak' ? '长休中' : '短休中'}
            </div>
          </Ring>
        )}

        {phase === 'awaitingFocus' && (
          <Ring progress={1} accent={BREAK_ACCENT}>
            <div className="text-2xl mb-1">☕</div>
            <div className="text-[11px]" style={{ fontFamily: 'var(--font-mono)', color: textMuted }}>
              休息结束
            </div>
            <div className="text-[11px] mt-0.5" style={{ fontFamily: 'var(--font-mono)', color: textMuted }}>
              准备好了吗？
            </div>
          </Ring>
        )}

        {/* Side metrics + controls */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <div>
            <div className="text-[11px] uppercase tracking-wider mb-1"
              style={{ fontFamily: 'var(--font-mono)', color: textLabel }}>
              今日番茄
            </div>
            <div className="text-xl font-semibold"
              style={{ fontFamily: 'var(--font-mono)', color: textPrimary, letterSpacing: '-0.02em' }}>
              {todayPomCount}{' '}
              <span className="text-sm font-normal" style={{ color: textMuted }}>颗</span>
            </div>
            <div className="mt-1.5"><TodayPips count={todayPoms} /></div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider mb-1"
              style={{ fontFamily: 'var(--font-mono)', color: textLabel }}>
              专注时长
            </div>
            <div className="text-xl font-semibold"
              style={{ fontFamily: 'var(--font-mono)', color: textPrimary, letterSpacing: '-0.02em' }}>
              {focusH > 0 && <>{focusH}<span className="text-sm font-normal" style={{ color: textMuted }}>h</span>{' '}</>}
              {focusM}<span className="text-sm font-normal" style={{ color: textMuted }}>m</span>
            </div>
            <div className="mt-1.5 h-1 rounded-full overflow-hidden"
              style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'hsl(var(--muted))' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (focusMin / (8 * 25)) * 100)}%`,
                  background: 'linear-gradient(90deg, var(--brand), color-mix(in oklab, var(--brand) 60%, #ffd76b))',
                }}
              />
            </div>
          </div>

          {/* Task selector: only on focus idle */}
          {phase === 'focus' && !isRunning && (
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full text-xs rounded-lg px-2 py-1.5 outline-none cursor-pointer"
              style={{ background: btnBg, border: `1px solid ${btnBorder}`, color: textPrimary }}
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
            {phase === 'focus' && isRunning && (
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
              </>
            )}

            {phase === 'focus' && !isRunning && (
              <button
                onClick={handleStart}
                className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-150"
                style={{ background: 'var(--brand)', color: '#fff', border: 'none' }}
              >
                开始专注
              </button>
            )}

            {phase === 'awaitingBreak' && (
              <>
                <button
                  onClick={() => startBreak()}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-150"
                  style={{ background: BREAK_ACCENT, color: '#fff', border: 'none' }}
                >
                  立即开始休息
                </button>
                <button
                  onClick={() => skipBreak()}
                  className="px-3 py-2 text-xs rounded-lg transition-all duration-150"
                  style={{ background: btnBg, color: btnText, border: `1px solid ${btnBorder}` }}
                >
                  跳过
                </button>
              </>
            )}

            {(phase === 'shortBreak' || phase === 'longBreak') && (
              <button
                onClick={() => skipBreak()}
                className="flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-150"
                style={{ background: btnBg, color: btnText, border: `1px solid ${btnBorder}` }}
              >
                跳过休息
              </button>
            )}

            {phase === 'awaitingFocus' && (
              <button
                onClick={() => startNextFocus()}
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
```

- [ ] **Step 2: 类型检查**

```bash
cd /Users/qq/Documents/Claude/GTDProject/gtd-app/client && npx tsc --noEmit 2>&1 | head -40
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add client/src/components/board/PomodoroCard.tsx
git commit -m "feat: update PomodoroCard to render phase-aware ring and controls"
```

---

### Task 5: 更新 `PomodoroBar.tsx`

**Files:**
- Modify: `client/src/components/pomodoro/PomodoroBar.tsx`

- [ ] **Step 1: 替换文件内容**

用以下完整内容替换 `client/src/components/pomodoro/PomodoroBar.tsx`：

```typescript
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
    error ||
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
          <span className="text-sm font-medium flex-1 text-foreground">专注结束！休息将在 {breakCountdown}s 后开始</span>
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
```

- [ ] **Step 2: 类型检查**

```bash
cd /Users/qq/Documents/Claude/GTDProject/gtd-app/client && npx tsc --noEmit 2>&1 | head -40
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add client/src/components/pomodoro/PomodoroBar.tsx
git commit -m "feat: update PomodoroBar to show break phases and awaiting states"
```

---

### Task 6: 集成验证

**Files:** 无新改动，浏览器验证

- [ ] **Step 1: 启动开发服务**

```bash
cd /Users/qq/Documents/Claude/GTDProject/gtd-app && npm run dev
```

打开 `http://localhost:5173/board`

- [ ] **Step 2: 验证专注→休息循环**

1. 在 PomodoroCard 点"开始专注"，等待约 3 秒后（或临时在 store 里将 `durationSeconds` 设短）
2. 确认：圆环切换为蓝色，显示 5→4→3…倒计时
3. 倒计时归零后，短休自动开始，蓝色圆环倒计时
4. 点"跳过休息"，进入 awaitingFocus 界面（☕ + "准备好了吗？"）
5. 点"开始专注"，回到专注状态

- [ ] **Step 3: 验证通知（需要浏览器允许通知）**

1. 首次专注开始时浏览器请求通知权限
2. 专注自然结束（或 skip 触发）后，弹出系统通知 + 听到提示音
3. 休息结束后同样触发通知 + 提示音

- [ ] **Step 4: 验证 cycleCount（4 颗后长休）**

1. 完成 4 颗番茄（可临时将 pomodoroDuration 设为 10 秒）
2. 第 4 颗后进入 awaitingBreak，休息开始后应为"长休"（15min）
3. 完成后 cycleCount 重置为 0，"第 X 颗"显示回到 1

- [ ] **Step 5: 验证 PomodoroBar（非 Board 页）**

切换到 `/calendar` 或 `/projects`，开始专注，确认底部悬浮条显示正确状态和按钮

- [ ] **Step 6: 验证刷新持久化**

在休息阶段刷新浏览器，确认还原到正确状态（而非回到 idle）

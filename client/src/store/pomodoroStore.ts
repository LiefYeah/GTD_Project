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
  pomId: string | null;
  taskId: string | null;
  taskTitle: string;
  durationSeconds: number;
  startedAt: number | null;
  phase: Phase;
  cycleCount: number;
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

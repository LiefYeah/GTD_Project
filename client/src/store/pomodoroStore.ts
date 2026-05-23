import { create } from 'zustand';
import * as api from '../api/client';
import { useBoardStore } from './boardStore';
import { useSettingsStore } from './settingsStore';
import type { Pomodoro } from '../types';

type TimerStatus = 'idle' | 'running';

const SESSION_KEY = 'gtd-pomodoro-session';

interface PersistedSession {
  pomId: string;
  taskId: string | null;
  taskTitle: string;
  durationSeconds: number;
  startedAt: number;
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
    const elapsed = Math.floor((Date.now() - s.startedAt) / 1000);
    const secondsLeft = Math.max(0, s.durationSeconds - elapsed);
    if (secondsLeft <= 0) { clearSession(); return {}; }
    return {
      pomId: s.pomId,
      taskId: s.taskId,
      taskTitle: s.taskTitle,
      durationSeconds: s.durationSeconds,
      secondsLeft,
      status: 'running',
    };
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
  error: string | null;
  todayPomodoros: Pomodoro[];

  /** taskId=null starts a free (no-task) pomodoro */
  start: (taskId: string | null, taskTitle: string, durationSeconds?: number) => Promise<void>;
  complete: () => Promise<void>;
  interrupt: () => Promise<void>;
  tick: () => void;
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
      saveSession({ pomId: pom.id, taskId, taskTitle, durationSeconds, startedAt });
      set({
        pomId: pom.id,
        taskId,
        taskTitle,
        durationSeconds,
        secondsLeft: durationSeconds,
        status: 'running',
        error: null,
      });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  complete: async () => {
    const { pomId, taskId } = get();
    if (!pomId) return;
    clearSession();
    set({ status: 'idle', pomId: null, taskId: null, taskTitle: '' });
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
    set({ status: 'idle', pomId: null, taskId: null, taskTitle: '' });
    try {
      await api.interruptPomodoro(pomId);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  tick: () => {
    set((s) => ({ secondsLeft: Math.max(0, s.secondsLeft - 1) }));
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

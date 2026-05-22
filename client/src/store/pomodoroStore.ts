import { create } from 'zustand';
import * as api from '../api/client';
import { useBoardStore } from './boardStore';

type TimerStatus = 'idle' | 'running';

interface PomodoroState {
  pomId: string | null;
  taskId: string | null;
  taskTitle: string;
  durationSeconds: number;
  secondsLeft: number;
  status: TimerStatus;
  error: string | null;

  start: (taskId: string, taskTitle: string, durationSeconds?: number) => Promise<void>;
  complete: () => Promise<void>;
  interrupt: () => Promise<void>;
  tick: () => void;
  clearError: () => void;
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  pomId: null,
  taskId: null,
  taskTitle: '',
  durationSeconds: 1500,
  secondsLeft: 1500,
  status: 'idle',
  error: null,

  start: async (taskId, taskTitle, durationSeconds = 1500) => {
    const { pomId } = get();
    if (pomId) await get().interrupt();
    try {
      const pom = await api.startPomodoro(taskId, durationSeconds);
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
    const { pomId } = get();
    if (!pomId) return;
    set({ status: 'idle', pomId: null, taskId: null, taskTitle: '' });
    try {
      await api.completePomodoro(pomId);
      useBoardStore.getState().load();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  interrupt: async () => {
    const { pomId } = get();
    if (!pomId) return;
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
}));

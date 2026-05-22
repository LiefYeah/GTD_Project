import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  pomodoroDuration: number; // seconds
  shortBreak: number;       // seconds
  longBreak: number;        // seconds

  setPomodoroDuration: (s: number) => void;
  setShortBreak: (s: number) => void;
  setLongBreak: (s: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      pomodoroDuration: 1500,
      shortBreak: 300,
      longBreak: 900,

      setPomodoroDuration: (s) => set({ pomodoroDuration: s }),
      setShortBreak: (s) => set({ shortBreak: s }),
      setLongBreak: (s) => set({ longBreak: s }),
    }),
    {
      name: 'gtd-settings',
    },
  ),
);

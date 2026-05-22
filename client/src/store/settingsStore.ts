import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  pomodoroDuration: number; // seconds
  shortBreak: number;       // seconds
  longBreak: number;        // seconds
  theme: 'light' | 'dark';

  setPomodoroDuration: (s: number) => void;
  setShortBreak: (s: number) => void;
  setLongBreak: (s: number) => void;
  toggleTheme: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      pomodoroDuration: 1500,
      shortBreak: 300,
      longBreak: 900,
      theme: 'light',

      setPomodoroDuration: (s) => set({ pomodoroDuration: s }),
      setShortBreak: (s) => set({ shortBreak: s }),
      setLongBreak: (s) => set({ longBreak: s }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
    }),
    {
      name: 'gtd-settings',
    },
  ),
);

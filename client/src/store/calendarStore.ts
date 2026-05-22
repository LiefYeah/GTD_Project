import { create } from 'zustand';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay,
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
} from 'date-fns';
import * as api from '../api/client';
import type { Task, Pomodoro } from '../types';

export type CalendarView = 'month' | 'week' | 'day';

interface CalendarState {
  view: CalendarView;
  currentDate: Date;
  tasks: Task[];
  pomodoros: Pomodoro[];
  isLoading: boolean;
  error: string | null;

  setView: (view: CalendarView) => void;
  setCurrentDate: (date: Date) => void;
  navigate: (direction: -1 | 1) => void;
  goToday: () => void;
  load: () => Promise<void>;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  view: 'month',
  currentDate: new Date(),
  tasks: [],
  pomodoros: [],
  isLoading: false,
  error: null,

  setView: (view) => set({ view }),
  setCurrentDate: (date) => set({ currentDate: date }),

  navigate: (dir) => {
    const { view, currentDate } = get();
    let next: Date;
    if (view === 'month') next = dir === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1);
    else if (view === 'week') next = dir === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1);
    else next = dir === 1 ? addDays(currentDate, 1) : subDays(currentDate, 1);
    set({ currentDate: next });
  },

  goToday: () => set({ currentDate: new Date() }),

  load: async () => {
    const { view, currentDate } = get();
    let start: Date, end: Date;

    if (view === 'month') {
      start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
      end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    } else if (view === 'week') {
      start = startOfWeek(currentDate, { weekStartsOn: 1 });
      end = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else {
      start = startOfDay(currentDate);
      end = endOfDay(currentDate);
    }

    set({ isLoading: true, error: null });
    try {
      const data = await api.getCalendar(start.getTime(), end.getTime());
      set({ tasks: data.tasks, pomodoros: data.pomodoros, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },
}));

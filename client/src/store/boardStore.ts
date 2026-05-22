import { create } from 'zustand';
import * as api from '../api/client';
import type { Task, Project, TaskStatus } from '../types';

interface BoardState {
  tasks: Task[];
  projects: Project[];
  projectFilter: string | null;
  selectedTask: Task | null;
  isLoading: boolean;
  error: string | null;

  load: () => Promise<void>;
  setProjectFilter: (id: string | null) => void;
  setSelectedTask: (task: Task | null) => void;
  clearError: () => void;

  addTask: (title: string, status: TaskStatus, projectId?: string) => Promise<void>;
  patchTask: (id: string, data: Parameters<typeof api.updateTask>[1]) => Promise<void>;
  moveTask: (id: string, newStatus: TaskStatus, newSortOrder: number) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  tasks: [],
  projects: [],
  projectFilter: null,
  selectedTask: null,
  isLoading: false,
  error: null,

  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const [tasks, projects] = await Promise.all([api.getTasks(), api.getProjects()]);
      set({ tasks, projects, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  setProjectFilter: (id) => set({ projectFilter: id }),
  setSelectedTask: (task) => set({ selectedTask: task }),
  clearError: () => set({ error: null }),

  addTask: async (title, status, projectId) => {
    try {
      const task = await api.createTask({ title, status, project_id: projectId });
      set((s) => ({ tasks: [...s.tasks, task] }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  patchTask: async (id, data) => {
    const mapped = {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status !== undefined && { status: data.status as TaskStatus }),
      ...(data.project_id !== undefined && { projectId: data.project_id }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.sort_order !== undefined && { sortOrder: data.sort_order }),
      ...(data.due_date !== undefined && { dueDate: data.due_date }),
      ...(data.scheduled_start !== undefined && { scheduledStart: data.scheduled_start }),
      ...(data.scheduled_end !== undefined && { scheduledEnd: data.scheduled_end }),
      ...(data.estimated_pomodoros !== undefined && { estimatedPomodoros: data.estimated_pomodoros }),
    };
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...mapped } : t)),
      selectedTask: s.selectedTask?.id === id ? { ...s.selectedTask, ...mapped } : s.selectedTask,
    }));
    try {
      const updated = await api.updateTask(id, data);
      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === id ? updated : t)),
        selectedTask: s.selectedTask?.id === id ? updated : s.selectedTask,
      }));
    } catch (e) {
      set({ error: String(e) });
      get().load();
    }
  },

  moveTask: async (id, newStatus, newSortOrder) => {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, status: newStatus, sortOrder: newSortOrder } : t,
      ),
    }));
    try {
      await api.updateTask(id, { status: newStatus, sort_order: newSortOrder });
    } catch (e) {
      set({ error: String(e) });
      get().load();
    }
  },

  removeTask: async (id) => {
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id),
      selectedTask: s.selectedTask?.id === id ? null : s.selectedTask,
    }));
    try {
      await api.deleteTask(id);
    } catch (e) {
      set({ error: String(e) });
      get().load();
    }
  },
}));

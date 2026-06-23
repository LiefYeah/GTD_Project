import type { Task, Project, Pomodoro, RecurringRule, PublicHoliday } from '../types';

const BASE = '/api';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, init);
  if (!r.ok) {
    const body = await r.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(body?.error?.message ?? `HTTP ${r.status}`);
  }
  return r.json() as Promise<T>;
}

export const getProjects = () => req<Project[]>('/projects');

export const getTasks = () => req<Task[]>('/tasks');

export const createTask = (data: {
  title: string;
  status?: string;
  project_id?: string;
  description?: string;
  estimated_pomodoros?: number;
  due_date?: number;
  sort_order?: number;
}) =>
  req<Task>('/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const updateTask = (
  id: string,
  data: {
    title?: string;
    description?: string | null;
    status?: string;
    project_id?: string | null;
    priority?: number;
    sort_order?: number;
    due_date?: number | null;
    scheduled_start?: number | null;
    scheduled_end?: number | null;
    estimated_pomodoros?: number | null;
  },
) =>
  req<Task>(`/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const deleteTask = (id: string) =>
  req<{ success: boolean }>(`/tasks/${id}`, { method: 'DELETE' });

export const startPomodoro = (taskId: string | null, durationSeconds = 1500) =>
  req<Pomodoro>('/pomodoros', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId ?? null, duration_seconds: durationSeconds }),
  });

export const completePomodoro = (id: string, notes?: string) =>
  req<Pomodoro>(`/pomodoros/${id}/complete`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });

export const interruptPomodoro = (id: string, notes?: string) =>
  req<Pomodoro>(`/pomodoros/${id}/interrupt`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });

export const getCalendar = (start: number, end: number) =>
  req<{ tasks: Task[]; pomodoros: Pomodoro[] }>(`/calendar?start=${start}&end=${end}`);

export const createProject = (data: { name: string; description?: string; color?: string }) =>
  req<Project>('/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const updateProject = (
  id: string,
  data: { name?: string; description?: string | null; color?: string | null },
) =>
  req<Project>(`/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const archiveProject = (id: string) =>
  req<{ success: boolean }>(`/projects/${id}`, { method: 'DELETE' });

export const reactivateProject = (id: string) =>
  req<import('../types').Project>(`/projects/${id}/reactivate`, { method: 'POST' });

export const getAllPomodoros = () => req<Pomodoro[]>('/pomodoros');

export const getTodayPomodoros = () => req<Pomodoro[]>('/pomodoros/today');

export interface ImportResult {
  imported: { projects: number; tasks: number; pomodoros: number };
  skipped: { projects: number; tasks: number; pomodoros: number };
}

export const importData = (data: unknown) =>
  req<ImportResult>('/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

// ── Recurring Rules ────────────────────────────────────────────────────────

export interface CreateRecurringRuleData {
  title: string;
  description?: string | null;
  project_id?: string | null;
  estimated_pomodoros?: number | null;
  recurrence_type: string;
  recurrence_days?: string | null;
  start_date: string;
  end_date?: string | null;
  last_generated_date?: string; // pass today's ISO date when enabling on an existing task
}

export interface UpdateRecurringRuleData {
  title?: string;
  description?: string | null;
  project_id?: string | null;
  estimated_pomodoros?: number | null;
  recurrence_type?: string;
  recurrence_days?: string | null;
  start_date?: string;
  end_date?: string | null;
}

export const getRecurringRules = () => req<RecurringRule[]>('/recurring');

export const createRecurringRule = (data: CreateRecurringRuleData) =>
  req<RecurringRule>('/recurring', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const updateRecurringRule = (id: string, data: UpdateRecurringRuleData) =>
  req<RecurringRule>(`/recurring/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const deleteRecurringRule = (id: string) =>
  req<{ success: boolean }>(`/recurring/${id}`, { method: 'DELETE' });

export const generateRecurringTasks = () =>
  req<{ generated: number; skipped_stale: number; rules_processed: number }>(
    '/recurring/generate', { method: 'POST' }
  );

// ── Holidays ───────────────────────────────────────────────────────────────

export const getHolidays = (year: number) =>
  req<PublicHoliday[]>(`/holidays?year=${year}`);

export const createHoliday = (data: { date: string; name: string }) =>
  req<PublicHoliday>('/holidays', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const deleteHoliday = (id: number) =>
  req<{ success: boolean }>(`/holidays/${id}`, { method: 'DELETE' });

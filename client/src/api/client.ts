import type { Task, Project } from '../types';

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

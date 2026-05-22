export type TaskStatus = 'planned' | 'in_progress' | 'on_hold' | 'done';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  createdAt: number;
  updatedAt: number;
  archived: number;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  projectId: string | null;
  status: TaskStatus;
  priority: number;
  sortOrder: number;
  dueDate: number | null;
  scheduledStart: number | null;
  scheduledEnd: number | null;
  allDay: number;
  estimatedPomodoros: number | null;
  completedPomodoros: number;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

export const COLUMN_IDS: TaskStatus[] = ['planned', 'in_progress', 'on_hold', 'done'];

export const COLUMN_META: Record<TaskStatus, { label: string; icon: string }> = {
  planned: { label: '计划', icon: '📋' },
  in_progress: { label: '进行中', icon: '🔥' },
  on_hold: { label: '搁置', icon: '⏸' },
  done: { label: '已完成', icon: '✅' },
};

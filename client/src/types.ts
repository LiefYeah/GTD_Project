export type TaskStatus = 'planned' | 'in_progress' | 'on_hold' | 'done';
export type RecurrenceType = 'daily' | 'weekdays' | 'non_workdays' | 'custom_days';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  createdAt: number;
  updatedAt: number;
  archived: number;
}

export interface RecurringRule {
  id: string;
  title: string;
  description: string | null;
  projectId: string | null;
  estimatedPomodoros: number | null;
  recurrenceType: RecurrenceType;
  recurrenceDays: string | null; // JSON '[1,3,5]'
  startDate: string;             // ISO date '2026-06-23'
  endDate: string | null;        // ISO date, null = no end
  lastGeneratedDate: string;     // ISO date
  createdAt: number;
  updatedAt: number;
}

export interface PublicHoliday {
  id: number;
  date: string;
  name: string;
  year: number;
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
  recurringRuleId: string | null;
}

export const COLUMN_IDS: TaskStatus[] = ['planned', 'in_progress', 'on_hold', 'done'];

export interface Pomodoro {
  id: string;
  taskId: string;
  startedAt: number;
  endedAt: number | null;
  durationSeconds: number;
  status: 'running' | 'completed' | 'interrupted';
  notes: string | null;
}

export const COLUMN_META: Record<TaskStatus, { label: string; icon: string }> = {
  planned: { label: '计划', icon: '📋' },
  in_progress: { label: '进行中', icon: '🔥' },
  on_hold: { label: '搁置', icon: '⏸' },
  done: { label: '已完成', icon: '✅' },
};

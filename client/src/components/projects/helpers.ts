import type { Project, Task, TaskStatus } from '../../types';

/* ── CSS variable helper ── */
export type CSSVars = React.CSSProperties & { [k: `--${string}`]: string | number };

/* ── Constants ── */
export const PROJECT_ICONS = ['◉', '◎', '✦', '✱', '▲', '■', '●', '♢', '✚', '❀'];

export const PROJECT_COLORS = [
  '#2563EB', '#F59E0B', '#64748B', '#10B981', '#FF5C3A', '#7C3AED',
];

export const COLOR_NAMES = ['蓝', '琥珀', '石', '翠', '番茄', '紫'];

export const STATUS_DEFS: { key: TaskStatus; label: string; accent: string }[] = [
  { key: 'planned',     label: '计划',   accent: 'var(--c-plan)'  },
  { key: 'in_progress', label: '进行中', accent: 'var(--c-doing)' },
  { key: 'on_hold',     label: '搁置',   accent: 'var(--c-hold)'  },
  { key: 'done',        label: '已完成', accent: 'var(--c-done)'  },
];

/* ── Shared types ── */
export interface ProjectStats {
  byStatus: Record<TaskStatus, number>;
  total: number;
  done: number;
  pct: number;
  nextDue: string | null;
  tomatoes: number;
}

export interface TaskDraft {
  title: string;
  projectId: string;
  status: TaskStatus;
  dueDate: string; // "YYYY-MM-DD"
  estimatedPomodoros: number;
  completedPomodoros: number;
  description: string;
}

export interface ProjectDraft {
  name: string;
  description: string;
  color: string;
  icon: string;
}

/* ── Icon persistence ── */
const ICON_STORE_KEY = 'gtd_project_icons_v1';

export function loadIconOverrides(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(ICON_STORE_KEY) ?? '{}'); }
  catch { return {}; }
}

export function saveIconOverride(
  id: string,
  icon: string,
  prev: Record<string, string>,
): Record<string, string> {
  const next = { ...prev, [id]: icon };
  localStorage.setItem(ICON_STORE_KEY, JSON.stringify(next));
  return next;
}

export function getIcon(id: string, overrides: Record<string, string>): string {
  return overrides[id] ??
    PROJECT_ICONS[id.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % PROJECT_ICONS.length];
}

/* ── Date helpers ── */
export function formatDue(ts: number | null | undefined): string | null {
  if (!ts) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(ts); due.setHours(0, 0, 0, 0);
  const diff  = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  if (diff < 0)  return `逾期 ${-diff} 天`;
  return `${new Date(ts).getMonth() + 1}/${new Date(ts).getDate()}`;
}

export function isDueToday(ts: number | null | undefined): boolean {
  if (!ts) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(ts); due.setHours(0, 0, 0, 0);
  return due.getTime() === today.getTime();
}

export function isOverdue(ts: number | null | undefined): boolean {
  if (!ts) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return ts < today.getTime();
}

export function tsToDateStr(ts: number | null | undefined): string {
  if (!ts) return '';
  return new Date(ts).toISOString().slice(0, 10);
}

export function dateStrToTs(s: string): number | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.getTime();
}

/* ── Stats ── */
export function computeStats(project: Project, tasks: Task[]): ProjectStats {
  const pts = tasks.filter(t => t.projectId === project.id);
  const byStatus: Record<TaskStatus, number> = { planned: 0, in_progress: 0, on_hold: 0, done: 0 };
  for (const t of pts) byStatus[t.status]++;
  const total = pts.length;
  const done  = byStatus.done;
  const pct   = total ? Math.round((done / total) * 100) : 0;
  const pending = pts
    .filter(t => t.dueDate && t.status !== 'done')
    .sort((a, b) => (a.dueDate ?? 0) - (b.dueDate ?? 0));
  const nextDue  = pending.length > 0 ? formatDue(pending[0].dueDate) : null;
  const tomatoes = pts.reduce((s, t) => s + t.completedPomodoros, 0);
  return { byStatus, total, done, pct, nextDue, tomatoes };
}

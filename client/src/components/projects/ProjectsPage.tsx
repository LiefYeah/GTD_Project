import { useState, useMemo, useEffect, useRef } from 'react';
import * as api from '../../api/client';
import { useBoardStore } from '../../store/boardStore';
import type { Project, Task, TaskStatus } from '../../types';
import './projects.css';

/* ── CSS variable helper ── */
type CSSVars = React.CSSProperties & { [k: `--${string}`]: string | number };

/* ── Constants ── */
const PROJECT_ICONS = ['◉', '◎', '✦', '✱', '▲', '■', '●', '♢', '✚', '❀'];
const PROJECT_COLORS = [
  '#2563EB', '#F59E0B', '#64748B', '#10B981', '#FF5C3A', '#7C3AED',
];
const COLOR_NAMES = ['蓝', '琥珀', '石', '翠', '番茄', '紫'];

const STATUS_DEFS: { key: TaskStatus; label: string; accent: string }[] = [
  { key: 'planned',     label: '计划',   accent: 'var(--c-plan)'  },
  { key: 'in_progress', label: '进行中', accent: 'var(--c-doing)' },
  { key: 'on_hold',     label: '搁置',   accent: 'var(--c-hold)'  },
  { key: 'done',        label: '已完成', accent: 'var(--c-done)'  },
];

/* ── Helpers ── */
const ICON_STORE_KEY = 'gtd_project_icons_v1';

function loadIconOverrides(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(ICON_STORE_KEY) ?? '{}'); }
  catch { return {}; }
}

function saveIconOverride(id: string, icon: string, prev: Record<string, string>) {
  const next = { ...prev, [id]: icon };
  localStorage.setItem(ICON_STORE_KEY, JSON.stringify(next));
  return next;
}

function getIcon(id: string, overrides: Record<string, string>): string {
  return overrides[id] ?? PROJECT_ICONS[id.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % PROJECT_ICONS.length];
}

function formatDue(ts: number | null | undefined): string | null {
  if (!ts) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(ts); due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  if (diff < 0) return `逾期 ${-diff} 天`;
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function isDueToday(ts: number | null | undefined): boolean {
  if (!ts) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(ts); due.setHours(0, 0, 0, 0);
  return due.getTime() === today.getTime();
}

function isOverdue(ts: number | null | undefined): boolean {
  if (!ts) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return ts < today.getTime();
}

function tsToDateStr(ts: number | null | undefined): string {
  if (!ts) return '';
  return new Date(ts).toISOString().slice(0, 10);
}

function dateStrToTs(s: string): number | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.getTime();
}

interface ProjectStats {
  byStatus: Record<TaskStatus, number>;
  total: number;
  done: number;
  pct: number;
  nextDue: string | null;
  tomatoes: number;
}

function computeStats(project: Project, tasks: Task[]): ProjectStats {
  const pts = tasks.filter(t => t.projectId === project.id);
  const byStatus: Record<TaskStatus, number> = { planned: 0, in_progress: 0, on_hold: 0, done: 0 };
  for (const t of pts) byStatus[t.status]++;
  const total = pts.length;
  const done = byStatus.done;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const pending = pts
    .filter(t => t.dueDate && t.status !== 'done')
    .sort((a, b) => (a.dueDate ?? 0) - (b.dueDate ?? 0));
  const nextDue = pending.length > 0 ? formatDue(pending[0].dueDate) : null;
  const tomatoes = pts.reduce((s, t) => s + t.completedPomodoros, 0);
  return { byStatus, total, done, pct, nextDue, tomatoes };
}

/* ── StatCard ── */
function StatCard({ label, value, sub, accent, glyph }: {
  label: string; value: string | number; sub: string; accent: string; glyph: string;
}) {
  return (
    <div className="stat-card" style={{ '--sc-accent': accent } as CSSVars}>
      <div className="stat-card__glyph">{glyph}</div>
      <div>
        <div className="stat-card__label">{label}</div>
        <div className="stat-card__value">{value}</div>
        <div className="stat-card__sub">{sub}</div>
      </div>
    </div>
  );
}

/* ── Tomato display ── */
function TomatoPips({ done, total }: { done: number; total: number }) {
  if (total === 0) return null;
  if (total > 8) {
    return (
      <div className="tomato-track">
        <span style={{ fontSize: 12 }}>🍅</span>
        <span className="tomato-count">× {done}/{total}</span>
      </div>
    );
  }
  return (
    <div className="tomato-track">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`tomato-pip ${i < done ? 'is-done' : ''}`} />
      ))}
      {total > 0 && <span className="tomato-count">{done}/{total}</span>}
    </div>
  );
}

/* ── ProjectCard ── */
function ProjectCard({ project, stats, icon, onOpen, onEdit, onDelete }: {
  project: Project; stats: ProjectStats; icon: string;
  onOpen: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const color = project.color ?? '#6366f1';
  return (
    <div className="pc" style={{ '--accent': color } as CSSVars} onClick={onOpen}>
      <div className="pc__bar" />
      <div className="pc__top">
        <div className="pc__icon">{icon}</div>
        <div className="pc__head">
          <div className="pc__name">{project.name}</div>
          {project.description && <div className="pc__desc">{project.description}</div>}
        </div>
        <div className="pc__actions" onClick={e => e.stopPropagation()}>
          <button className="pj-icon-btn pj-icon-btn--sm" title="编辑" onClick={onEdit}>✎</button>
          <button className="pj-icon-btn pj-icon-btn--sm" title="删除" onClick={onDelete}>⌫</button>
        </div>
      </div>

      <div className="pc__pills">
        {STATUS_DEFS.map(s => (
          <span key={s.key} className="pc-pill" style={{ '--c': s.accent } as CSSVars}>
            <span className="pc-pill__dot" />
            <span className="pc-pill__l">{s.label}</span>
            <span className="pc-pill__n">{stats.byStatus[s.key]}</span>
          </span>
        ))}
      </div>

      <div className="pc__progress">
        <div className="pc__progress-bar"><span style={{ width: `${stats.pct}%` }} /></div>
        <div className="pc__progress-meta">
          <span className="pc__meta-l">{stats.done} / {stats.total} 任务</span>
          <span className="pc__pct">{stats.pct}%</span>
        </div>
      </div>

      <div className="pc__foot">
        <div className="pc__foot-l">
          {stats.nextDue
            ? <span className="pc-chip"><span>⏰</span><span>下一截止 · {stats.nextDue}</span></span>
            : <span className="pc__meta">暂无待办截止</span>}
          {stats.tomatoes > 0 &&
            <span className="pc-chip pc-chip--tomato">🍅 <span>{stats.tomatoes} 颗已收</span></span>}
        </div>
        <button className="pc__open" onClick={e => { e.stopPropagation(); onOpen(); }}>
          打开 <span>→</span>
        </button>
      </div>
    </div>
  );
}

/* ── ProjectsView ── */
function ProjectsView({ projects, tasks, icons, onOpenProject, onNewProject, onEditProject, onDeleteProject }: {
  projects: Project[]; tasks: Task[]; icons: Record<string, string>;
  onOpenProject: (id: string) => void; onNewProject: () => void;
  onEditProject: (p: Project) => void; onDeleteProject: (id: string) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [q, setQ] = useState('');

  const allStats = useMemo(() => projects.map(p => ({ p, s: computeStats(p, tasks) })), [projects, tasks]);

  const overall = useMemo(() => {
    const totalTasks = allStats.reduce((s, x) => s + x.s.total, 0);
    const doneTasks  = allStats.reduce((s, x) => s + x.s.done, 0);
    const avg = projects.length ? Math.round(allStats.reduce((s, x) => s + x.s.pct, 0) / projects.length) : 0;
    return { totalTasks, doneTasks, pending: totalTasks - doneTasks, avg };
  }, [allStats, projects.length]);

  const filtered = allStats.filter(({ p }) => {
    if (filter === 'archived' && !p.archived) return false;
    if (filter === 'active' && p.archived) return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <section className="pv">
      <header className="pv__hero">
        <div className="pv__hero-l">
          <div className="pv__eyebrow">
            <span className="hero__dot" />
            <span>PROJECT SPACE · {projects.length} ACTIVE</span>
          </div>
          <h1 className="pv__title">
            把所有事情<br />
            <span className="pv__title-accent">按项目整理</span>。
          </h1>
          <p className="pv__lede">每个项目都是一个独立的工作流。点击卡片可以查看、编辑该项目下的任务。</p>
        </div>
        <div className="pv__hero-r">
          <button className="btn-primary-lg" onClick={onNewProject}>＋ 新建项目</button>
        </div>
      </header>

      <div className="pv__stats">
        <StatCard label="项目总数"   value={projects.length}      sub="进行中"              accent="var(--brand)"   glyph="◳" />
        <StatCard label="任务总数"   value={overall.totalTasks}   sub={`已完成 ${overall.doneTasks}`} accent="var(--c-plan)" glyph="◐" />
        <StatCard label="平均完成率" value={`${overall.avg}%`}    sub="所有项目"             accent="var(--c-done)"  glyph="◉" />
        <StatCard label="待处理"     value={overall.pending}      sub="尚未完成"             accent="var(--c-doing)" glyph="◑" />
      </div>

      <div className="pv__toolbar">
        <div className="seg">
          <button className={`seg__btn ${filter === 'all' ? 'is-on' : ''}`} onClick={() => setFilter('all')}>
            全部 <span className="seg__btn-count">{projects.length}</span>
          </button>
          <button className={`seg__btn ${filter === 'active' ? 'is-on' : ''}`} onClick={() => setFilter('active')}>进行中</button>
          <button className={`seg__btn ${filter === 'archived' ? 'is-on' : ''}`} onClick={() => setFilter('archived')}>已归档</button>
        </div>
        <div className="pv__search-wrap">
          <div className="pv__search">
            <span>⌕</span>
            <input placeholder="搜索项目名称…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <button className="pj-icon-btn" title="排序">⇅</button>
          <button className="pj-icon-btn" title="视图">▤</button>
        </div>
      </div>

      <div className="pv__grid">
        {filtered.map(({ p, s }) => (
          <ProjectCard
            key={p.id} project={p} stats={s} icon={getIcon(p.id, icons)}
            onOpen={() => onOpenProject(p.id)}
            onEdit={() => onEditProject(p)}
            onDelete={() => {
              if (confirm(`确定归档项目"${p.name}"？`)) onDeleteProject(p.id);
            }}
          />
        ))}
        <button className="pv__new" onClick={onNewProject}>
          <span className="pv__new-plus">＋</span>
          <span className="pv__new-label">新建项目</span>
          <span className="pv__new-hint">把一类相关的任务收集起来</span>
        </button>
      </div>

      {projects.length === 0 && (
        <div className="pj-empty">
          <div className="pj-empty__icon">◳</div>
          <div className="pj-empty__title">还没有项目</div>
          <p className="pj-empty__desc">点击「新建项目」开始整理你的工作流</p>
          <button className="btn-primary-lg" onClick={onNewProject}>＋ 新建项目</button>
        </div>
      )}
    </section>
  );
}

/* ── TaskRow ── */
function TaskRow({ task, onToggle, onEdit, onDelete, onStatusChange }: {
  task: Task; onToggle: () => void; onEdit: () => void;
  onDelete: () => void; onStatusChange: (s: TaskStatus) => void;
}) {
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  const isDone = task.status === 'done';
  const dueFmt = formatDue(task.dueDate);
  const s = STATUS_DEFS.find(s => s.key === task.status)!;

  return (
    <div className={`tr ${isDone ? 'is-done' : ''}`}>
      <button className={`tr__check ${isDone ? 'is-on' : ''}`} onClick={onToggle} title="切换完成">
        {isDone ? '✓' : ''}
      </button>
      <button className="tr__title" onClick={onEdit}>{task.title || <em>未命名任务</em>}</button>
      <div className="tr__meta">
        {(task.estimatedPomodoros ?? 0) > 0 && (
          <TomatoPips done={task.completedPomodoros} total={task.estimatedPomodoros ?? 0} />
        )}
        {dueFmt && (
          <span className={`tr__due ${isDueToday(task.dueDate) ? 'is-now' : isOverdue(task.dueDate) ? 'is-late' : ''}`}>
            {dueFmt}
          </span>
        )}
      </div>
      <div className="tr__actions">
        <div className="tr__status" ref={menuRef}>
          <button className="tr__status-btn" onClick={() => setMenu(m => !m)}>
            <span className="tr__status-dot" style={{ background: s.accent }} />
            <span>{s.label}</span>
            <span className="tr__status-caret">⌄</span>
          </button>
          {menu && (
            <div className="tr__menu">
              {STATUS_DEFS.map(sd => (
                <button key={sd.key} className={`tr__menu-item ${sd.key === task.status ? 'is-on' : ''}`}
                  onClick={() => { onStatusChange(sd.key); setMenu(false); }}>
                  <span className="tr__menu-dot" style={{ background: sd.accent }} />
                  <span>{sd.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="pj-icon-btn pj-icon-btn--sm" onClick={onEdit} title="编辑">✎</button>
        <button className="pj-icon-btn pj-icon-btn--sm" onClick={onDelete} title="删除">⌫</button>
      </div>
    </div>
  );
}

/* ── ProjectDetailList ── */
function ProjectDetailList({ tasks, onAdd, onEdit, onDelete, onUpdate }: {
  tasks: Task[]; onAdd: (s: TaskStatus) => void;
  onEdit: (t: Task) => void; onDelete: (id: string) => void;
  onUpdate: (id: string, data: { status: TaskStatus }) => void;
}) {
  return (
    <div className="pd__list">
      {STATUS_DEFS.map(s => {
        const items = tasks.filter(t => t.status === s.key);
        return (
          <div key={s.key} className="pd-group" style={{ '--accent': s.accent } as CSSVars}>
            <div className="pd-group__head">
              <span className="pd-group__dot" />
              <span className="pd-group__name">{s.label}</span>
              <span className="pd-group__count">{items.length}</span>
              <button className="pd-group__add" onClick={() => onAdd(s.key)}>＋ 添加</button>
            </div>
            {items.length === 0
              ? <div className="pd-group__empty">暂无任务</div>
              : <div className="pd-group__rows">
                  {items.map(t => (
                    <TaskRow key={t.id} task={t}
                      onToggle={() => onUpdate(t.id, { status: t.status === 'done' ? 'planned' : 'done' })}
                      onEdit={() => onEdit(t)}
                      onDelete={() => { if (confirm('删除此任务？')) onDelete(t.id); }}
                      onStatusChange={s => onUpdate(t.id, { status: s })} />
                  ))}
                </div>}
          </div>
        );
      })}
    </div>
  );
}

/* ── ProjectDetailKanban ── */
function ProjectDetailKanban({ tasks, onAdd, onEdit }: {
  tasks: Task[]; onAdd: (s: TaskStatus) => void; onEdit: (t: Task) => void;
}) {
  return (
    <div className="pd-kanban">
      {STATUS_DEFS.map(s => {
        const items = tasks.filter(t => t.status === s.key);
        return (
          <div key={s.key} className="pd-col" style={{ '--accent': s.accent } as CSSVars}>
            <div className="pd-col__head">
              <div className="pd-col__title">
                <span className="pd-col__icon">{s.label[0]}</span>
                <span className="pd-col__label">{s.label}</span>
                <span className="pd-col__count">{items.length}</span>
              </div>
            </div>
            <div className="pd-col__list">
              {items.map(t => {
                const dueFmt = formatDue(t.dueDate);
                return (
                  <div key={t.id} className="pd-task" onClick={() => onEdit(t)}>
                    <div className="pd-task__title">{t.title}</div>
                    <div className="pd-task__foot">
                      <TomatoPips done={t.completedPomodoros} total={t.estimatedPomodoros ?? 0} />
                      {dueFmt && (
                        <span className={`pd-task__due ${isDueToday(t.dueDate) ? 'is-now' : ''}`}>{dueFmt}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              <button className="pd-col__add" onClick={() => onAdd(s.key)}>＋ 添加</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── ProjectDetail ── */
function ProjectDetail({ project, tasks, icon, onBack, onEditProject, onEditTask, onAddTask, onDeleteTask, onUpdateTask }: {
  project: Project; tasks: Task[]; icon: string;
  onBack: () => void; onEditProject: () => void;
  onEditTask: (t: Task) => void; onAddTask: (s: TaskStatus) => void;
  onDeleteTask: (id: string) => void; onUpdateTask: (id: string, data: { status: TaskStatus }) => void;
}) {
  const stats = useMemo(() => computeStats(project, tasks), [project, tasks]);
  const projectTasks = useMemo(() => tasks.filter(t => t.projectId === project.id), [tasks, project.id]);
  const [tab, setTab] = useState<'list' | 'kanban'>('list');
  const color = project.color ?? '#6366f1';
  const createdDate = new Date(project.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <section className="pd">
      <div className="pd__crumb">
        <button className="pd__back" onClick={onBack}><span>←</span><span>返回项目</span></button>
        <span className="pd__crumb-sep">/</span>
        <span className="pd__crumb-name">{project.name}</span>
      </div>

      <header className="pd__head" style={{ '--accent': color } as CSSVars}>
        <div className="pd__head-bar" />
        <div className="pd__head-l">
          <div className="pd__icon-big">{icon}</div>
          <div className="pd__head-text">
            <div className="pd__eyebrow">项目 · 创建于 {createdDate}</div>
            <h1 className="pd__name">{project.name}</h1>
            {project.description && <p className="pd__desc">{project.description}</p>}
          </div>
        </div>
        <div className="pd__head-r">
          <button className="pj-btn" onClick={onEditProject}>编辑项目</button>
          <button className="pj-btn pj-btn--solid" onClick={() => onAddTask('planned')}>＋ 添加任务</button>
        </div>
      </header>

      <div className="pd__stats">
        {STATUS_DEFS.map(s => (
          <div key={s.key} className="pd-stat" style={{ '--accent': s.accent } as CSSVars}>
            <div className="pd-stat__dot" />
            <div>
              <div className="pd-stat__l">{s.label}</div>
              <div className="pd-stat__v">{stats.byStatus[s.key]}</div>
            </div>
          </div>
        ))}
        <div className="pd-stat pd-stat--wide">
          <div style={{ flex: 1 }}>
            <div className="pd-stat__l">完成进度</div>
            <div className="pd-stat__row">
              <div className="pd-stat__bar"><span style={{ width: `${stats.pct}%` }} /></div>
              <span className="pd-stat__pct">{stats.pct}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pd__toolbar">
        <div className="seg">
          <button className={`seg__btn ${tab === 'list' ? 'is-on' : ''}`} onClick={() => setTab('list')}>列表</button>
          <button className={`seg__btn ${tab === 'kanban' ? 'is-on' : ''}`} onClick={() => setTab('kanban')}>看板</button>
        </div>
        <div className="pd__toolbar-r">
          <button className="pj-icon-btn" title="排序">⇅</button>
          <button className="pj-icon-btn" title="筛选">⏚</button>
        </div>
      </div>

      {tab === 'list' && (
        <ProjectDetailList
          tasks={projectTasks}
          onAdd={onAddTask}
          onEdit={onEditTask}
          onDelete={onDeleteTask}
          onUpdate={onUpdateTask} />
      )}
      {tab === 'kanban' && (
        <ProjectDetailKanban
          tasks={projectTasks}
          onAdd={onAddTask}
          onEdit={onEditTask} />
      )}
    </section>
  );
}

/* ── TaskEditor (slide-over) ── */
interface TaskDraft {
  title: string;
  projectId: string;
  status: TaskStatus;
  dueDate: string; // ISO date string "YYYY-MM-DD"
  estimatedPomodoros: number;
  completedPomodoros: number;
  description: string;
}

function TaskEditor({ task, projects, onSave, onDelete, onCancel }: {
  task: Partial<Task> & { isNew?: boolean };
  projects: Project[];
  onSave: (d: TaskDraft) => void;
  onDelete?: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<TaskDraft>({
    title: task.title ?? '',
    projectId: task.projectId ?? (projects[0]?.id ?? ''),
    status: task.status ?? 'planned',
    dueDate: tsToDateStr(task.dueDate),
    estimatedPomodoros: task.estimatedPomodoros ?? 0,
    completedPomodoros: task.completedPomodoros ?? 0,
    description: task.description ?? '',
  });
  const set = <K extends keyof TaskDraft>(k: K) => (v: TaskDraft[K]) =>
    setDraft(d => ({ ...d, [k]: v }));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  const isNew = !task.id;

  return (
    <div className="so-root">
      <div className="so-backdrop" onClick={onCancel} />
      <aside className="so">
        <div className="so__head">
          <div>
            <div className="so__eyebrow">{isNew ? '新建任务' : '编辑任务'}</div>
            <div className="so__title">{isNew ? '把它写下来，先放进收件箱' : '调整任务的详情与状态'}</div>
          </div>
          <button className="pj-icon-btn" onClick={onCancel} title="关闭">✕</button>
        </div>

        <div className="so__body">
          <label className="so__field">
            <span className="so__label">任务标题</span>
            <input className="so__input so__input--lg" autoFocus placeholder="例如：阅读《搞定》第二章"
              value={draft.title} onChange={e => set('title')(e.target.value)} />
          </label>

          <div className="so__row">
            <label className="so__field">
              <span className="so__label">所属项目</span>
              <select className="so__input" value={draft.projectId} onChange={e => set('projectId')(e.target.value)}>
                <option value="">无项目</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="so__field">
              <span className="so__label">截止日期</span>
              <input className="so__input" type="date" value={draft.dueDate}
                onChange={e => set('dueDate')(e.target.value)} />
            </label>
          </div>

          <label className="so__field">
            <span className="so__label">状态</span>
            <div className="so-seg">
              {STATUS_DEFS.map(s => (
                <button key={s.key}
                  className={`so-seg__btn ${draft.status === s.key ? 'is-on' : ''}`}
                  style={{ '--so-accent': s.accent } as CSSVars}
                  onClick={() => set('status')(s.key)}>
                  <span className="so-seg__dot" />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </label>

          <label className="so__field">
            <span className="so__label">番茄钟</span>
            <div className="ts">
              <div className="ts__row">
                <span className="ts__l">已完成</span>
                <div className="ts__stepper">
                  <button onClick={() => set('completedPomodoros')(Math.max(0, draft.completedPomodoros - 1))}>−</button>
                  <span className="ts__v">{draft.completedPomodoros}</span>
                  <button onClick={() => set('completedPomodoros')(Math.min(draft.estimatedPomodoros, draft.completedPomodoros + 1))}>＋</button>
                </div>
              </div>
              <div className="ts__row">
                <span className="ts__l">计划总数</span>
                <div className="ts__stepper">
                  <button onClick={() => set('estimatedPomodoros')(Math.max(0, draft.estimatedPomodoros - 1))}>−</button>
                  <span className="ts__v">{draft.estimatedPomodoros}</span>
                  <button onClick={() => set('estimatedPomodoros')(Math.min(12, draft.estimatedPomodoros + 1))}>＋</button>
                </div>
              </div>
              <div className="ts__pips">
                {draft.estimatedPomodoros === 0
                  ? <span className="ts__hint">未使用番茄钟</span>
                  : Array.from({ length: draft.estimatedPomodoros }, (_, i) => (
                      <span key={i} className={`tomato-pip ${i < draft.completedPomodoros ? 'is-done' : ''}`} />
                    ))}
              </div>
            </div>
          </label>

          <label className="so__field">
            <span className="so__label">备注</span>
            <textarea className="so__textarea" placeholder="下一步行动、上下文或参考资料…"
              value={draft.description} onChange={e => set('description')(e.target.value)} rows={4} />
          </label>
        </div>

        <footer className="so__foot">
          {onDelete && (
            <button className="pj-btn pj-btn--danger"
              onClick={() => { if (confirm('删除此任务？')) onDelete(); }}>删除</button>
          )}
          <div className="so__foot-r">
            <button className="pj-btn" onClick={onCancel}>取消</button>
            <button className="pj-btn pj-btn--solid" onClick={() => onSave(draft)}>
              {isNew ? '添加任务' : '保存'}
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}

/* ── ProjectEditor (slide-over) ── */
interface ProjectDraft {
  name: string;
  description: string;
  color: string;
  icon: string;
}

function ProjectEditor({ project, isNew, onSave, onDelete, onCancel }: {
  project?: Project; isNew?: boolean;
  onSave: (d: ProjectDraft) => void;
  onDelete?: () => void;
  onCancel: () => void;
}) {
  const defaultIcon = project ? getIcon(project.id, loadIconOverrides()) : PROJECT_ICONS[0];
  const [draft, setDraft] = useState<ProjectDraft>({
    name: project?.name ?? '',
    description: project?.description ?? '',
    color: project?.color ?? PROJECT_COLORS[0],
    icon: defaultIcon,
  });
  const set = <K extends keyof ProjectDraft>(k: K) => (v: ProjectDraft[K]) =>
    setDraft(d => ({ ...d, [k]: v }));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div className="so-root">
      <div className="so-backdrop" onClick={onCancel} />
      <aside className="so">
        <div className="so__head">
          <div>
            <div className="so__eyebrow">{isNew ? '新建项目' : '编辑项目'}</div>
            <div className="so__title">{isNew ? '把一类相关的任务收集起来' : '更新项目的基本信息'}</div>
          </div>
          <button className="pj-icon-btn" onClick={onCancel} title="关闭">✕</button>
        </div>

        <div className="so__body">
          {/* Preview */}
          <div className="pe__preview" style={{ '--pe-accent': draft.color } as CSSVars}>
            <div className="pe__preview-icon">{draft.icon}</div>
            <div>
              <div className="pe__preview-name">{draft.name || '项目名称'}</div>
              <div className="pe__preview-desc">{draft.description || '一句话描述这个项目…'}</div>
            </div>
          </div>

          <label className="so__field">
            <span className="so__label">项目名称</span>
            <input className="so__input so__input--lg" autoFocus placeholder="例如：年度阅读计划"
              value={draft.name} onChange={e => set('name')(e.target.value)} />
          </label>

          <label className="so__field">
            <span className="so__label">简介</span>
            <textarea className="so__textarea" placeholder="一句话说明这个项目的目标…"
              rows={2} value={draft.description} onChange={e => set('description')(e.target.value)} />
          </label>

          <label className="so__field">
            <span className="so__label">主题色</span>
            <div className="pe__colors">
              {PROJECT_COLORS.map((c, i) => (
                <button key={c} title={COLOR_NAMES[i]}
                  className={`pe__color ${draft.color === c ? 'is-on' : ''}`}
                  style={{ background: c }}
                  onClick={() => set('color')(c)} />
              ))}
            </div>
          </label>

          <label className="so__field">
            <span className="so__label">图标</span>
            <div className="pe__icons">
              {PROJECT_ICONS.map(g => (
                <button key={g} className={`pe__icon ${draft.icon === g ? 'is-on' : ''}`}
                  onClick={() => set('icon')(g)}>{g}</button>
              ))}
            </div>
          </label>
        </div>

        <footer className="so__foot">
          {onDelete && (
            <button className="pj-btn pj-btn--danger"
              onClick={() => { if (confirm('删除此项目及其全部任务？')) onDelete(); }}>删除项目</button>
          )}
          <div className="so__foot-r">
            <button className="pj-btn" onClick={onCancel}>取消</button>
            <button className="pj-btn pj-btn--solid" onClick={() => {
              if (!draft.name.trim()) return;
              onSave({ ...draft, name: draft.name.trim(), description: draft.description.trim() });
            }}>
              {isNew ? '创建项目' : '保存'}
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}

/* ── Main ── */
export function ProjectsPage() {
  const { projects, tasks, load: reloadBoard } = useBoardStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [taskEditing, setTaskEditing] = useState<(Partial<Task> & { isNew?: boolean; defaultStatus?: TaskStatus }) | null>(null);
  const [projectEditing, setProjectEditing] = useState<{ project?: Project; isNew?: boolean } | null>(null);
  const [iconOverrides, setIconOverrides] = useState<Record<string, string>>(loadIconOverrides);
  const [_saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { reloadBoard(); }, [reloadBoard]);

  const selectedProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) ?? null : null;

  /* ── Task operations ── */
  const handleSaveTask = async (draft: TaskDraft) => {
    setSaving(true);
    try {
      const payload = {
        title: draft.title || '未命名任务',
        status: draft.status,
        project_id: draft.projectId || undefined,
        description: draft.description || undefined,
        estimated_pomodoros: draft.estimatedPomodoros || undefined,
        due_date: dateStrToTs(draft.dueDate) ?? undefined,
      };
      if (taskEditing?.id) {
        await api.updateTask(taskEditing.id, payload);
      } else {
        await api.createTask(payload);
      }
      await reloadBoard();
      setTaskEditing(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await api.deleteTask(id);
      await reloadBoard();
      setTaskEditing(null);
    } catch (e) {
      setError(String(e));
    }
  };

  const handleUpdateTaskStatus = async (id: string, data: { status: TaskStatus }) => {
    try {
      await api.updateTask(id, { status: data.status });
      await reloadBoard();
    } catch (e) {
      setError(String(e));
    }
  };

  /* ── Project operations ── */
  const handleSaveProject = async (draft: ProjectDraft) => {
    setSaving(true);
    try {
      let savedId: string;
      if (projectEditing?.project?.id) {
        await api.updateProject(projectEditing.project.id, {
          name: draft.name,
          description: draft.description || null,
          color: draft.color,
        });
        savedId = projectEditing.project.id;
      } else {
        const p = await api.createProject({ name: draft.name, description: draft.description || undefined, color: draft.color });
        savedId = p.id;
      }
      // persist icon
      setIconOverrides(prev => saveIconOverride(savedId, draft.icon, prev));
      await reloadBoard();
      setProjectEditing(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await api.archiveProject(id);
      await reloadBoard();
      setSelectedProjectId(null);
      setProjectEditing(null);
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {error && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 2000,
          background: '#dc2626', color: '#fff', padding: '8px 16px',
          borderRadius: 12, fontSize: 13, display: 'flex', gap: 12, alignItems: 'center',
        }}>
          {error}
          <button onClick={() => setError(null)} style={{ fontSize: 11, opacity: 0.8, textDecoration: 'underline' }}>关闭</button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 60px' }}>
        {selectedProject ? (
          <ProjectDetail
            project={selectedProject}
            tasks={tasks}
            icon={getIcon(selectedProject.id, iconOverrides)}
            onBack={() => setSelectedProjectId(null)}
            onEditProject={() => setProjectEditing({ project: selectedProject })}
            onEditTask={t => setTaskEditing(t)}
            onAddTask={status => setTaskEditing({ isNew: true, projectId: selectedProject.id, status, defaultStatus: status })}
            onDeleteTask={handleDeleteTask}
            onUpdateTask={handleUpdateTaskStatus}
          />
        ) : (
          <ProjectsView
            projects={projects}
            tasks={tasks}
            icons={iconOverrides}
            onOpenProject={id => setSelectedProjectId(id)}
            onNewProject={() => setProjectEditing({ isNew: true })}
            onEditProject={p => setProjectEditing({ project: p })}
            onDeleteProject={handleDeleteProject}
          />
        )}
      </div>

      {/* Task Editor */}
      {taskEditing && (
        <TaskEditor
          task={taskEditing}
          projects={projects}
          onSave={handleSaveTask}
          onDelete={taskEditing.id ? () => handleDeleteTask(taskEditing.id!) : undefined}
          onCancel={() => setTaskEditing(null)}
        />
      )}

      {/* Project Editor */}
      {projectEditing && (
        <ProjectEditor
          project={projectEditing.project}
          isNew={projectEditing.isNew}
          onSave={handleSaveProject}
          onDelete={projectEditing.project ? () => handleDeleteProject(projectEditing.project!.id) : undefined}
          onCancel={() => setProjectEditing(null)}
        />
      )}
    </div>
  );
}

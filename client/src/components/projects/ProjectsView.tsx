import { useState, useMemo } from 'react';
import type { Project, Task } from '../../types';
import { computeStats, getIcon } from './helpers';
import { ProjectCard } from './ProjectCard';

/* ── StatCard ── */
interface StatCardProps {
  label: string;
  value: string | number;
  sub: string;
  accent: string;
  glyph: string;
}

function StatCard({ label, value, sub, accent, glyph }: StatCardProps) {
  return (
    <div className="stat-card" style={{ '--sc-accent': accent } as React.CSSProperties & Record<string, string>}>
      <div className="stat-card__glyph">{glyph}</div>
      <div>
        <div className="stat-card__label">{label}</div>
        <div className="stat-card__value">{value}</div>
        <div className="stat-card__sub">{sub}</div>
      </div>
    </div>
  );
}

/* ── ProjectsView ── */
interface ProjectsViewProps {
  projects: Project[];
  tasks: Task[];
  icons: Record<string, string>;
  onOpenProject: (id: string) => void;
  onNewProject: () => void;
  onEditProject: (p: Project) => void;
  onDeleteProject: (id: string) => void;
}

export function ProjectsView({
  projects, tasks, icons,
  onOpenProject, onNewProject, onEditProject, onDeleteProject,
}: ProjectsViewProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [q, setQ] = useState('');

  const allStats = useMemo(
    () => projects.map(p => ({ p, s: computeStats(p, tasks) })),
    [projects, tasks],
  );

  const overall = useMemo(() => {
    const totalTasks = allStats.reduce((s, x) => s + x.s.total, 0);
    const doneTasks  = allStats.reduce((s, x) => s + x.s.done, 0);
    const avg = projects.length
      ? Math.round(allStats.reduce((s, x) => s + x.s.pct, 0) / projects.length)
      : 0;
    return { totalTasks, doneTasks, pending: totalTasks - doneTasks, avg };
  }, [allStats, projects.length]);

  const filtered = allStats.filter(({ p }) => {
    if (filter === 'archived' && !p.archived) return false;
    if (filter === 'active'   &&  p.archived) return false;
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
        <StatCard label="项目总数"   value={projects.length}     sub="进行中"                          accent="var(--brand)"   glyph="◳" />
        <StatCard label="任务总数"   value={overall.totalTasks}  sub={`已完成 ${overall.doneTasks}`}   accent="var(--c-plan)"  glyph="◐" />
        <StatCard label="平均完成率" value={`${overall.avg}%`}   sub="所有项目"                         accent="var(--c-done)"  glyph="◉" />
        <StatCard label="待处理"     value={overall.pending}     sub="尚未完成"                         accent="var(--c-doing)" glyph="◑" />
      </div>

      <div className="pv__toolbar">
        <div className="seg">
          <button className={`seg__btn ${filter === 'all'      ? 'is-on' : ''}`} onClick={() => setFilter('all')}>
            全部 <span className="seg__btn-count">{projects.length}</span>
          </button>
          <button className={`seg__btn ${filter === 'active'   ? 'is-on' : ''}`} onClick={() => setFilter('active')}>进行中</button>
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
            key={p.id}
            project={p}
            stats={s}
            icon={getIcon(p.id, icons)}
            onOpen={() => onOpenProject(p.id)}
            onEdit={() => onEditProject(p)}
            onDelete={() => { if (confirm(`确定归档项目"${p.name}"？`)) onDeleteProject(p.id); }}
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

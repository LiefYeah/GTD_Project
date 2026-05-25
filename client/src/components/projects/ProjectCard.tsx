import type { Project } from '../../types';
import type { CSSVars, ProjectStats } from './helpers';
import { STATUS_DEFS } from './helpers';

interface ProjectCardProps {
  project: Project;
  stats: ProjectStats;
  icon: string;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProjectCard({ project, stats, icon, onOpen, onEdit, onDelete }: ProjectCardProps) {
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
        <div className="pc__progress-bar">
          <span style={{ width: `${stats.pct}%` }} />
        </div>
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

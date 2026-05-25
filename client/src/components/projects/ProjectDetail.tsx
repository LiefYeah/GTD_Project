import { useState, useMemo } from 'react';
import type { Project, Task, TaskStatus } from '../../types';
import type { CSSVars } from './helpers';
import { STATUS_DEFS, computeStats, formatDue, isDueToday } from './helpers';
import { TomatoPips } from './TomatoPips';
import { TaskRow } from './TaskRow';

/* ── List view ── */
interface ProjectDetailListProps {
  tasks: Task[];
  onAdd: (s: TaskStatus) => void;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: { status: TaskStatus }) => void;
}

function ProjectDetailList({ tasks, onAdd, onEdit, onDelete, onUpdate }: ProjectDetailListProps) {
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
                    <TaskRow
                      key={t.id}
                      task={t}
                      onToggle={() => onUpdate(t.id, { status: t.status === 'done' ? 'planned' : 'done' })}
                      onEdit={() => onEdit(t)}
                      onDelete={() => { if (confirm('删除此任务？')) onDelete(t.id); }}
                      onStatusChange={status => onUpdate(t.id, { status })}
                    />
                  ))}
                </div>}
          </div>
        );
      })}
    </div>
  );
}

/* ── Kanban view ── */
interface ProjectDetailKanbanProps {
  tasks: Task[];
  onAdd: (s: TaskStatus) => void;
  onEdit: (t: Task) => void;
}

function ProjectDetailKanban({ tasks, onAdd, onEdit }: ProjectDetailKanbanProps) {
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
                        <span className={`pd-task__due ${isDueToday(t.dueDate) ? 'is-now' : ''}`}>
                          {dueFmt}
                        </span>
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
interface ProjectDetailProps {
  project: Project;
  tasks: Task[];
  icon: string;
  onBack: () => void;
  onEditProject: () => void;
  onEditTask: (t: Task) => void;
  onAddTask: (s: TaskStatus) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, data: { status: TaskStatus }) => void;
}

export function ProjectDetail({
  project, tasks, icon,
  onBack, onEditProject, onEditTask, onAddTask, onDeleteTask, onUpdateTask,
}: ProjectDetailProps) {
  const [tab, setTab] = useState<'list' | 'kanban'>('list');

  const stats        = useMemo(() => computeStats(project, tasks), [project, tasks]);
  const projectTasks = useMemo(() => tasks.filter(t => t.projectId === project.id), [tasks, project.id]);
  const color        = project.color ?? '#6366f1';
  const createdDate  = new Date(project.createdAt).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

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
          <button className={`seg__btn ${tab === 'list'   ? 'is-on' : ''}`} onClick={() => setTab('list')}>列表</button>
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
          onUpdate={onUpdateTask}
        />
      )}
      {tab === 'kanban' && (
        <ProjectDetailKanban
          tasks={projectTasks}
          onAdd={onAddTask}
          onEdit={onEditTask}
        />
      )}
    </section>
  );
}

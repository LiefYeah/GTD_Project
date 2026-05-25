import { useState, useEffect } from 'react';
import type { Task, Project } from '../../types';
import type { CSSVars, TaskDraft } from './helpers';
import { STATUS_DEFS, tsToDateStr } from './helpers';

export type { TaskDraft };

interface TaskEditorProps {
  task: Partial<Task> & { isNew?: boolean };
  projects: Project[];
  onSave: (d: TaskDraft) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export function TaskEditor({ task, projects, onSave, onDelete, onCancel }: TaskEditorProps) {
  const [draft, setDraft] = useState<TaskDraft>({
    title:               task.title               ?? '',
    projectId:           task.projectId            ?? (projects[0]?.id ?? ''),
    status:              task.status               ?? 'planned',
    dueDate:             tsToDateStr(task.dueDate),
    estimatedPomodoros:  task.estimatedPomodoros   ?? 0,
    completedPomodoros:  task.completedPomodoros   ?? 0,
    description:         task.description          ?? '',
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
            <input
              className="so__input so__input--lg"
              autoFocus
              placeholder="例如：阅读《搞定》第二章"
              value={draft.title}
              onChange={e => set('title')(e.target.value)}
            />
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
              <input
                className="so__input"
                type="date"
                value={draft.dueDate}
                onChange={e => set('dueDate')(e.target.value)}
              />
            </label>
          </div>

          <label className="so__field">
            <span className="so__label">状态</span>
            <div className="so-seg">
              {STATUS_DEFS.map(s => (
                <button
                  key={s.key}
                  className={`so-seg__btn ${draft.status === s.key ? 'is-on' : ''}`}
                  style={{ '--so-accent': s.accent } as CSSVars}
                  onClick={() => set('status')(s.key)}
                >
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
            <textarea
              className="so__textarea"
              placeholder="下一步行动、上下文或参考资料…"
              value={draft.description}
              onChange={e => set('description')(e.target.value)}
              rows={4}
            />
          </label>
        </div>

        <footer className="so__foot">
          {onDelete && (
            <button
              className="pj-btn pj-btn--danger"
              onClick={() => { if (confirm('删除此任务？')) onDelete(); }}
            >
              删除
            </button>
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

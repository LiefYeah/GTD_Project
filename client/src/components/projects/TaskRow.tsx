import { useState, useEffect, useRef } from 'react';
import type { Task, TaskStatus } from '../../types';
import { STATUS_DEFS, formatDue, isDueToday, isOverdue } from './helpers';
import { TomatoPips } from './TomatoPips';

interface TaskRowProps {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: TaskStatus) => void;
}

export function TaskRow({ task, onToggle, onEdit, onDelete, onStatusChange }: TaskRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const isDone  = task.status === 'done';
  const dueFmt  = formatDue(task.dueDate);
  const statusDef = STATUS_DEFS.find(s => s.key === task.status)!;

  return (
    <div className={`tr ${isDone ? 'is-done' : ''}`}>
      <button className={`tr__check ${isDone ? 'is-on' : ''}`} onClick={onToggle} title="切换完成">
        {isDone ? '✓' : ''}
      </button>

      <button className="tr__title" onClick={onEdit}>
        {task.title || <em>未命名任务</em>}
      </button>

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
          <button className="tr__status-btn" onClick={() => setMenuOpen(m => !m)}>
            <span className="tr__status-dot" style={{ background: statusDef.accent }} />
            <span>{statusDef.label}</span>
            <span className="tr__status-caret">⌄</span>
          </button>
          {menuOpen && (
            <div className="tr__menu">
              {STATUS_DEFS.map(sd => (
                <button
                  key={sd.key}
                  className={`tr__menu-item ${sd.key === task.status ? 'is-on' : ''}`}
                  onClick={() => { onStatusChange(sd.key); setMenuOpen(false); }}
                >
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

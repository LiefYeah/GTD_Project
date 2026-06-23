import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import { AddTaskInput } from './AddTaskInput';
import type { Task, Project, TaskStatus } from '../../types';
import { COLUMN_META } from '../../types';
import { cn } from '../../lib/utils';

/** Design system column config */
const COL_CONFIG: Record<TaskStatus, {
  accent: string;
  icon: string;
  desc: string;
}> = {
  planned:     { accent: 'var(--c-plan)',  icon: '□',  desc: '本周待办' },
  in_progress: { accent: 'var(--c-doing)', icon: '▶',  desc: '正在推进' },
  on_hold:     { accent: 'var(--c-hold)',  icon: 'II', desc: '暂缓等待' },
  done:        { accent: 'var(--c-done)',  icon: '✓',  desc: '今日交付' },
};

interface Props {
  status: TaskStatus;
  tasks: Task[];
  projects: Project[];
  onTaskClick: (task: Task) => void;
  onAddTask: (title: string, status: TaskStatus) => void;
  onStartPomodoro: (task: Task) => void;
  recurringRuleMap?: Record<string, { recurrenceType: string; recurrenceDays: string | null }>;
}

export function KanbanColumn({ status, tasks, projects, onTaskClick, onAddTask, onStartPomodoro, recurringRuleMap }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = COLUMN_META[status];
  const col = COL_CONFIG[status];
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  return (
    <div
      className={cn('flex flex-col rounded-2xl min-h-[380px] p-3')}
      style={{
        background: `color-mix(in oklab, ${col.accent} 4%, var(--bg-2))`,
        border: `1px solid color-mix(in oklab, ${col.accent} 14%, var(--line))`,
        '--accent': col.accent,
      } as React.CSSProperties}
    >
      {/* Column head */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          {/* Icon box */}
          <span
            className="w-5 h-5 rounded grid place-items-center text-[10px] font-bold flex-shrink-0"
            style={{
              fontFamily: 'var(--font-mono)',
              background: `color-mix(in oklab, ${col.accent} 16%, var(--surface))`,
              color: col.accent,
            }}
          >
            {col.icon}
          </span>
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--ink)' }}
          >
            {meta.label}
          </span>
          {/* Count badge */}
          <span
            className="ml-auto text-[11px] px-1.5 py-0.5 rounded-full font-bold"
            style={{
              fontFamily: 'var(--font-mono)',
              background: `color-mix(in oklab, ${col.accent} 16%, var(--surface))`,
              color: col.accent,
            }}
          >
            {tasks.length}
          </span>
        </div>
        {/* Description */}
        <div
          className="text-[11px] mt-1 pl-7"
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--ink-mute)',
            letterSpacing: '0.02em',
          }}
        >
          {col.desc}
        </div>
      </div>

      {/* Task list drop zone */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex-1 flex flex-col gap-2 rounded-xl p-1.5 transition-colors duration-150',
            isOver && 'bg-white/50',
          )}
          style={{
            minHeight: 80,
            background: isOver
              ? 'rgba(255,255,255,0.5)'
              : 'transparent',
          }}
        >
          {tasks.length === 0 && !isOver && (
            <p
              className="text-[11px] text-center py-6"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}
            >
              暂无任务
            </p>
          )}
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              project={task.projectId ? projectMap[task.projectId] : undefined}
              onClick={() => onTaskClick(task)}
              onStartPomodoro={() => onStartPomodoro(task)}
              accent={col.accent}
              recurringRule={task.recurringRuleId && recurringRuleMap ? recurringRuleMap[task.recurringRuleId] ?? null : null}
            />
          ))}
        </div>
      </SortableContext>

      {/* Add task */}
      <div className="pt-2">
        <AddTaskInput
          status={status}
          onAdd={(title) => onAddTask(title, status)}
          accent={col.accent}
        />
      </div>
    </div>
  );
}

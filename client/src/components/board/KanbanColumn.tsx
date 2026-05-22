import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import { AddTaskInput } from './AddTaskInput';
import type { Task, Project, TaskStatus } from '../../types';
import { COLUMN_META } from '../../types';
import { cn } from '../../lib/utils';

interface Props {
  status: TaskStatus;
  tasks: Task[];
  projects: Project[];
  onTaskClick: (task: Task) => void;
  onAddTask: (title: string, status: TaskStatus) => void;
  onStartPomodoro: (task: Task) => void;
}

export function KanbanColumn({ status, tasks, projects, onTaskClick, onAddTask, onStartPomodoro }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = COLUMN_META[status];
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  return (
    <div className="flex flex-col w-64 flex-shrink-0">
      <div className="flex items-center gap-2 px-1 pb-2">
        <span className="text-base">{meta.icon}</span>
        <span className="text-sm font-semibold">{meta.label}</span>
        <span className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex-1 flex flex-col gap-2 p-2 rounded-lg min-h-[120px] transition-colors duration-150',
            'bg-muted/40',
            isOver && 'bg-accent/60',
          )}
        >
          {tasks.length === 0 && !isOver && (
            <p className="text-xs text-muted-foreground text-center py-4">暂无任务</p>
          )}
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              project={task.projectId ? projectMap[task.projectId] : undefined}
              onClick={() => onTaskClick(task)}
              onStartPomodoro={() => onStartPomodoro(task)}
            />
          ))}
        </div>
      </SortableContext>

      <div className="pt-1 px-1">
        <AddTaskInput
          status={status}
          onAdd={(title) => onAddTask(title, status)}
        />
      </div>
    </div>
  );
}

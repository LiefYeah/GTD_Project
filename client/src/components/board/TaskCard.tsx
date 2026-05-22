import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { differenceInCalendarDays } from 'date-fns';
import { cn } from '../../lib/utils';
import type { Task, Project } from '../../types';

interface Props {
  task: Task;
  project?: Project;
  onClick: () => void;
  onStartPomodoro?: () => void;
  isDragOverlay?: boolean;
}

function PomodoroDisplay({ completed, estimated }: { completed: number; estimated: number | null }) {
  if (completed === 0 && !estimated) return null;
  const total = estimated ?? completed;
  const display = completed > 5 ? `🍅 × ${completed}` : '🍅'.repeat(completed);
  return (
    <span className="text-xs text-muted-foreground">
      {display}
      {estimated ? ` ${completed}/${total}` : ''}
    </span>
  );
}

function DueDateBadge({ dueDate }: { dueDate: number }) {
  const days = differenceInCalendarDays(dueDate, Date.now());
  const overdue = days < 0;
  const soon = days >= 0 && days <= 2;
  return (
    <span
      className={cn(
        'text-xs px-1 rounded border',
        overdue && 'text-red-600 border-red-300 bg-red-50',
        soon && !overdue && 'text-orange-600 border-orange-300 bg-orange-50',
        !overdue && !soon && 'text-muted-foreground border-border',
      )}
    >
      {new Date(dueDate).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
    </span>
  );
}

export function TaskCard({ task, project, onClick, onStartPomodoro, isDragOverlay = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const daysUntilDue = task.dueDate ? differenceInCalendarDays(task.dueDate, Date.now()) : null;
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
  const isSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 2;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'relative group bg-background rounded-md border p-3 cursor-pointer select-none',
        'hover:border-muted-foreground/40 transition-colors duration-150',
        'border-l-2',
        isOverdue && 'border-l-red-500',
        isSoon && !isOverdue && 'border-l-orange-400',
        !isOverdue && !isSoon && 'border-l-border',
        isDragging && 'opacity-40',
        isDragOverlay && 'shadow-lg rotate-1 opacity-100',
      )}
    >
      <div className="flex items-start gap-2">
        {project?.color && (
          <span
            className="mt-1 flex-shrink-0 w-2 h-2 rounded-full"
            style={{ backgroundColor: project.color }}
          />
        )}
        <span className="text-sm font-medium leading-snug line-clamp-2 flex-1">{task.title}</span>
        {onStartPomodoro && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onStartPomodoro(); }}
            title="开始番茄"
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-base leading-none p-0.5 rounded hover:bg-muted transition-opacity"
          >
            🍅
          </button>
        )}
      </div>

      {(task.completedPomodoros > 0 || task.estimatedPomodoros || task.dueDate) && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <PomodoroDisplay
            completed={task.completedPomodoros}
            estimated={task.estimatedPomodoros}
          />
          {task.dueDate && <DueDateBadge dueDate={task.dueDate} />}
        </div>
      )}
    </div>
  );
}

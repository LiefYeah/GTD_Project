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
  /** Column accent color (CSS color or var()) */
  accent?: string;
}

/** Tomato pip track: filled dots for completed, empty for remaining */
function TomatoPips({ completed, estimated }: { completed: number; estimated: number | null }) {
  if (completed === 0 && !estimated) return null;
  const total = Math.min(estimated ?? completed, 8);
  const show = Math.min(completed, 8);

  if (completed > 8 || (estimated && estimated > 8)) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px]"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)', letterSpacing: '0.02em' }}
      >
        🍅 × {completed}{estimated ? `/${estimated}` : ''}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1" title={`番茄 ${completed}/${estimated ?? completed}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 8, height: 8,
            borderRadius: '50%',
            display: 'inline-block',
            background: i < show ? 'var(--brand)' : 'var(--bg-2)',
            border: i < show
              ? '1.5px solid var(--brand)'
              : '1.5px solid var(--line)',
            boxShadow: i < show ? 'inset 0 -1px 0 color-mix(in oklab, var(--brand) 50%, #000)' : 'none',
          }}
        />
      ))}
      <span
        className="ml-0.5 text-[10px]"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)', letterSpacing: '0.02em' }}
      >
        {completed}/{estimated ?? completed}
      </span>
    </span>
  );
}

function DueChip({ dueDate }: { dueDate: number }) {
  const days = differenceInCalendarDays(dueDate, Date.now());
  const overdue = days < 0;
  const isToday = days === 0;
  const soon = days > 0 && days <= 2;

  const label = isToday
    ? '今天'
    : new Date(dueDate).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });

  return (
    <span
      className="text-[11px] px-1.5 py-0.5 rounded-md"
      style={{
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.02em',
        ...(isToday
          ? { background: 'var(--brand)', color: '#fff', fontWeight: 600 }
          : overdue
          ? { background: '#fef2f2', color: '#dc2626' }
          : soon
          ? { background: '#fff7ed', color: '#ea580c' }
          : { background: 'var(--bg-2)', color: 'var(--ink-mute)' }),
      }}
    >
      {label}
    </span>
  );
}

export function TaskCard({ task, project, onClick, onStartPomodoro, isDragOverlay = false, accent }: Props) {
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
  const isDone = task.status === 'done';

  const colAccent = accent ?? project?.color ?? 'var(--c-plan)';

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        'group relative rounded-xl p-3 cursor-pointer select-none',
        'transition-all duration-150',
        isDragging && 'opacity-40',
        isDragOverlay && 'shadow-xl rotate-1 opacity-100',
      )}
      style={{
        ...style,
        background: 'var(--surface)',
        border: isOverdue
          ? '1px solid #fca5a5'
          : isSoon && !isOverdue
          ? '1px solid #fed7aa'
          : '1px solid var(--line)',
        boxShadow: 'var(--shadow-sm)',
        '--accent': colAccent,
      } as React.CSSProperties}
      onMouseEnter={(e) => {
        if (!isDragging) {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
          (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
          (e.currentTarget as HTMLElement).style.borderColor =
            `color-mix(in oklab, ${colAccent} 30%, var(--line))`;
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          (e.currentTarget as HTMLElement).style.transform = '';
          (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)';
          (e.currentTarget as HTMLElement).style.borderColor = isOverdue
            ? '#fca5a5'
            : isSoon ? '#fed7aa' : 'var(--line)';
        }
      }}
    >
      {/* Head: tag + due chip */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Color dot (project/column accent) */}
          <span
            style={{
              width: 7, height: 7,
              borderRadius: '50%',
              background: colAccent,
              flexShrink: 0,
              display: 'inline-block',
            }}
          />
          <span
            className="text-[11px] truncate"
            style={{
              fontFamily: 'var(--font-mono)',
              color: 'var(--ink-soft)',
              letterSpacing: '0.02em',
            }}
          >
            {project?.name ?? '收件箱'}
          </span>
        </div>
        {task.dueDate && <DueChip dueDate={task.dueDate} />}
      </div>

      {/* Title */}
      <div
        className="text-sm font-medium leading-snug line-clamp-2 mb-2"
        style={{
          color: isDone ? 'var(--ink-mute)' : 'var(--ink)',
          letterSpacing: '-0.005em',
          textDecoration: isDone ? 'line-through' : 'none',
        }}
      >
        {task.title}
      </div>

      {/* Footer: tomato pips + quick-start button */}
      {(task.completedPomodoros > 0 || task.estimatedPomodoros) && (
        <div
          className="flex items-center justify-between pt-2 mt-1"
          style={{ borderTop: '1px dashed var(--line)' }}
        >
          <TomatoPips
            completed={task.completedPomodoros}
            estimated={task.estimatedPomodoros}
          />
          {onStartPomodoro && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onStartPomodoro(); }}
              title="开始番茄"
              className="opacity-0 group-hover:opacity-100 text-sm leading-none p-1 rounded-lg transition-all duration-150"
              style={{ background: 'var(--bg-2)', color: 'var(--brand)' }}
            >
              🍅
            </button>
          )}
        </div>
      )}

      {/* If no poms but has start button, show it on hover */}
      {task.completedPomodoros === 0 && !task.estimatedPomodoros && onStartPomodoro && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onStartPomodoro(); }}
          title="开始番茄"
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-sm leading-none p-1 rounded-lg transition-all duration-150"
          style={{ background: 'var(--bg-2)', color: 'var(--brand)' }}
        >
          🍅
        </button>
      )}

      {/* Done checkmark */}
      {isDone && (
        <div
          className="absolute top-3 right-3 w-5 h-5 rounded-full grid place-items-center text-white text-[11px] font-bold"
          style={{ background: 'var(--c-done)' }}
        >
          ✓
        </div>
      )}
    </div>
  );
}

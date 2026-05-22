import { X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Task, Project, TaskStatus } from '../../types';
import { COLUMN_META, COLUMN_IDS } from '../../types';
import { cn } from '../../lib/utils';

interface Props {
  task: Task | null;
  projects: Project[];
  onClose: () => void;
  onPatch: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

export function TaskDrawer({ task, projects, onClose, onPatch, onDelete }: Props) {
  const isOpen = !!task;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={onClose} />
      )}

      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-96 bg-background border-l border-border flex flex-col',
          'transition-transform duration-200 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {!task ? null : (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm text-muted-foreground">任务详情</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { onDelete(task.id); onClose(); }}
                  className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <Field label="标题">
                <input
                  key={task.id + '-title'}
                  defaultValue={task.title}
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value !== task.title) {
                      onPatch(task.id, { title: e.target.value.trim() });
                    }
                  }}
                  className="w-full text-base font-medium bg-transparent border-0 border-b border-border/50 pb-1 outline-none focus:border-primary/50 transition-colors"
                />
              </Field>

              <Field label="描述">
                <textarea
                  key={task.id + '-desc'}
                  defaultValue={task.description ?? ''}
                  placeholder="添加描述…"
                  rows={3}
                  onBlur={(e) => {
                    const val = e.target.value.trim() || null;
                    if (val !== task.description) {
                      onPatch(task.id, { description: val });
                    }
                  }}
                  className="w-full text-sm bg-muted/30 border border-border rounded-md px-2 py-1.5 outline-none resize-none focus:ring-1 focus:ring-primary/30"
                />
              </Field>

              <Field label="状态">
                <select
                  value={task.status}
                  onChange={(e) => onPatch(task.id, { status: e.target.value })}
                  className="w-full text-sm bg-background border border-border rounded-md px-2 py-1.5 outline-none cursor-pointer"
                >
                  {COLUMN_IDS.map((s) => (
                    <option key={s} value={s}>
                      {COLUMN_META[s as TaskStatus].icon} {COLUMN_META[s as TaskStatus].label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="项目">
                <select
                  value={task.projectId ?? ''}
                  onChange={(e) => onPatch(task.id, { project_id: e.target.value || null })}
                  className="w-full text-sm bg-background border border-border rounded-md px-2 py-1.5 outline-none cursor-pointer"
                >
                  <option value="">无项目</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="截止日期">
                <input
                  type="date"
                  key={task.id + '-due'}
                  defaultValue={task.dueDate ? format(task.dueDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => {
                    const val = e.target.value ? new Date(e.target.value).getTime() : null;
                    onPatch(task.id, { due_date: val });
                  }}
                  className="w-full text-sm bg-background border border-border rounded-md px-2 py-1.5 outline-none cursor-pointer"
                />
              </Field>

              <Field label="排期开始">
                <input
                  type="datetime-local"
                  key={task.id + '-start'}
                  defaultValue={
                    task.scheduledStart
                      ? format(task.scheduledStart, "yyyy-MM-dd'T'HH:mm")
                      : ''
                  }
                  onChange={(e) => {
                    const val = e.target.value ? new Date(e.target.value).getTime() : null;
                    onPatch(task.id, { scheduled_start: val });
                  }}
                  className="w-full text-sm bg-background border border-border rounded-md px-2 py-1.5 outline-none cursor-pointer"
                />
              </Field>

              <Field label="排期结束">
                <input
                  type="datetime-local"
                  key={task.id + '-end'}
                  defaultValue={
                    task.scheduledEnd
                      ? format(task.scheduledEnd, "yyyy-MM-dd'T'HH:mm")
                      : ''
                  }
                  onChange={(e) => {
                    const val = e.target.value ? new Date(e.target.value).getTime() : null;
                    onPatch(task.id, { scheduled_end: val });
                  }}
                  className="w-full text-sm bg-background border border-border rounded-md px-2 py-1.5 outline-none cursor-pointer"
                />
              </Field>

              <Field label="预估番茄数">
                <input
                  type="number"
                  min="0"
                  key={task.id + '-pom'}
                  defaultValue={task.estimatedPomodoros ?? ''}
                  placeholder="—"
                  onBlur={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    if (val !== task.estimatedPomodoros) {
                      onPatch(task.id, { estimated_pomodoros: val });
                    }
                  }}
                  className="w-24 text-sm bg-background border border-border rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary/30"
                />
              </Field>

              <Field label="番茄记录">
                <p className="text-sm text-muted-foreground">
                  已完成 {task.completedPomodoros} 个番茄
                  {task.estimatedPomodoros ? ` / 预估 ${task.estimatedPomodoros} 个` : ''}
                </p>
              </Field>

              <div className="text-xs text-muted-foreground space-y-0.5 pt-2 border-t border-border">
                <p>创建于 {format(task.createdAt, 'yyyy-MM-dd HH:mm')}</p>
                {task.completedAt && (
                  <p>完成于 {format(task.completedAt, 'yyyy-MM-dd HH:mm')}</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

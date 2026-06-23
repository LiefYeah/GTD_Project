import { X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Task, Project, TaskStatus, RecurringRule } from '../../types';
import { COLUMN_META, COLUMN_IDS } from '../../types';
import { cn } from '../../lib/utils';
import { useRecurringStore } from '../../store/recurringStore';
import { RecurrenceConfig } from './RecurrenceConfig';

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
  const { rules, createRule, patchRule, deleteRule } = useRecurringStore();
  const rule: RecurringRule | null = task?.recurringRuleId
    ? (rules.find((r) => r.id === task.recurringRuleId) ?? null)
    : null;

  function handleEnableRecurrence(config: {
    recurrenceType: string;
    recurrenceDays: string | null;
    endDate: string | null;
  }) {
    if (!task) return;
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    createRule({
      title: task.title,
      description: task.description,
      project_id: task.projectId,
      estimated_pomodoros: task.estimatedPomodoros,
      recurrence_type: config.recurrenceType,
      recurrence_days: config.recurrenceDays,
      start_date: todayStr,
      end_date: config.endDate,
      last_generated_date: todayStr, // current task is today's instance
    }).then((newRule) => {
      onPatch(task.id, { recurring_rule_id: newRule.id });
    });
  }

  function handleUpdateRule(update: {
    recurrenceType?: string;
    recurrenceDays?: string | null;
    endDate?: string | null;
  }) {
    if (!rule) return;
    // Convert camelCase RecurrenceConfig update to snake_case UpdateRecurringRuleData
    const snakeCased: Parameters<typeof patchRule>[1] = {};
    if ('recurrenceType' in update) snakeCased.recurrence_type = update.recurrenceType;
    if ('recurrenceDays' in update) snakeCased.recurrence_days = update.recurrenceDays;
    if ('endDate' in update) snakeCased.end_date = update.endDate;
    patchRule(rule.id, snakeCased);
  }

  function handleDisableRecurrence() {
    if (!rule) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    patchRule(rule.id, { end_date: yesterday.toISOString().split('T')[0] });
  }

  async function handleDeleteRule() {
    if (!task) return;
    if (rule) await deleteRule(rule.id);
    onDelete(task.id);
    onClose();
  }

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
                  onClick={handleDeleteRule}
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
                  defaultValue={rule?.title ?? task.title}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (!val || val === (rule?.title ?? task.title)) return;
                    if (rule) patchRule(rule.id, { title: val });
                    else onPatch(task.id, { title: val });
                  }}
                  className="w-full text-base font-medium bg-transparent border-0 border-b border-border/50 pb-1 outline-none focus:border-primary/50 transition-colors"
                />
              </Field>

              <Field label="描述">
                <textarea
                  key={task.id + '-desc'}
                  defaultValue={rule?.description ?? task.description ?? ''}
                  placeholder="添加描述…"
                  rows={3}
                  onBlur={(e) => {
                    const val = e.target.value.trim() || null;
                    const current = rule?.description ?? task.description;
                    if (val !== current) {
                      if (rule) patchRule(rule.id, { description: val });
                      else onPatch(task.id, { description: val });
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
                  value={rule?.projectId ?? task.projectId ?? ''}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    if (rule) patchRule(rule.id, { project_id: val });
                    else onPatch(task.id, { project_id: val });
                  }}
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
                  defaultValue={rule?.estimatedPomodoros ?? task.estimatedPomodoros ?? ''}
                  placeholder="—"
                  onBlur={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    const current = rule?.estimatedPomodoros ?? task.estimatedPomodoros;
                    if (val !== current) {
                      if (rule) patchRule(rule.id, { estimated_pomodoros: val });
                      else onPatch(task.id, { estimated_pomodoros: val });
                    }
                  }}
                  className="w-24 text-sm bg-background border border-border rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary/30"
                />
              </Field>

              <Field label="重复">
                <RecurrenceConfig
                  rule={rule}
                  onEnable={handleEnableRecurrence}
                  onUpdate={handleUpdateRule}
                  onDisable={handleDisableRecurrence}
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

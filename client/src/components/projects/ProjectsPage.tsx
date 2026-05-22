import { useState, useEffect } from 'react';
import { Plus, Pencil, Archive, X, Check, FolderOpen } from 'lucide-react';
import * as api from '../../api/client';
import { useBoardStore } from '../../store/boardStore';
import type { Project } from '../../types';
import { cn } from '../../lib/utils';

const COLOR_PRESETS = [
  '#6366f1', '#e03e3e', '#10b981', '#f59e0b',
  '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6',
];

interface FormState {
  name: string;
  description: string;
  color: string;
}

const EMPTY_FORM: FormState = { name: '', description: '', color: COLOR_PRESETS[0] };

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {COLOR_PRESETS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            'w-6 h-6 rounded-full border-2 transition-transform',
            value === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105',
          )}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

interface ProjectFormProps {
  initial?: FormState;
  onSave: (form: FormState) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

function ProjectForm({ initial = EMPTY_FORM, onSave, onCancel, saving }: ProjectFormProps) {
  const [form, setForm] = useState<FormState>(initial);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await onSave({ ...form, name: form.name.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground font-medium block mb-1">项目名称</label>
        <input
          autoFocus
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="项目名称"
          className="w-full text-sm bg-background border border-border rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground font-medium block mb-1">描述（可选）</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="项目描述…"
          rows={2}
          className="w-full text-sm bg-background border border-border rounded-md px-2 py-1.5 outline-none resize-none focus:ring-1 focus:ring-primary/30"
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground font-medium block mb-1.5">颜色</label>
        <ColorPicker value={form.color} onChange={(c) => setForm((f) => ({ ...f, color: c }))} />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!form.name.trim() || saving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Check className="w-3.5 h-3.5" />
          {saving ? '保存中…' : '保存'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
        >
          取消
        </button>
      </div>
    </form>
  );
}

interface ProjectCardProps {
  project: Project;
  taskCount: number;
  doneCount: number;
  onEdit: () => void;
  onArchive: () => void;
}

function ProjectCard({ project, taskCount, doneCount, onEdit, onArchive }: ProjectCardProps) {
  const pct = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;

  return (
    <div className="bg-background border border-border rounded-lg p-4 flex flex-col gap-3 hover:border-muted-foreground/30 transition-colors group">
      <div className="flex items-start gap-3">
        <div
          className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0"
          style={{ backgroundColor: project.color ?? '#6366f1' }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{project.name}</h3>
          {project.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1 rounded hover:bg-muted transition-colors"
            title="编辑"
          >
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={onArchive}
            className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="归档"
          >
            <Archive className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{taskCount} 个任务</span>
        {taskCount > 0 && (
          <>
            <span className="text-border">·</span>
            <span>{doneCount} 已完成</span>
            <span className="text-border">·</span>
            <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  backgroundColor: project.color ?? '#6366f1',
                }}
              />
            </div>
            <span className="tabular-nums">{pct}%</span>
          </>
        )}
      </div>
    </div>
  );
}

export function ProjectsPage() {
  const { projects, tasks, load: reloadBoard } = useBoardStore();
  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync from board store
  useEffect(() => {
    setLocalProjects(projects);
  }, [projects]);

  // Ensure board data is loaded
  useEffect(() => {
    reloadBoard();
  }, [reloadBoard]);

  const tasksByProject = tasks.reduce<Record<string, { total: number; done: number }>>((acc, t) => {
    if (!t.projectId) return acc;
    if (!acc[t.projectId]) acc[t.projectId] = { total: 0, done: 0 };
    acc[t.projectId].total += 1;
    if (t.status === 'done') acc[t.projectId].done += 1;
    return acc;
  }, {});

  const handleCreate = async (form: FormState) => {
    setSaving(true);
    try {
      const project = await api.createProject({
        name: form.name,
        description: form.description || undefined,
        color: form.color,
      });
      setLocalProjects((prev) => [...prev, project]);
      setShowCreate(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (id: string, form: FormState) => {
    setSaving(true);
    try {
      const updated = await api.updateProject(id, {
        name: form.name,
        description: form.description || null,
        color: form.color,
      });
      setLocalProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setEditingId(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await api.archiveProject(id);
      setLocalProjects((prev) => prev.filter((p) => p.id !== id));
      reloadBoard();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in-0 duration-150">
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-destructive text-destructive-foreground text-sm px-4 py-2 rounded-md shadow-md flex items-center gap-3">
          {error}
          <button onClick={() => setError(null)} className="text-xs underline">
            关闭
          </button>
        </div>
      )}

      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border px-6 py-3 flex items-center gap-4">
        <h1 className="text-lg font-semibold">项目</h1>
        <button
          onClick={() => { setShowCreate(true); setEditingId(null); }}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          新建项目
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 pb-20">
        {/* Create form */}
        {showCreate && (
          <div className="mb-6 bg-muted/30 border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">新建项目</span>
              <button onClick={() => setShowCreate(false)}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <ProjectForm
              onSave={handleCreate}
              onCancel={() => setShowCreate(false)}
              saving={saving}
            />
          </div>
        )}

        {/* Project grid or empty state */}
        {localProjects.length === 0 && !showCreate ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <FolderOpen className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">还没有项目</p>
            <p className="text-xs text-muted-foreground/60 mt-1">点击右上角「新建项目」开始</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {localProjects.map((p) =>
              editingId === p.id ? (
                <div key={p.id} className="bg-muted/30 border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">编辑项目</span>
                    <button onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  <ProjectForm
                    initial={{
                      name: p.name,
                      description: p.description ?? '',
                      color: p.color ?? COLOR_PRESETS[0],
                    }}
                    onSave={(form) => handleEdit(p.id, form)}
                    onCancel={() => setEditingId(null)}
                    saving={saving}
                  />
                </div>
              ) : (
                <ProjectCard
                  key={p.id}
                  project={p}
                  taskCount={tasksByProject[p.id]?.total ?? 0}
                  doneCount={tasksByProject[p.id]?.done ?? 0}
                  onEdit={() => { setEditingId(p.id); setShowCreate(false); }}
                  onArchive={() => handleArchive(p.id)}
                />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

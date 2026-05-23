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
            value === c ? 'scale-110' : 'hover:scale-105',
          )}
          style={{
            backgroundColor: c,
            borderColor: value === c ? 'var(--ink)' : 'transparent',
          }}
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
        <label
          className="text-[11px] font-medium block mb-1"
          style={{ color: 'var(--ink-mute)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', textTransform: 'uppercase' }}
        >
          项目名称
        </label>
        <input
          autoFocus
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="项目名称"
          className="w-full text-sm rounded-xl px-3 py-2 outline-none transition-all duration-150"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            color: 'var(--ink)',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--brand)';
            e.target.style.boxShadow = '0 0 0 3px color-mix(in oklab, var(--brand) 15%, transparent)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--line)';
            e.target.style.boxShadow = '';
          }}
        />
      </div>
      <div>
        <label
          className="text-[11px] font-medium block mb-1"
          style={{ color: 'var(--ink-mute)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', textTransform: 'uppercase' }}
        >
          描述（可选）
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="项目描述…"
          rows={2}
          className="w-full text-sm rounded-xl px-3 py-2 outline-none resize-none transition-all duration-150"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            color: 'var(--ink)',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--brand)';
            e.target.style.boxShadow = '0 0 0 3px color-mix(in oklab, var(--brand) 15%, transparent)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--line)';
            e.target.style.boxShadow = '';
          }}
        />
      </div>
      <div>
        <label
          className="text-[11px] font-medium block mb-1.5"
          style={{ color: 'var(--ink-mute)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', textTransform: 'uppercase' }}
        >
          颜色
        </label>
        <ColorPicker value={form.color} onChange={(c) => setForm((f) => ({ ...f, color: c }))} />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!form.name.trim() || saving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl transition-opacity"
          style={{
            background: 'var(--brand)',
            color: '#fff',
            opacity: !form.name.trim() || saving ? 0.5 : 1,
          }}
        >
          <Check className="w-3.5 h-3.5" />
          {saving ? '保存中…' : '保存'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm rounded-xl transition-colors duration-150"
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--line)',
            color: 'var(--ink-soft)',
          }}
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
  const color = project.color ?? '#6366f1';

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-2xl group transition-all duration-150 cursor-default"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        boxShadow: 'var(--shadow-sm)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
        (e.currentTarget as HTMLElement).style.borderColor = `color-mix(in oklab, ${color} 30%, var(--line))`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)';
      }}
    >
      <div className="flex items-start gap-3">
        {/* Color circle */}
        <div
          className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5"
          style={{
            background: `color-mix(in oklab, ${color} 14%, var(--surface))`,
            border: `1.5px solid color-mix(in oklab, ${color} 30%, var(--line))`,
          }}
        >
          <div
            className="w-3.5 h-3.5 rounded-full"
            style={{ background: color }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-sm truncate"
            style={{ color: 'var(--ink)', letterSpacing: '-0.005em' }}
          >
            {project.name}
          </h3>
          {project.description && (
            <p
              className="text-xs mt-0.5 line-clamp-2"
              style={{ color: 'var(--ink-mute)' }}
            >
              {project.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg transition-colors duration-150"
            title="编辑"
            style={{ color: 'var(--ink-mute)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)';
              (e.currentTarget as HTMLElement).style.color = 'var(--ink)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '';
              (e.currentTarget as HTMLElement).style.color = 'var(--ink-mute)';
            }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onArchive}
            className="p-1.5 rounded-lg transition-colors duration-150"
            title="归档"
            style={{ color: 'var(--ink-mute)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#fef2f2';
              (e.currentTarget as HTMLElement).style.color = '#dc2626';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '';
              (e.currentTarget as HTMLElement).style.color = 'var(--ink-mute)';
            }}
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        <span
          className="text-[11px]"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)' }}
        >
          {taskCount} 个任务
        </span>
        {taskCount > 0 && (
          <>
            <span style={{ color: 'var(--line)' }}>·</span>
            <span
              className="text-[11px]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)' }}
            >
              {doneCount} 已完成
            </span>
            <div
              className="flex-1 rounded-full overflow-hidden"
              style={{ height: 4, background: 'var(--line-soft)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
            <span
              className="text-[11px] tabular-nums"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)' }}
            >
              {pct}%
            </span>
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

  useEffect(() => { setLocalProjects(projects); }, [projects]);
  useEffect(() => { reloadBoard(); }, [reloadBoard]);

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
    <div className="flex flex-col h-full animate-in fade-in-0 duration-150">
      {error && (
        <div className="fixed top-4 right-4 z-50 text-sm px-4 py-2 rounded-xl shadow-lg flex items-center gap-3"
          style={{ background: '#dc2626', color: '#fff' }}
        >
          {error}
          <button onClick={() => setError(null)} className="text-xs underline opacity-80">
            关闭
          </button>
        </div>
      )}

      {/* Page header */}
      <header
        className="sticky top-0 z-20 flex items-center gap-4 px-7 py-3.5 flex-shrink-0"
        style={{
          background: 'color-mix(in oklab, var(--bg) 85%, transparent)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--line-soft)',
        }}
      >
        <h1
          className="text-lg font-semibold"
          style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
        >
          项目
        </h1>
        <button
          onClick={() => { setShowCreate(true); setEditingId(null); }}
          className="ml-auto flex items-center gap-1.5 px-3.5 py-1.5 text-sm rounded-xl transition-all duration-150"
          style={{ background: 'var(--brand)', color: '#fff' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
        >
          <Plus className="w-4 h-4" />
          新建项目
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-7 pb-20">
        {/* Create form */}
        {showCreate && (
          <div
            className="mb-6 rounded-2xl p-5"
            style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--line)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span
                className="text-sm font-semibold"
                style={{ color: 'var(--ink)' }}
              >
                新建项目
              </span>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 rounded-lg transition-colors"
                style={{ color: 'var(--ink-mute)' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--line-soft)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '')}
              >
                <X className="w-4 h-4" />
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
            <FolderOpen
              className="w-12 h-12 mb-4"
              style={{ color: 'var(--ink-faint)' }}
            />
            <p
              className="text-sm"
              style={{ color: 'var(--ink-mute)' }}
            >
              还没有项目
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: 'var(--ink-faint)' }}
            >
              点击右上角「新建项目」开始
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {localProjects.map((p) =>
              editingId === p.id ? (
                <div
                  key={p.id}
                  className="rounded-2xl p-5"
                  style={{
                    background: 'var(--bg-2)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: 'var(--ink)' }}
                    >
                      编辑项目
                    </span>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1 rounded-lg transition-colors"
                      style={{ color: 'var(--ink-mute)' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--line-soft)')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '')}
                    >
                      <X className="w-4 h-4" />
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

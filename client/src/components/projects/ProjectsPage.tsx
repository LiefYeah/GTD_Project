import { useState, useEffect } from 'react';
import * as api from '../../api/client';
import { useBoardStore } from '../../store/boardStore';
import type { Project, Task, TaskStatus } from '../../types';
import { loadIconOverrides, saveIconOverride, getIcon, dateStrToTs } from './helpers';
import { ProjectsView } from './ProjectsView';
import { ProjectDetail } from './ProjectDetail';
import { TaskEditor } from './TaskEditor';
import { ProjectEditor } from './ProjectEditor';
import type { TaskDraft } from './TaskEditor';
import type { ProjectDraft } from './ProjectEditor';
import './projects.css';

export function ProjectsPage() {
  const { projects, tasks, load: reloadBoard } = useBoardStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [taskEditing, setTaskEditing] = useState<(Partial<Task> & { isNew?: boolean; defaultStatus?: TaskStatus }) | null>(null);
  const [projectEditing, setProjectEditing] = useState<{ project?: Project; isNew?: boolean } | null>(null);
  const [iconOverrides, setIconOverrides] = useState<Record<string, string>>(loadIconOverrides);
  const [_saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { reloadBoard(); }, [reloadBoard]);

  const selectedProject = selectedProjectId
    ? projects.find(p => p.id === selectedProjectId) ?? null
    : null;

  /* ── Task operations ── */
  const handleSaveTask = async (draft: TaskDraft) => {
    setSaving(true);
    try {
      const payload = {
        title: draft.title || '未命名任务',
        status: draft.status,
        project_id: draft.projectId || undefined,
        description: draft.description || undefined,
        estimated_pomodoros: draft.estimatedPomodoros || undefined,
        due_date: dateStrToTs(draft.dueDate) ?? undefined,
      };
      if (taskEditing?.id) {
        await api.updateTask(taskEditing.id, payload);
      } else {
        await api.createTask(payload);
      }
      await reloadBoard();
      setTaskEditing(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await api.deleteTask(id);
      await reloadBoard();
      setTaskEditing(null);
    } catch (e) {
      setError(String(e));
    }
  };

  const handleUpdateTaskStatus = async (id: string, data: { status: TaskStatus }) => {
    try {
      await api.updateTask(id, { status: data.status });
      await reloadBoard();
    } catch (e) {
      setError(String(e));
    }
  };

  /* ── Project operations ── */
  const handleSaveProject = async (draft: ProjectDraft) => {
    setSaving(true);
    try {
      let savedId: string;
      if (projectEditing?.project?.id) {
        await api.updateProject(projectEditing.project.id, {
          name: draft.name,
          description: draft.description || null,
          color: draft.color,
        });
        savedId = projectEditing.project.id;
      } else {
        const p = await api.createProject({ name: draft.name, description: draft.description || undefined, color: draft.color });
        savedId = p.id;
      }
      setIconOverrides(prev => saveIconOverride(savedId, draft.icon, prev));
      await reloadBoard();
      setProjectEditing(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await api.archiveProject(id);
      await reloadBoard();
      setSelectedProjectId(null);
      setProjectEditing(null);
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {error && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 2000,
          background: '#dc2626', color: '#fff', padding: '8px 16px',
          borderRadius: 12, fontSize: 13, display: 'flex', gap: 12, alignItems: 'center',
        }}>
          {error}
          <button onClick={() => setError(null)} style={{ fontSize: 11, opacity: 0.8, textDecoration: 'underline' }}>关闭</button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 60px' }}>
        {selectedProject ? (
          <ProjectDetail
            project={selectedProject}
            tasks={tasks}
            icon={getIcon(selectedProject.id, iconOverrides)}
            onBack={() => setSelectedProjectId(null)}
            onEditProject={() => setProjectEditing({ project: selectedProject })}
            onEditTask={t => setTaskEditing(t)}
            onAddTask={status => setTaskEditing({ isNew: true, projectId: selectedProject.id, status, defaultStatus: status })}
            onDeleteTask={handleDeleteTask}
            onUpdateTask={handleUpdateTaskStatus}
          />
        ) : (
          <ProjectsView
            projects={projects}
            tasks={tasks}
            icons={iconOverrides}
            onOpenProject={id => setSelectedProjectId(id)}
            onNewProject={() => setProjectEditing({ isNew: true })}
            onEditProject={p => setProjectEditing({ project: p })}
            onDeleteProject={handleDeleteProject}
          />
        )}
      </div>

      {taskEditing && (
        <TaskEditor
          task={taskEditing}
          projects={projects}
          onSave={handleSaveTask}
          onDelete={taskEditing.id ? () => handleDeleteTask(taskEditing.id!) : undefined}
          onCancel={() => setTaskEditing(null)}
        />
      )}

      {projectEditing && (
        <ProjectEditor
          project={projectEditing.project}
          isNew={projectEditing.isNew}
          onSave={handleSaveProject}
          onDelete={projectEditing.project ? () => handleDeleteProject(projectEditing.project!.id) : undefined}
          onCancel={() => setProjectEditing(null)}
        />
      )}
    </div>
  );
}

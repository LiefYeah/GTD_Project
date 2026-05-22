import { useEffect, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useBoardStore } from '../../store/boardStore';
import { usePomodoroStore } from '../../store/pomodoroStore';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { TaskDrawer } from './TaskDrawer';
import type { Task, TaskStatus } from '../../types';
import { COLUMN_IDS } from '../../types';

function computeSortOrder(
  columnTasks: Task[],
  overId: string,
  isColumnDrop: boolean,
): number {
  if (isColumnDrop || columnTasks.length === 0) {
    return columnTasks.length > 0 ? columnTasks.at(-1)!.sortOrder + 1 : 1;
  }
  const overIdx = columnTasks.findIndex((t) => t.id === overId);
  if (overIdx === -1) return columnTasks.at(-1)!.sortOrder + 1;
  const prev = columnTasks[overIdx - 1];
  const curr = columnTasks[overIdx];
  return prev ? (prev.sortOrder + curr.sortOrder) / 2 : curr.sortOrder - 1;
}

export function BoardPage() {
  const {
    tasks, projects, projectFilter, selectedTask, isLoading, error,
    load, setProjectFilter, setSelectedTask, patchTask, addTask, moveTask, removeTask, clearError,
  } = useBoardStore();

  const pomodoroStart = usePomodoroStore((s) => s.start);

  const [activeTask, setActiveTask] = useState<Task | null>(null);

  useEffect(() => { load(); }, [load]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const visibleTasks = projectFilter
    ? tasks.filter((t) => t.projectId === projectFilter)
    : tasks;

  const columnTasks = COLUMN_IDS.reduce<Record<TaskStatus, Task[]>>((acc, col) => {
    acc[col] = visibleTasks
      .filter((t) => t.status === col)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === String(event.active.id));
    setActiveTask(task ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const draggedTask = tasks.find((t) => t.id === activeId);
    if (!draggedTask) return;

    const isColumnDrop = (COLUMN_IDS as string[]).includes(overId);
    const targetStatus: TaskStatus = isColumnDrop
      ? (overId as TaskStatus)
      : (tasks.find((t) => t.id === overId)?.status ?? draggedTask.status);

    let colTasks = tasks
      .filter((t) => t.status === targetStatus && t.id !== activeId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    if (!isColumnDrop && targetStatus === draggedTask.status) {
      const ids = colTasks.map((t) => t.id);
      const overIdx = ids.indexOf(overId);
      if (overIdx !== -1) {
        ids.splice(overIdx, 0, activeId);
        colTasks = ids
          .filter((id) => id !== activeId)
          .map((id) => tasks.find((t) => t.id === id)!)
          .filter(Boolean);
      }
    }

    const newSortOrder = computeSortOrder(colTasks, overId, isColumnDrop);
    moveTask(activeId, targetStatus, newSortOrder);
  }

  if (isLoading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground text-sm">
        加载中…
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-destructive text-destructive-foreground text-sm px-4 py-2 rounded-md shadow-md flex items-center gap-3">
          {error}
          <button onClick={clearError} className="text-xs underline">
            关闭
          </button>
        </div>
      )}

      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border px-6 py-3 flex items-center gap-4">
        <h1 className="text-lg font-semibold">看板</h1>
        <select
          value={projectFilter ?? ''}
          onChange={(e) => setProjectFilter(e.target.value || null)}
          className="text-sm bg-background border border-border rounded-md px-2 py-1 outline-none cursor-pointer ml-auto"
        >
          <option value="">所有项目</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </header>

      {/* pb-16 reserves space so PomodoroBar never covers bottom cards */}
      <div className="flex-1 overflow-x-auto pb-16">
        <div className="inline-flex gap-4 p-6 min-h-full">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {COLUMN_IDS.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={columnTasks[status]}
                projects={projects}
                onTaskClick={(task) => setSelectedTask(task)}
                onAddTask={(title, s) => addTask(title, s, projectFilter ?? undefined)}
                onStartPomodoro={(task) => pomodoroStart(task.id, task.title)}
              />
            ))}

            <DragOverlay>
              {activeTask && (
                <TaskCard
                  task={activeTask}
                  project={activeTask.projectId ? projectMap[activeTask.projectId] : undefined}
                  onClick={() => {}}
                  isDragOverlay
                />
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      <TaskDrawer
        task={selectedTask}
        projects={projects}
        onClose={() => setSelectedTask(null)}
        onPatch={(id, data) => patchTask(id, data as Parameters<typeof patchTask>[1])}
        onDelete={removeTask}
      />
    </div>
  );
}

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
import { FocusHero } from './FocusHero';
import { TodaySchedule } from './TodaySchedule';
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

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTs = todayStart.getTime();

  const columnTasks = COLUMN_IDS.reduce<Record<TaskStatus, Task[]>>((acc, col) => {
    let colTasks = visibleTasks.filter((t) => t.status === col);
    if (col === 'done') {
      colTasks = colTasks.filter(
        (t) =>
          (t.completedAt !== null && t.completedAt >= todayTs) ||
          (t.dueDate !== null && t.dueDate >= todayTs),
      );
    }
    acc[col] = colTasks.sort((a, b) => a.sortOrder - b.sortOrder);
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
    const overId   = String(over.id);
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
      <div className="flex items-center justify-center min-h-[60vh]" style={{ color: 'var(--ink-mute)' }}>
        加载中…
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-in fade-in-0 duration-150">
      {/* ── Error toast ── */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-destructive text-destructive-foreground text-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
          {error}
          <button onClick={clearError} className="text-xs underline">关闭</button>
        </div>
      )}

      {/* Page content: fill available height, no outer scroll */}
      <div
        className="flex-1 min-h-0 flex flex-col mx-auto w-full"
        style={{
          maxWidth: 1640,
          padding: '16px 28px 16px',
        }}
      >
        {/* ── Hero section: fixed height ── */}
        <div className="flex-shrink-0 mb-5">
          <FocusHero />
        </div>

        {/* ── Workspace: fills remaining height ── */}
        <div
          className="flex-1 min-h-0 grid gap-5"
          style={{ gridTemplateColumns: 'minmax(0, 1.55fr) minmax(360px, 1fr)' }}
        >
          {/* Left: Kanban board — full height, internal scroll */}
          <div
            className="h-full flex flex-col rounded-3xl overflow-hidden"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {/* Board header: fixed */}
            <div
              className="flex-shrink-0 flex items-center justify-between gap-4 px-6 py-4"
              style={{ borderBottom: '1px solid var(--line-soft)' }}
            >
              <div className="flex items-center gap-3">
                {/* Board icon */}
                <span
                  className="w-8 h-8 rounded-xl grid place-items-center text-base flex-shrink-0"
                  style={{
                    background: 'var(--brand-soft)',
                    color: 'var(--brand)',
                  }}
                >
                  ▦
                </span>
                <h2
                  className="text-xl font-semibold tracking-tight"
                  style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
                >
                  看板
                </h2>
                <span
                  className="text-xs"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--ink-mute)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {tasks.filter((t) => t.status === 'in_progress').length} 个任务进行中
                  · {columnTasks['done'].length} 个今日完成
                </span>
              </div>

              {/* Project filter - segmented */}
              <div
                className="flex gap-0.5 p-1 rounded-xl"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
              >
                <button
                  onClick={() => setProjectFilter(null)}
                  className="px-3 py-1 text-xs font-medium rounded-lg transition-all duration-150"
                  style={!projectFilter ? {
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    boxShadow: 'var(--shadow-sm)',
                  } : {
                    color: 'var(--ink-soft)',
                  }}
                >
                  全部
                </button>
                {projects.slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProjectFilter(p.id)}
                    className="px-3 py-1 text-xs font-medium rounded-lg transition-all duration-150"
                    style={projectFilter === p.id ? {
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      boxShadow: 'var(--shadow-sm)',
                    } : {
                      color: 'var(--ink-soft)',
                    }}
                  >
                    {p.name.length > 6 ? p.name.slice(0, 6) + '…' : p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Kanban grid: scrollable area */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-5">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: 'repeat(4, 1fr)', minWidth: '600px' }}
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
                </div>
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

          {/* Right: Today's schedule — full height */}
          <TodaySchedule onTaskClick={(task) => setSelectedTask(task)} />
        </div>
      </div>

      {/* Task detail drawer */}
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

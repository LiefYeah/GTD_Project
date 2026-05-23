import { Router } from 'express';
import { db } from '../lib/db';
import { projects, tasks, pomodoros } from '../db/schema';

const router = Router();

router.post('/', (req, res, next) => {
  try {
    const body = req.body as {
      version?: number;
      projects?: Record<string, unknown>[];
      tasks?: Record<string, unknown>[];
      pomodoros?: Record<string, unknown>[];
    };

    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'Invalid import data' } });
    }

    const inProjects = Array.isArray(body.projects) ? body.projects : [];
    const inTasks = Array.isArray(body.tasks) ? body.tasks : [];
    const inPomodoros = Array.isArray(body.pomodoros) ? body.pomodoros : [];

    // Collect existing IDs to determine what's new
    const existingProjectIds = new Set(
      db.select({ id: projects.id }).from(projects).all().map((p) => p.id),
    );
    const existingTaskIds = new Set(
      db.select({ id: tasks.id }).from(tasks).all().map((t) => t.id),
    );
    const existingPomIds = new Set(
      db.select({ id: pomodoros.id }).from(pomodoros).all().map((p) => p.id),
    );

    // Projects: skip duplicates by id
    const newProjects = inProjects.filter((p) => p.id && !existingProjectIds.has(p.id as string));

    if (newProjects.length > 0) {
      db.insert(projects).values(
        newProjects.map((p) => ({
          id: p.id as string,
          name: (p.name as string) || '未命名项目',
          description: (p.description as string | null) ?? null,
          color: (p.color as string | null) ?? null,
          createdAt: (p.createdAt as number) ?? Date.now(),
          updatedAt: (p.updatedAt as number) ?? Date.now(),
          archived: (p.archived as number) ?? 0,
        })),
      ).run();
    }

    // Build the full set of valid project ids (existing + newly imported)
    const allProjectIds = new Set([
      ...existingProjectIds,
      ...newProjects.map((p) => p.id as string),
    ]);

    // Tasks: skip duplicates; set projectId to null when referenced project is missing
    const newTasks = inTasks.filter((t) => t.id && !existingTaskIds.has(t.id as string));

    if (newTasks.length > 0) {
      db.insert(tasks).values(
        newTasks.map((t) => {
          const rawProjectId = t.projectId as string | null;
          const projectId = rawProjectId && allProjectIds.has(rawProjectId) ? rawProjectId : null;
          return {
            id: t.id as string,
            title: (t.title as string) || '未命名任务',
            description: (t.description as string | null) ?? null,
            projectId,
            status: (t.status as string) ?? 'planned',
            priority: (t.priority as number) ?? 0,
            sortOrder: (t.sortOrder as number) ?? 0,
            dueDate: (t.dueDate as number | null) ?? null,
            scheduledStart: (t.scheduledStart as number | null) ?? null,
            scheduledEnd: (t.scheduledEnd as number | null) ?? null,
            allDay: (t.allDay as number) ?? 0,
            estimatedPomodoros: (t.estimatedPomodoros as number | null) ?? null,
            completedPomodoros: (t.completedPomodoros as number) ?? 0,
            createdAt: (t.createdAt as number) ?? Date.now(),
            updatedAt: (t.updatedAt as number) ?? Date.now(),
            completedAt: (t.completedAt as number | null) ?? null,
          };
        }),
      ).run();
    }

    // Build the full set of valid task ids (existing + newly imported)
    const allTaskIds = new Set([
      ...existingTaskIds,
      ...newTasks.map((t) => t.id as string),
    ]);

    // Pomodoros: skip duplicates; set taskId to null when referenced task is missing
    const newPomodoros = inPomodoros.filter((p) => p.id && !existingPomIds.has(p.id as string));

    if (newPomodoros.length > 0) {
      db.insert(pomodoros).values(
        newPomodoros.map((p) => {
          const rawTaskId = p.taskId as string | null;
          const taskId = rawTaskId && allTaskIds.has(rawTaskId) ? rawTaskId : null;
          return {
            id: p.id as string,
            taskId,
            startedAt: (p.startedAt as number) ?? Date.now(),
            endedAt: (p.endedAt as number | null) ?? null,
            durationSeconds: (p.durationSeconds as number | null) ?? null,
            status: (p.status as string) ?? 'completed',
            notes: (p.notes as string | null) ?? null,
          };
        }),
      ).run();
    }

    res.json({
      imported: {
        projects: newProjects.length,
        tasks: newTasks.length,
        pomodoros: newPomodoros.length,
      },
      skipped: {
        projects: inProjects.length - newProjects.length,
        tasks: inTasks.length - newTasks.length,
        pomodoros: inPomodoros.length - newPomodoros.length,
      },
    });
  } catch (e) { next(e); }
});

export default router;

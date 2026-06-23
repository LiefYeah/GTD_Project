import { Router } from 'express';
import { and, eq, asc, desc, ne } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '../lib/db';
import { tasks } from '../db/schema';

const router = Router();

router.get('/', (req, res, next) => {
  try {
    const { project_id, status } = req.query as { project_id?: string; status?: string };
    // and() filters out undefined conditions, returning all rows when both are absent
    const where = and(
      project_id ? eq(tasks.projectId, project_id) : undefined,
      status ? eq(tasks.status, status) : ne(tasks.status, 'skipped'),
    );
    const result = db.select().from(tasks).where(where).orderBy(asc(tasks.sortOrder)).all();
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/', (req, res, next) => {
  try {
    const body = req.body as {
      title?: string; description?: string; project_id?: string;
      status?: string; priority?: number; sort_order?: number;
      due_date?: number; scheduled_start?: number; scheduled_end?: number;
      all_day?: number; estimated_pomodoros?: number;
    };
    if (!body.title) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'title is required' } });
    }
    const status = body.status ?? 'planned';

    // Fractional append: new card goes after the last card in its status column
    let sortOrder = body.sort_order;
    if (sortOrder === undefined) {
      const last = db
        .select({ s: tasks.sortOrder })
        .from(tasks)
        .where(eq(tasks.status, status))
        .orderBy(desc(tasks.sortOrder))
        .limit(1)
        .get();
      sortOrder = last?.s != null ? last.s + 1 : 1;
    }

    const now = Date.now();
    const [task] = db
      .insert(tasks)
      .values({
        id: randomUUID(), title: body.title, description: body.description,
        projectId: body.project_id, status, priority: body.priority ?? 0,
        sortOrder, dueDate: body.due_date, scheduledStart: body.scheduled_start,
        scheduledEnd: body.scheduled_end, allDay: body.all_day ?? 0,
        estimatedPomodoros: body.estimated_pomodoros, completedPomodoros: 0,
        createdAt: now, updatedAt: now,
      })
      .returning()
      .all();
    res.status(201).json(task);
  } catch (e) { next(e); }
});

router.patch('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;
    const set: Partial<typeof tasks.$inferInsert> = { updatedAt: Date.now() };

    if (body.title !== undefined) set.title = body.title as string;
    if (body.description !== undefined) set.description = body.description as string | null;
    if (body.project_id !== undefined) set.projectId = body.project_id as string | null;
    if (body.status !== undefined) {
      set.status = body.status as string;
      // Auto-fill completedAt when moving into done; clear it when leaving done
      set.completedAt = body.status === 'done' ? Date.now() : null;
    }
    if (body.priority !== undefined) set.priority = body.priority as number;
    if (body.sort_order !== undefined) set.sortOrder = body.sort_order as number;
    if (body.due_date !== undefined) set.dueDate = body.due_date as number | null;
    if (body.scheduled_start !== undefined) set.scheduledStart = body.scheduled_start as number | null;
    if (body.scheduled_end !== undefined) set.scheduledEnd = body.scheduled_end as number | null;
    if (body.all_day !== undefined) set.allDay = body.all_day as number;
    if (body.estimated_pomodoros !== undefined) set.estimatedPomodoros = body.estimated_pomodoros as number | null;
    if (body.recurring_rule_id !== undefined) set.recurringRuleId = body.recurring_rule_id as string | null;

    db.update(tasks).set(set).where(eq(tasks.id, id)).run();
    const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!task) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Task not found' } });
    }
    res.json(task);
  } catch (e) { next(e); }
});

router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    db.delete(tasks).where(eq(tasks.id, id)).run();
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;

import { Router } from 'express';
import { and, eq, gte, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db, sqlite } from '../lib/db';
import { pomodoros } from '../db/schema';

const router = Router();

// /today MUST be registered before /:id/* so Express does not treat "today" as an ID
router.get('/today', (_req, res, next) => {
  try {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const result = db
      .select()
      .from(pomodoros)
      .where(and(eq(pomodoros.status, 'completed'), gte(pomodoros.startedAt, midnight.getTime())))
      .orderBy(desc(pomodoros.startedAt))
      .all();
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/', (req, res, next) => {
  try {
    const { task_id } = req.query as { task_id?: string };
    const result = db
      .select()
      .from(pomodoros)
      .where(task_id ? eq(pomodoros.taskId, task_id) : undefined)
      .orderBy(desc(pomodoros.startedAt))
      .all();
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/', (req, res, next) => {
  try {
    const { task_id, duration_seconds = 1500 } = req.body as {
      task_id?: string | null; duration_seconds?: number;
    };
    // task_id is now optional — null means a free (no-task) pomodoro
    const [pom] = db
      .insert(pomodoros)
      .values({
        id: randomUUID(),
        taskId: task_id ?? null,
        startedAt: Date.now(),
        durationSeconds: duration_seconds,
        status: 'running',
      })
      .returning()
      .all();
    res.status(201).json(pom);
  } catch (e) { next(e); }
});

router.patch('/:id/complete', (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body as { notes?: string };
    const pom = db.select().from(pomodoros).where(eq(pomodoros.id, id)).get();
    if (!pom) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pomodoro not found' } });
    }
    if (pom.status !== 'running') {
      return res.status(400).json({ error: { code: 'INVALID_STATE', message: 'Pomodoro is not running' } });
    }
    const now = Date.now();
    const actualDuration = Math.round((now - pom.startedAt) / 1000);

    // Atomic: mark pomodoro completed; increment task counter only when task_id is set
    sqlite.transaction(() => {
      sqlite
        .prepare(`UPDATE pomodoros SET status='completed', ended_at=?, duration_seconds=?, notes=? WHERE id=?`)
        .run(now, actualDuration, notes ?? null, id);
      if (pom.taskId) {
        sqlite
          .prepare(`UPDATE tasks SET completed_pomodoros = completed_pomodoros + 1, updated_at=? WHERE id=?`)
          .run(now, pom.taskId);
      }
    })();

    const updated = db.select().from(pomodoros).where(eq(pomodoros.id, id)).get();
    res.json(updated);
  } catch (e) { next(e); }
});

router.patch('/:id/interrupt', (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body as { notes?: string };
    const pom = db.select().from(pomodoros).where(eq(pomodoros.id, id)).get();
    if (!pom) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pomodoro not found' } });
    }
    const now = Date.now();
    db.update(pomodoros)
      .set({
        status: 'interrupted',
        endedAt: now,
        durationSeconds: Math.round((now - pom.startedAt) / 1000),
        notes: notes ?? null,
      })
      .where(eq(pomodoros.id, id))
      .run();
    const updated = db.select().from(pomodoros).where(eq(pomodoros.id, id)).get();
    res.json(updated);
  } catch (e) { next(e); }
});

export default router;

import { Router } from 'express';
import { and, or, gte, lte } from 'drizzle-orm';
import { db } from '../lib/db';
import { tasks, pomodoros } from '../db/schema';

const router = Router();

// GET /api/calendar?start=<ms>&end=<ms>
// Returns tasks whose scheduled_start, scheduled_end, or due_date falls in [start, end]
// plus pomodoros whose started_at falls in [start, end]
router.get('/', (req, res, next) => {
  try {
    const { start, end } = req.query as { start?: string; end?: string };
    if (!start || !end) {
      return res.status(400).json({
        error: { code: 'VALIDATION', message: 'start and end (ms timestamps) are required' },
      });
    }
    const startTs = Number(start);
    const endTs = Number(end);
    if (isNaN(startTs) || isNaN(endTs)) {
      return res.status(400).json({
        error: { code: 'VALIDATION', message: 'start and end must be numeric millisecond timestamps' },
      });
    }

    const windowTasks = db
      .select()
      .from(tasks)
      .where(
        or(
          and(gte(tasks.scheduledStart, startTs), lte(tasks.scheduledStart, endTs)),
          and(gte(tasks.scheduledEnd, startTs), lte(tasks.scheduledEnd, endTs)),
          and(gte(tasks.dueDate, startTs), lte(tasks.dueDate, endTs)),
        ),
      )
      .all();

    const windowPomodoros = db
      .select()
      .from(pomodoros)
      .where(and(gte(pomodoros.startedAt, startTs), lte(pomodoros.startedAt, endTs)))
      .all();

    res.json({ tasks: windowTasks, pomodoros: windowPomodoros });
  } catch (e) { next(e); }
});

export default router;

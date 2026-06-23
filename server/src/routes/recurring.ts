import { Router } from 'express';
import { and, asc, desc, eq, gte, inArray, isNull, lt, or } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db, sqlite } from '../lib/db';
import { recurringRules, tasks } from '../db/schema';

const router = Router();

// ── Helpers ────────────────────────────────────────────────────────────────

function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function matchesRule(
  type: string,
  days: string | null,
  dow: number,
  dateStr: string,
  holidays: Set<string>,
): boolean {
  switch (type) {
    case 'daily': return true;
    case 'weekdays': return dow >= 1 && dow <= 5;
    case 'non_workdays': return dow === 0 || dow === 6 || holidays.has(dateStr);
    case 'custom_days': return (JSON.parse(days ?? '[]') as number[]).includes(dow);
    default: return false;
  }
}

// ── CRUD ───────────────────────────────────────────────────────────────────

router.get('/', (_req, res, next) => {
  try {
    res.json(db.select().from(recurringRules).orderBy(asc(recurringRules.createdAt)).all());
  } catch (e) { next(e); }
});

router.post('/', (req, res, next) => {
  try {
    const body = req.body as {
      title?: string;
      description?: string;
      project_id?: string;
      estimated_pomodoros?: number;
      recurrence_type?: string;
      recurrence_days?: string;
      start_date?: string;
      end_date?: string;
      last_generated_date?: string; // optional override (used when enabling on existing task)
    };
    if (!body.title) return res.status(400).json({ error: { code: 'VALIDATION', message: 'title is required' } });
    if (!body.recurrence_type) return res.status(400).json({ error: { code: 'VALIDATION', message: 'recurrence_type is required' } });
    if (!body.start_date) return res.status(400).json({ error: { code: 'VALIDATION', message: 'start_date is required' } });

    // Default lastGeneratedDate = day before startDate so generate creates today's instance.
    // Callers that already have an instance for today pass last_generated_date = today to skip.
    const lastGeneratedDate = body.last_generated_date
      ?? toLocalISODate(addDays(new Date(body.start_date + 'T00:00:00'), -1));

    const now = Date.now();
    const [rule] = db.insert(recurringRules).values({
      id: randomUUID(),
      title: body.title,
      description: body.description,
      projectId: body.project_id,
      estimatedPomodoros: body.estimated_pomodoros,
      recurrenceType: body.recurrence_type,
      recurrenceDays: body.recurrence_days,
      startDate: body.start_date,
      endDate: body.end_date,
      lastGeneratedDate,
      createdAt: now,
      updatedAt: now,
    }).returning().all();

    res.status(201).json(rule);
  } catch (e) { next(e); }
});

router.patch('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;
    const set: Partial<typeof recurringRules.$inferInsert> = { updatedAt: Date.now() };

    if (body.title !== undefined) set.title = body.title as string;
    if (body.description !== undefined) set.description = body.description as string | null;
    if (body.project_id !== undefined) set.projectId = body.project_id as string | null;
    if (body.estimated_pomodoros !== undefined) set.estimatedPomodoros = body.estimated_pomodoros as number | null;
    if (body.recurrence_type !== undefined) set.recurrenceType = body.recurrence_type as string;
    if (body.recurrence_days !== undefined) set.recurrenceDays = body.recurrence_days as string | null;
    if (body.start_date !== undefined) set.startDate = body.start_date as string;
    if (body.end_date !== undefined) set.endDate = body.end_date as string | null;

    db.update(recurringRules).set(set).where(eq(recurringRules.id, id)).run();
    const rule = db.select().from(recurringRules).where(eq(recurringRules.id, id)).get();
    if (!rule) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rule not found' } });
    res.json(rule);
  } catch (e) { next(e); }
});

router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    sqlite.transaction(() => {
      db.update(tasks)
        .set({ status: 'skipped', updatedAt: Date.now() })
        .where(and(eq(tasks.recurringRuleId, id), inArray(tasks.status, ['planned', 'in_progress'])))
        .run();
      db.delete(recurringRules).where(eq(recurringRules.id, id)).run();
    })();
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ── Generate ───────────────────────────────────────────────────────────────

router.post('/generate', (_req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toLocalISODate(today);
    const startOfTodayMs = today.getTime();
    const startOfTomorrowMs = startOfTodayMs + 86_400_000;

    const holidayRows = sqlite
      .prepare('SELECT date FROM public_holidays WHERE year = ?')
      .all(today.getFullYear()) as { date: string }[];
    const holidays = new Set(holidayRows.map((h) => h.date));

    const rules = db.select().from(recurringRules)
      .where(or(isNull(recurringRules.endDate), gte(recurringRules.endDate, todayStr)))
      .all();

    let generated = 0;
    let skippedStale = 0;

    for (const rule of rules) {
      const dow = today.getDay();

      // Always expire stale instances regardless of whether today matches the rule
      // (e.g. a weekdays rule should skip yesterday's planned task even on a weekend)
      const stale = db.update(tasks)
        .set({ status: 'skipped', updatedAt: Date.now() })
        .where(and(
          eq(tasks.recurringRuleId, rule.id),
          inArray(tasks.status, ['planned', 'in_progress']),
          lt(tasks.dueDate, startOfTodayMs),
        ))
        .run();
      skippedStale += stale.changes;

      // Only generate today's instance if today matches the rule
      if (matchesRule(rule.recurrenceType, rule.recurrenceDays, dow, todayStr, holidays)) {
        // Create today's instance if not already present
        const existing = db.select({ id: tasks.id })
          .from(tasks)
          .where(and(
            eq(tasks.recurringRuleId, rule.id),
            gte(tasks.dueDate, startOfTodayMs),
            lt(tasks.dueDate, startOfTomorrowMs),
          ))
          .get();

        if (!existing) {
          const last = db.select({ s: tasks.sortOrder })
            .from(tasks)
            .where(eq(tasks.status, 'planned'))
            .orderBy(desc(tasks.sortOrder))
            .limit(1)
            .get();
          const sortOrder = last?.s != null ? last.s + 1 : 1;

          db.insert(tasks).values({
            id: randomUUID(),
            title: rule.title,
            description: rule.description,
            projectId: rule.projectId,
            estimatedPomodoros: rule.estimatedPomodoros,
            status: 'planned',
            priority: 0,
            sortOrder,
            dueDate: startOfTodayMs,
            allDay: 0,
            completedPomodoros: 0,
            recurringRuleId: rule.id,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }).run();
          generated++;
        }
      }

      db.update(recurringRules)
        .set({ lastGeneratedDate: todayStr, updatedAt: Date.now() })
        .where(eq(recurringRules.id, rule.id))
        .run();
    }

    res.json({ generated, skipped_stale: skippedStale, rules_processed: rules.length });
  } catch (e) { next(e); }
});

export default router;

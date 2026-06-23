# Recurring Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add recurring task rules that auto-generate daily task instances on app startup, with four recurrence types (daily, weekdays, non-workdays, custom days) and optional end dates.

**Architecture:** A `recurring_rules` table stores rule config; a `public_holidays` table stores Chinese national holidays for non-workday detection. `POST /api/recurring/generate` (called once on app init) walks each rule's date gap and creates today's instance while expiring stale ones. The TaskDrawer gains a recurrence config section; TaskCard shows a type badge.

**Tech Stack:** Drizzle ORM + better-sqlite3 (server), React + Zustand (client), no new deps needed.

---

## File Map

**Create:**
- `server/src/routes/recurring.ts` — CRUD for recurring_rules + generate logic
- `server/src/routes/holidays.ts` — CRUD for public_holidays
- `client/src/store/recurringStore.ts` — Zustand store for rules
- `client/src/components/board/RecurrenceConfig.tsx` — toggle + type chips + day picker UI
- `client/src/components/settings/HolidayManager.tsx` — holiday list/add/delete UI

**Modify:**
- `server/src/db/schema.ts` — add `recurringRules`, `publicHolidays` tables; add `recurringRuleId` to tasks
- `server/src/db/migrate.ts` — M002 migration
- `server/src/db/seed.ts` — seed 2026 Chinese holidays
- `server/src/routes/tasks.ts` — exclude `skipped` status by default; support `recurring_rule_id` in PATCH
- `server/src/index.ts` — register new routers
- `client/src/types.ts` — add `RecurringRule`, `PublicHoliday`; add `recurringRuleId` to `Task`
- `client/src/api/client.ts` — add recurring + holiday API functions
- `client/src/App.tsx` — add `RecurringInitializer` component
- `client/src/components/board/TaskDrawer.tsx` — add recurrence section
- `client/src/components/board/TaskCard.tsx` — add recurrence badge
- `client/src/components/settings/SettingsPage.tsx` — add HolidayManager section

---

## Task 1: DB Schema & Migration

**Files:**
- Modify: `server/src/db/schema.ts`
- Modify: `server/src/db/migrate.ts`

- [ ] **Step 1: Add tables to schema.ts**

Replace the exports section at the bottom of `server/src/db/schema.ts` with the full updated file:

```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  archived: integer('archived').notNull().default(0),
});

export const recurringRules = sqliteTable('recurring_rules', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  projectId: text('project_id').references(() => projects.id),
  estimatedPomodoros: integer('estimated_pomodoros'),
  recurrenceType: text('recurrence_type').notNull(), // 'daily'|'weekdays'|'non_workdays'|'custom_days'
  recurrenceDays: text('recurrence_days'),            // JSON '[1,3,5]', only for custom_days
  startDate: text('start_date').notNull(),            // ISO date '2026-06-23'
  endDate: text('end_date'),                          // ISO date, null = no end
  lastGeneratedDate: text('last_generated_date').notNull(), // last date an instance was generated
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  projectId: text('project_id').references(() => projects.id),
  status: text('status').notNull().default('planned'),
  priority: integer('priority').notNull().default(0),
  sortOrder: real('sort_order').notNull().default(0),
  dueDate: integer('due_date'),
  scheduledStart: integer('scheduled_start'),
  scheduledEnd: integer('scheduled_end'),
  allDay: integer('all_day').notNull().default(0),
  estimatedPomodoros: integer('estimated_pomodoros'),
  completedPomodoros: integer('completed_pomodoros').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  completedAt: integer('completed_at'),
  recurringRuleId: text('recurring_rule_id').references(() => recurringRules.id),
});

export const pomodoros = sqliteTable('pomodoros', {
  id: text('id').primaryKey(),
  taskId: text('task_id').references(() => tasks.id),
  startedAt: integer('started_at').notNull(),
  endedAt: integer('ended_at'),
  durationSeconds: integer('duration_seconds'),
  status: text('status').notNull(),
  notes: text('notes'),
});

export const publicHolidays = sqliteTable('public_holidays', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),   // ISO date '2026-01-01'
  name: text('name').notNull(),
  year: integer('year').notNull(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Pomodoro = typeof pomodoros.$inferSelect;
export type NewPomodoro = typeof pomodoros.$inferInsert;
export type RecurringRule = typeof recurringRules.$inferSelect;
export type NewRecurringRule = typeof recurringRules.$inferInsert;
export type PublicHoliday = typeof publicHolidays.$inferSelect;
```

- [ ] **Step 2: Add M002 migration to migrate.ts**

After the `console.log('[db] M001: ...')` line and before the final `console.log('[db] migrations OK')`, insert:

```typescript
  // ── Migration M002: recurring_rules, public_holidays tables + tasks.recurring_rule_id ──
  const taskCols = sqlite.prepare('PRAGMA table_info(tasks)').all() as ColInfo[];
  const hasRecurringRuleId = taskCols.some((c) => c.name === 'recurring_rule_id');
  if (!hasRecurringRuleId) {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS recurring_rules (
        id                   TEXT    PRIMARY KEY,
        title                TEXT    NOT NULL,
        description          TEXT,
        project_id           TEXT    REFERENCES projects(id),
        estimated_pomodoros  INTEGER,
        recurrence_type      TEXT    NOT NULL,
        recurrence_days      TEXT,
        start_date           TEXT    NOT NULL,
        end_date             TEXT,
        last_generated_date  TEXT    NOT NULL,
        created_at           INTEGER NOT NULL,
        updated_at           INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS public_holidays (
        id    INTEGER PRIMARY KEY AUTOINCREMENT,
        date  TEXT    NOT NULL,
        name  TEXT    NOT NULL,
        year  INTEGER NOT NULL
      );
    `);
    sqlite.exec(`ALTER TABLE tasks ADD COLUMN recurring_rule_id TEXT REFERENCES recurring_rules(id);`);
    console.log('[db] M002: recurring_rules + public_holidays created; tasks.recurring_rule_id added');
  }
```

- [ ] **Step 3: Verify migration runs**

```bash
cd /Users/qq/Documents/Claude/GTDProject/gtd-app
npm run dev
```

Expected: server starts, logs include `[db] M002: recurring_rules + public_holidays created; tasks.recurring_rule_id added` (first run only). Stop server with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add server/src/db/schema.ts server/src/db/migrate.ts
git commit -m "feat: add recurring_rules and public_holidays schema + M002 migration"
```

---

## Task 2: Holiday Seed Data

**Files:**
- Modify: `server/src/db/seed.ts`

- [ ] **Step 1: Add holiday seeding to seedDatabase()**

At the very end of the `seedDatabase()` function (after the existing `console.log('[db] seed data inserted')` and before the closing `}`), add:

```typescript
  // Seed 2026 Chinese national holidays (idempotent: only inserts if year not present)
  const { holidayCount } = sqlite
    .prepare('SELECT COUNT(*) as holidayCount FROM public_holidays WHERE year = 2026')
    .get() as { holidayCount: number };

  if (holidayCount === 0) {
    const insertHoliday = sqlite.prepare(
      'INSERT INTO public_holidays (date, name, year) VALUES (?, ?, 2026)'
    );
    const holidays2026 = [
      ['2026-01-01', '元旦'],
      ['2026-01-02', '元旦假期'],
      ['2026-01-03', '元旦假期'],
      ['2026-02-17', '春节'],
      ['2026-02-18', '春节假期'],
      ['2026-02-19', '春节假期'],
      ['2026-02-20', '春节假期'],
      ['2026-02-21', '春节假期'],
      ['2026-02-22', '春节假期'],
      ['2026-02-23', '春节假期'],
      ['2026-04-04', '清明节'],
      ['2026-04-05', '清明节假期'],
      ['2026-04-06', '清明节假期'],
      ['2026-05-01', '劳动节'],
      ['2026-05-02', '劳动节假期'],
      ['2026-05-03', '劳动节假期'],
      ['2026-05-04', '劳动节假期'],
      ['2026-05-05', '劳动节假期'],
      ['2026-06-19', '端午节'],
      ['2026-06-20', '端午节假期'],
      ['2026-06-21', '端午节假期'],
      ['2026-09-25', '中秋节'],
      ['2026-09-26', '中秋节假期'],
      ['2026-09-27', '中秋节假期'],
      ['2026-10-01', '国庆节'],
      ['2026-10-02', '国庆节假期'],
      ['2026-10-03', '国庆节假期'],
      ['2026-10-04', '国庆节假期'],
      ['2026-10-05', '国庆节假期'],
      ['2026-10-06', '国庆节假期'],
      ['2026-10-07', '国庆节假期'],
    ];
    for (const [date, name] of holidays2026) {
      insertHoliday.run(date, name);
    }
    console.log('[db] 2026 holiday data seeded');
  }
```

- [ ] **Step 2: Verify seed runs**

```bash
npm run dev
```

Expected: logs show `[db] 2026 holiday data seeded`. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add server/src/db/seed.ts
git commit -m "feat: seed 2026 Chinese national holidays"
```

---

## Task 3: Recurring Routes

**Files:**
- Create: `server/src/routes/recurring.ts`
- Modify: `server/src/routes/tasks.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create server/src/routes/recurring.ts**

```typescript
import { Router } from 'express';
import { and, asc, desc, eq, gte, inArray, isNull, lt, or } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db, sqlite } from '../lib/db';
import { recurringRules, tasks } from '../db/schema';

const router = Router();

// ── Helpers ────────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
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
      ?? toISODate(addDays(new Date(body.start_date + 'T00:00:00'), -1));

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
    db.update(tasks)
      .set({ status: 'skipped', updatedAt: Date.now() })
      .where(and(eq(tasks.recurringRuleId, id), inArray(tasks.status, ['planned', 'in_progress'])))
      .run();
    db.delete(recurringRules).where(eq(recurringRules.id, id)).run();
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ── Generate ───────────────────────────────────────────────────────────────

router.post('/generate', (_req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toISODate(today);
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
      const fromDate = addDays(new Date(rule.lastGeneratedDate + 'T00:00:00'), 1);
      let cursor = new Date(fromDate);

      while (cursor <= today) {
        const cursorStr = toISODate(cursor);
        const dow = cursor.getDay();

        if (matchesRule(rule.recurrenceType, rule.recurrenceDays, dow, cursorStr, holidays) && cursorStr === todayStr) {
          // Expire stale instances (planned/in_progress from before today)
          const stale = db.update(tasks)
            .set({ status: 'skipped', updatedAt: Date.now() })
            .where(and(
              eq(tasks.recurringRuleId, rule.id),
              inArray(tasks.status, ['planned', 'in_progress']),
              lt(tasks.dueDate, startOfTodayMs),
            ))
            .run();
          skippedStale += stale.changes;

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

        cursor = addDays(cursor, 1);
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
```

- [ ] **Step 2: Update tasks.ts to exclude skipped by default and support recurring_rule_id in PATCH**

In `server/src/routes/tasks.ts`:

Change the import line from:
```typescript
import { and, eq, asc, desc } from 'drizzle-orm';
```
to:
```typescript
import { and, eq, asc, desc, ne } from 'drizzle-orm';
```

Change the GET where clause from:
```typescript
    const where = and(
      project_id ? eq(tasks.projectId, project_id) : undefined,
      status ? eq(tasks.status, status) : undefined,
    );
```
to:
```typescript
    const where = and(
      project_id ? eq(tasks.projectId, project_id) : undefined,
      status ? eq(tasks.status, status) : ne(tasks.status, 'skipped'),
    );
```

In the PATCH handler, after `if (body.estimated_pomodoros !== undefined)` line, add:
```typescript
    if (body.recurring_rule_id !== undefined) set.recurringRuleId = body.recurring_rule_id as string | null;
```

- [ ] **Step 3: Register routes in index.ts**

Add imports after the existing imports:
```typescript
import recurringRouter from './routes/recurring';
import holidaysRouter from './routes/holidays';
```

Add route registrations after `app.use('/api/import', importRouter);`:
```typescript
app.use('/api/recurring', recurringRouter);
app.use('/api/holidays', holidaysRouter);
```

- [ ] **Step 4: Smoke-test the generate endpoint**

Start the server (`npm run dev` from gtd-app root), then:

```bash
curl -s -X POST http://localhost:3001/api/recurring/generate | python3 -m json.tool
```

Expected: `{"generated": 0, "skipped_stale": 0, "rules_processed": 0}` (no rules yet).

- [ ] **Step 5: Smoke-test rule creation + generation**

```bash
# Create a daily rule
curl -s -X POST http://localhost:3001/api/recurring \
  -H 'Content-Type: application/json' \
  -d '{"title":"英语阅读","recurrence_type":"daily","start_date":"2026-06-23"}' | python3 -m json.tool

# Trigger generate
curl -s -X POST http://localhost:3001/api/recurring/generate | python3 -m json.tool
```

Expected: first command returns a rule object; second shows `"generated": 1`.

```bash
# Verify task was created
curl -s "http://localhost:3001/api/tasks" | python3 -m json.tool | grep -A2 '"英语阅读"'
```

Expected: task with `"title": "英语阅读"`, `"status": "planned"`, `"recurringRuleId"` set.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/recurring.ts server/src/routes/tasks.ts server/src/index.ts
git commit -m "feat: add recurring rules routes with generate logic"
```

---

## Task 4: Holiday Routes

**Files:**
- Create: `server/src/routes/holidays.ts`

- [ ] **Step 1: Create server/src/routes/holidays.ts**

```typescript
import { Router } from 'express';
import { sqlite } from '../lib/db';

const router = Router();

router.get('/', (req, res, next) => {
  try {
    const { year } = req.query as { year?: string };
    const y = year ? Number(year) : new Date().getFullYear();
    const rows = sqlite.prepare('SELECT * FROM public_holidays WHERE year = ? ORDER BY date ASC').all(y);
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', (req, res, next) => {
  try {
    const { date, name } = req.body as { date?: string; name?: string };
    if (!date || !name) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'date and name are required' } });
    }
    const year = new Date(date + 'T00:00:00').getFullYear();
    const result = sqlite.prepare('INSERT INTO public_holidays (date, name, year) VALUES (?, ?, ?)').run(date, name, year);
    const row = sqlite.prepare('SELECT * FROM public_holidays WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (e) { next(e); }
});

router.delete('/:id', (req, res, next) => {
  try {
    sqlite.prepare('DELETE FROM public_holidays WHERE id = ?').run(Number(req.params.id));
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
```

- [ ] **Step 2: Smoke-test holidays endpoint**

```bash
curl -s "http://localhost:3001/api/holidays?year=2026" | python3 -m json.tool | head -20
```

Expected: JSON array of 2026 holidays starting with `{"id": 1, "date": "2026-01-01", "name": "元旦", "year": 2026}`.

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/holidays.ts
git commit -m "feat: add holiday routes (GET/POST/DELETE)"
```

---

## Task 5: Frontend Types & API Client

**Files:**
- Modify: `client/src/types.ts`
- Modify: `client/src/api/client.ts`

- [ ] **Step 1: Update types.ts**

Replace the full `client/src/types.ts`:

```typescript
export type TaskStatus = 'planned' | 'in_progress' | 'on_hold' | 'done';
export type RecurrenceType = 'daily' | 'weekdays' | 'non_workdays' | 'custom_days';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  createdAt: number;
  updatedAt: number;
  archived: number;
}

export interface RecurringRule {
  id: string;
  title: string;
  description: string | null;
  projectId: string | null;
  estimatedPomodoros: number | null;
  recurrenceType: RecurrenceType;
  recurrenceDays: string | null; // JSON '[1,3,5]'
  startDate: string;             // ISO date '2026-06-23'
  endDate: string | null;        // ISO date, null = no end
  lastGeneratedDate: string;     // ISO date
  createdAt: number;
  updatedAt: number;
}

export interface PublicHoliday {
  id: number;
  date: string;
  name: string;
  year: number;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  projectId: string | null;
  status: TaskStatus;
  priority: number;
  sortOrder: number;
  dueDate: number | null;
  scheduledStart: number | null;
  scheduledEnd: number | null;
  allDay: number;
  estimatedPomodoros: number | null;
  completedPomodoros: number;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  recurringRuleId: string | null;
}

export const COLUMN_IDS: TaskStatus[] = ['planned', 'in_progress', 'on_hold', 'done'];

export interface Pomodoro {
  id: string;
  taskId: string;
  startedAt: number;
  endedAt: number | null;
  durationSeconds: number;
  status: 'running' | 'completed' | 'interrupted';
  notes: string | null;
}

export const COLUMN_META: Record<TaskStatus, { label: string; icon: string }> = {
  planned: { label: '计划', icon: '📋' },
  in_progress: { label: '进行中', icon: '🔥' },
  on_hold: { label: '搁置', icon: '⏸' },
  done: { label: '已完成', icon: '✅' },
};
```

- [ ] **Step 2: Add recurring + holiday functions to api/client.ts**

At the top of `client/src/api/client.ts`, update the import:

```typescript
import type { Task, Project, Pomodoro, RecurringRule, PublicHoliday } from '../types';
```

Append to the end of `client/src/api/client.ts`:

```typescript
// ── Recurring Rules ────────────────────────────────────────────────────────

export interface CreateRecurringRuleData {
  title: string;
  description?: string | null;
  project_id?: string | null;
  estimated_pomodoros?: number | null;
  recurrence_type: string;
  recurrence_days?: string | null;
  start_date: string;
  end_date?: string | null;
  last_generated_date?: string; // pass today's ISO date when enabling on an existing task
}

export interface UpdateRecurringRuleData {
  title?: string;
  description?: string | null;
  project_id?: string | null;
  estimated_pomodoros?: number | null;
  recurrence_type?: string;
  recurrence_days?: string | null;
  start_date?: string;
  end_date?: string | null;
}

export const getRecurringRules = () => req<RecurringRule[]>('/recurring');

export const createRecurringRule = (data: CreateRecurringRuleData) =>
  req<RecurringRule>('/recurring', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const updateRecurringRule = (id: string, data: UpdateRecurringRuleData) =>
  req<RecurringRule>(`/recurring/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const deleteRecurringRule = (id: string) =>
  req<{ success: boolean }>(`/recurring/${id}`, { method: 'DELETE' });

export const generateRecurringTasks = () =>
  req<{ generated: number; skipped_stale: number; rules_processed: number }>(
    '/recurring/generate', { method: 'POST' }
  );

// ── Holidays ───────────────────────────────────────────────────────────────

export const getHolidays = (year: number) =>
  req<PublicHoliday[]>(`/holidays?year=${year}`);

export const createHoliday = (data: { date: string; name: string }) =>
  req<PublicHoliday>('/holidays', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const deleteHoliday = (id: number) =>
  req<{ success: boolean }>(`/holidays/${id}`, { method: 'DELETE' });
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/qq/Documents/Claude/GTDProject/gtd-app/client
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/types.ts client/src/api/client.ts
git commit -m "feat: add RecurringRule and PublicHoliday types and API client functions"
```

---

## Task 6: Recurring Store & App Initializer

**Files:**
- Create: `client/src/store/recurringStore.ts`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Create client/src/store/recurringStore.ts**

```typescript
import { create } from 'zustand';
import * as api from '../api/client';
import type { RecurringRule } from '../types';

interface RecurringState {
  rules: RecurringRule[];
  load: () => Promise<void>;
  createRule: (data: api.CreateRecurringRuleData) => Promise<RecurringRule>;
  patchRule: (id: string, data: api.UpdateRecurringRuleData) => Promise<RecurringRule>;
  deleteRule: (id: string) => Promise<void>;
  generateAndReload: (reloadBoard: () => Promise<void>) => Promise<void>;
}

export const useRecurringStore = create<RecurringState>((set) => ({
  rules: [],

  load: async () => {
    const rules = await api.getRecurringRules();
    set({ rules });
  },

  createRule: async (data) => {
    const rule = await api.createRecurringRule(data);
    set((s) => ({ rules: [...s.rules, rule] }));
    return rule;
  },

  patchRule: async (id, data) => {
    const rule = await api.updateRecurringRule(id, data);
    set((s) => ({ rules: s.rules.map((r) => (r.id === id ? rule : r)) }));
    return rule;
  },

  deleteRule: async (id) => {
    await api.deleteRecurringRule(id);
    set((s) => ({ rules: s.rules.filter((r) => r.id !== id) }));
  },

  generateAndReload: async (reloadBoard) => {
    await api.generateRecurringTasks();
    await Promise.all([reloadBoard(), api.getRecurringRules().then((rules) => set({ rules }))]);
  },
}));
```

- [ ] **Step 2: Add RecurringInitializer to App.tsx**

Add this import at the top of `client/src/App.tsx` (after existing imports):

```typescript
import { useRecurringStore } from './store/recurringStore';
import { useBoardStore } from './store/boardStore';
```

Add this component definition before the `export default function App()` line:

```typescript
function RecurringInitializer() {
  const generateAndReload = useRecurringStore((s) => s.generateAndReload);
  const loadBoard = useBoardStore((s) => s.load);

  useEffect(() => {
    generateAndReload(loadBoard);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
```

Inside `export default function App()`, add `<RecurringInitializer />` right after `<KeyboardShortcuts />`:

```tsx
      <PomodoroTicker />
      <ThemeSync />
      <KeyboardShortcuts />
      <RecurringInitializer />
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/qq/Documents/Claude/GTDProject/gtd-app/client
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/store/recurringStore.ts client/src/App.tsx
git commit -m "feat: add recurringStore and RecurringInitializer for on-startup task generation"
```

---

## Task 7: RecurrenceConfig Component

**Files:**
- Create: `client/src/components/board/RecurrenceConfig.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState, useEffect } from 'react';
import type { RecurringRule, RecurrenceType } from '../../types';

const RECURRENCE_TYPES: { value: RecurrenceType; label: string }[] = [
  { value: 'daily', label: '每天' },
  { value: 'weekdays', label: '工作日' },
  { value: 'non_workdays', label: '非工作日' },
  { value: 'custom_days', label: '自定义' },
];

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function isRuleActive(rule: RecurringRule): boolean {
  return rule.endDate === null || rule.endDate >= todayISO();
}

interface RecurrenceConfigProps {
  rule: RecurringRule | null;
  onEnable: (config: {
    recurrenceType: RecurrenceType;
    recurrenceDays: string | null;
    endDate: string | null;
  }) => void;
  onUpdate: (update: {
    recurrenceType?: RecurrenceType;
    recurrenceDays?: string | null;
    endDate?: string | null;
  }) => void;
  onDisable: () => void;
}

export function RecurrenceConfig({ rule, onEnable, onUpdate, onDisable }: RecurrenceConfigProps) {
  const active = rule !== null && isRuleActive(rule);

  const [type, setType] = useState<RecurrenceType>(rule?.recurrenceType ?? 'daily');
  const [customDays, setCustomDays] = useState<number[]>(
    rule?.recurrenceDays ? (JSON.parse(rule.recurrenceDays) as number[]) : []
  );
  const [endDate, setEndDate] = useState<string>(rule?.endDate ?? '');

  // Sync local state when rule changes from outside
  useEffect(() => {
    if (rule) {
      setType(rule.recurrenceType);
      setCustomDays(rule.recurrenceDays ? (JSON.parse(rule.recurrenceDays) as number[]) : []);
      setEndDate(rule.endDate ?? '');
    }
  }, [rule?.id]);

  function handleToggle() {
    if (active) {
      onDisable();
    } else if (rule && !isRuleActive(rule)) {
      // Re-enable a stopped rule
      onUpdate({ end_date: null } as never);
    } else {
      // Enable for the first time
      onEnable({
        recurrenceType: type,
        recurrenceDays: type === 'custom_days' ? JSON.stringify(customDays) : null,
        endDate: endDate || null,
      });
    }
  }

  function handleTypeChange(newType: RecurrenceType) {
    setType(newType);
    if (rule && active) {
      onUpdate({
        recurrenceType: newType,
        recurrenceDays: newType === 'custom_days' ? JSON.stringify(customDays) : null,
      });
    }
  }

  function toggleDay(dow: number) {
    const next = customDays.includes(dow)
      ? customDays.filter((d) => d !== dow)
      : [...customDays, dow].sort((a, b) => a - b);
    setCustomDays(next);
    if (rule && active) {
      onUpdate({ recurrenceDays: JSON.stringify(next) });
    }
  }

  function handleEndDateChange(val: string) {
    setEndDate(val);
    if (rule && active) {
      onUpdate({ endDate: val || null });
    }
  }

  return (
    <div className="space-y-3">
      {/* Toggle row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={active}
          onClick={handleToggle}
          className="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
          style={{ background: active ? 'var(--brand)' : 'var(--bg-2)' }}
        >
          <span
            className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200"
            style={{ transform: active ? 'translateX(16px)' : 'translateX(0)' }}
          />
        </button>
        <span
          className="text-sm"
          style={{ color: active ? 'var(--ink)' : 'var(--ink-mute)' }}
        >
          {active ? '已开启' : '不重复'}
        </span>
      </div>

      {/* Config (only when active) */}
      {active && (
        <>
          {/* Type chips */}
          <div className="grid grid-cols-2 gap-1.5">
            {RECURRENCE_TYPES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleTypeChange(value)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150"
                style={
                  type === value
                    ? { background: 'var(--brand)', color: '#fff' }
                    : { background: 'var(--bg-2)', color: 'var(--ink-soft)', border: '1px solid var(--line)' }
                }
              >
                {label}
              </button>
            ))}
          </div>

          {/* Custom day picker */}
          {type === 'custom_days' && (
            <div className="flex gap-1.5 justify-between">
              {DAY_LABELS.map((label, dow) => (
                <button
                  key={dow}
                  type="button"
                  onClick={() => toggleDay(dow)}
                  className="w-8 h-8 rounded-full text-xs font-medium transition-colors duration-150 flex-shrink-0"
                  style={
                    customDays.includes(dow)
                      ? { background: 'var(--brand)', color: '#fff' }
                      : { background: 'var(--bg-2)', color: 'var(--ink-mute)', border: '1px solid var(--line)' }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* End date */}
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--ink-mute)', whiteSpace: 'nowrap' }}>
              结束日期
            </span>
            <input
              type="date"
              value={endDate}
              min={todayISO()}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="flex-1 text-xs rounded-lg px-2 py-1 outline-none"
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--line)',
                color: endDate ? 'var(--ink)' : 'var(--ink-mute)',
              }}
            />
            {endDate && (
              <button
                type="button"
                onClick={() => handleEndDateChange('')}
                className="text-xs"
                style={{ color: 'var(--ink-mute)' }}
              >
                ✕
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/qq/Documents/Claude/GTDProject/gtd-app/client
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/board/RecurrenceConfig.tsx
git commit -m "feat: add RecurrenceConfig toggle/type-chip/day-picker component"
```

---

## Task 8: TaskDrawer Integration

**Files:**
- Modify: `client/src/components/board/TaskDrawer.tsx`

- [ ] **Step 1: Add recurring imports to TaskDrawer.tsx**

At the top of `client/src/components/board/TaskDrawer.tsx`, add after the existing imports:

```typescript
import { useRecurringStore } from '../../store/recurringStore';
import { RecurrenceConfig } from './RecurrenceConfig';
import type { RecurringRule } from '../../types';
```

- [ ] **Step 2: Add rule lookup and handlers inside the TaskDrawer component**

Inside the `TaskDrawer` function body, right before `const isOpen = !!task;`, add:

```typescript
  const { rules, createRule, patchRule, deleteRule } = useRecurringStore();
  const rule: RecurringRule | null = task?.recurringRuleId
    ? (rules.find((r) => r.id === task.recurringRuleId) ?? null)
    : null;

  function handleEnableRecurrence(config: {
    recurrenceType: string;
    recurrenceDays: string | null;
    endDate: string | null;
  }) {
    if (!task) return;
    const todayStr = new Date().toISOString().split('T')[0];
    createRule({
      title: task.title,
      description: task.description,
      project_id: task.projectId,
      estimated_pomodoros: task.estimatedPomodoros,
      recurrence_type: config.recurrenceType,
      recurrence_days: config.recurrenceDays,
      start_date: todayStr,
      end_date: config.endDate,
      last_generated_date: todayStr, // current task is today's instance
    }).then((newRule) => {
      onPatch(task.id, { recurring_rule_id: newRule.id });
    });
  }

  function handleUpdateRule(update: Record<string, unknown>) {
    if (!rule) return;
    patchRule(rule.id, update as Parameters<typeof patchRule>[1]);
  }

  function handleDisableRecurrence() {
    if (!rule) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    patchRule(rule.id, { end_date: yesterday.toISOString().split('T')[0] });
  }

  function handleDeleteRule() {
    if (!task) return;
    if (rule) deleteRule(rule.id);
    onDelete(task.id);
    onClose();
  }
```

- [ ] **Step 3: Wire title/description/project/poms to update the rule when recurring**

In the existing title `<input>` `onBlur` handler, change:
```typescript
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value !== task.title) {
                      onPatch(task.id, { title: e.target.value.trim() });
                    }
                  }}
```
to:
```typescript
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (!val || val === (rule?.title ?? task.title)) return;
                    if (rule) patchRule(rule.id, { title: val });
                    else onPatch(task.id, { title: val });
                  }}
```

And update the `defaultValue` of that input from `task.title` to `rule?.title ?? task.title`.

For the description `<textarea>`, change its `onBlur` to:
```typescript
                  onBlur={(e) => {
                    const val = e.target.value.trim() || null;
                    const current = rule?.description ?? task.description;
                    if (val !== current) {
                      if (rule) patchRule(rule.id, { description: val });
                      else onPatch(task.id, { description: val });
                    }
                  }}
```

And update its `defaultValue` from `task.description ?? ''` to `rule?.description ?? task.description ?? ''`.

For the project `<select>`, change its `onChange` to:
```typescript
                  onChange={(e) => {
                    const val = e.target.value || null;
                    if (rule) patchRule(rule.id, { project_id: val });
                    else onPatch(task.id, { project_id: val });
                  }}
```

And its `value` from `task.projectId ?? ''` to `rule?.projectId ?? task.projectId ?? ''`.

For estimated pomodoros `<input>`, change `onBlur` to:
```typescript
                  onBlur={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    const current = rule?.estimatedPomodoros ?? task.estimatedPomodoros;
                    if (val !== current) {
                      if (rule) patchRule(rule.id, { estimated_pomodoros: val });
                      else onPatch(task.id, { estimated_pomodoros: val });
                    }
                  }}
```

And its `defaultValue` from `task.estimatedPomodoros ?? ''` to `rule?.estimatedPomodoros ?? task.estimatedPomodoros ?? ''`.

- [ ] **Step 4: Replace the delete button to handle rule deletion, and add RecurrenceConfig section**

Change the delete button's `onClick` from:
```typescript
                  onClick={() => { onDelete(task.id); onClose(); }}
```
to:
```typescript
                  onClick={handleDeleteRule}
```

After the `<Field label="预估番茄数">...</Field>` block and before `<Field label="番茄记录">`, add:

```tsx
              <Field label="重复">
                <RecurrenceConfig
                  rule={rule}
                  onEnable={handleEnableRecurrence}
                  onUpdate={handleUpdateRule}
                  onDisable={handleDisableRecurrence}
                />
              </Field>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/qq/Documents/Claude/GTDProject/gtd-app/client
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/board/TaskDrawer.tsx
git commit -m "feat: integrate RecurrenceConfig into TaskDrawer with rule-aware field updates"
```

---

## Task 9: TaskCard Badge

**Files:**
- Modify: `client/src/components/board/TaskCard.tsx`
- Modify: `client/src/components/board/BoardPage.tsx` (pass rules to cards)

- [ ] **Step 1: Add recurrence badge to TaskCard**

In `client/src/components/board/TaskCard.tsx`, update the `Props` interface to add:

```typescript
  recurringRule?: { recurrenceType: string; recurrenceDays: string | null } | null;
```

Add a helper function before the `TaskCard` component:

```typescript
function recurrenceLabel(type: string, days: string | null): string {
  switch (type) {
    case 'daily': return '↻ 每天';
    case 'weekdays': return '↻ 工作日';
    case 'non_workdays': return '↻ 非工作日';
    case 'custom_days': {
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      const selected = (JSON.parse(days ?? '[]') as number[]).map((d) => dayNames[d]);
      return `↻ 每周${selected.join('')}`;
    }
    default: return '↻ 重复';
  }
}
```

In the component, add `recurringRule` to the destructured props:

```typescript
export function TaskCard({ task, project, onClick, onStartPomodoro, isDragOverlay = false, accent, recurringRule }: Props) {
```

Inside the card JSX, in the footer section (after the `TomatoPips` and before the closing `</div>` of the footer), add the badge if the task is recurring and not done:

```tsx
      {/* Footer: tomato pips + recurrence badge + quick-start */}
```

Find the existing footer div that wraps `TomatoPips`. After the `TomatoPips` component, add:

```tsx
          {recurringRule && !isDone && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-md"
              style={{
                background: 'color-mix(in oklab, var(--brand) 12%, transparent)',
                color: 'var(--brand)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {recurrenceLabel(recurringRule.recurrenceType, recurringRule.recurrenceDays)}
            </span>
          )}
```

Note: if there are no poms and no estimated, the footer div isn't rendered. Update the footer condition from:

```typescript
      {(task.completedPomodoros > 0 || task.estimatedPomodoros) && (
```

to:

```typescript
      {(task.completedPomodoros > 0 || task.estimatedPomodoros || (recurringRule && !isDone)) && (
```

- [ ] **Step 2: Pass recurringRule to TaskCard in BoardPage**

Find `client/src/components/board/BoardPage.tsx`. Locate where `<TaskCard>` is rendered (inside `KanbanColumn` or directly). Add the `useRecurringStore` import:

```typescript
import { useRecurringStore } from '../../store/recurringStore';
```

In the component, get rules:

```typescript
  const rules = useRecurringStore((s) => s.rules);
```

When rendering each `<TaskCard>`, pass:

```tsx
recurringRule={task.recurringRuleId ? (rules.find((r) => r.id === task.recurringRuleId) ?? null) : null}
```

If `TaskCard` is rendered inside a child component like `KanbanColumn`, thread the prop through as needed.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/qq/Documents/Claude/GTDProject/gtd-app/client
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/board/TaskCard.tsx client/src/components/board/BoardPage.tsx
git commit -m "feat: show recurrence type badge on recurring task cards"
```

---

## Task 10: HolidayManager & Settings

**Files:**
- Create: `client/src/components/settings/HolidayManager.tsx`
- Modify: `client/src/components/settings/SettingsPage.tsx`

- [ ] **Step 1: Create HolidayManager.tsx**

```tsx
import { useState, useEffect } from 'react';
import { Trash2, Plus } from 'lucide-react';
import * as api from '../../api/client';
import type { PublicHoliday } from '../../types';

export function HolidayManager() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [newDate, setNewDate] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.getHolidays(year).then(setHolidays);
  }, [year]);

  async function handleAdd() {
    if (!newDate || !newName.trim()) return;
    const holiday = await api.createHoliday({ date: newDate, name: newName.trim() });
    setHolidays((prev) => [...prev, holiday].sort((a, b) => a.date.localeCompare(b.date)));
    setNewDate('');
    setNewName('');
    setAdding(false);
  }

  async function handleDelete(id: number) {
    await api.deleteHoliday(id);
    setHolidays((prev) => prev.filter((h) => h.id !== id));
  }

  return (
    <div className="space-y-3">
      {/* Year selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setYear((y) => y - 1)}
          className="px-2 py-1 rounded-lg text-sm"
          style={{ background: 'var(--bg-2)', color: 'var(--ink-mute)' }}
        >
          ‹
        </button>
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
          {year} 年
        </span>
        <button
          onClick={() => setYear((y) => y + 1)}
          className="px-2 py-1 rounded-lg text-sm"
          style={{ background: 'var(--bg-2)', color: 'var(--ink-mute)' }}
        >
          ›
        </button>
        <span className="ml-auto text-xs" style={{ color: 'var(--ink-mute)' }}>
          {holidays.length} 个节假日
        </span>
      </div>

      {/* Holiday list */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--line)' }}
      >
        {holidays.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--ink-mute)' }}>
            暂无节假日数据
          </p>
        ) : (
          holidays.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between px-3 py-2"
              style={{ borderBottom: '1px solid var(--line-soft)' }}
            >
              <span className="text-xs font-mono" style={{ color: 'var(--ink-mute)' }}>
                {h.date}
              </span>
              <span className="text-sm flex-1 ml-3" style={{ color: 'var(--ink)' }}>
                {h.name}
              </span>
              <button
                onClick={() => handleDelete(h.id)}
                className="p-1 rounded hover:opacity-70 transition-opacity"
                style={{ color: 'var(--ink-mute)' }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add holiday */}
      {adding ? (
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="text-sm rounded-lg px-2 py-1.5 outline-none"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="节假日名称"
            className="flex-1 text-sm rounded-lg px-2 py-1.5 outline-none"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          />
          <button
            onClick={handleAdd}
            className="text-sm px-3 py-1.5 rounded-lg font-medium"
            style={{ background: 'var(--brand)', color: '#fff' }}
          >
            添加
          </button>
          <button
            onClick={() => setAdding(false)}
            className="text-sm"
            style={{ color: 'var(--ink-mute)' }}
          >
            取消
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-sm"
          style={{ color: 'var(--brand)' }}
        >
          <Plus className="w-4 h-4" />
          添加节假日
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add HolidayManager section to SettingsPage.tsx**

Add the import at the top of `client/src/components/settings/SettingsPage.tsx`:

```typescript
import { HolidayManager } from './HolidayManager';
```

At the bottom of the settings page JSX (before the final closing tag), add a new section. Find the last `<section>` block and after it, add:

```tsx
        <section
          className="rounded-2xl p-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
        >
          <h2
            className="text-base font-semibold mb-1"
            style={{ color: 'var(--ink)' }}
          >
            节假日管理
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--ink-mute)' }}>
            用于"非工作日"重复任务的判断依据。已内置 2026 年中国法定节假日，每年需手动更新。
          </p>
          <HolidayManager />
        </section>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/qq/Documents/Claude/GTDProject/gtd-app/client
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/settings/HolidayManager.tsx client/src/components/settings/SettingsPage.tsx
git commit -m "feat: add HolidayManager component and settings section for holiday CRUD"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| `recurring_rules` + `public_holidays` tables | Task 1 |
| `tasks.recurring_rule_id` FK | Task 1 |
| `tasks.status = 'skipped'` for expired instances | Task 3 (generate route) |
| 2026 Chinese holiday seed data | Task 2 |
| `POST /api/recurring/generate` logic | Task 3 |
| `GET/POST/PATCH/DELETE /api/recurring` | Task 3 |
| `GET/POST/DELETE /api/holidays` | Task 4 |
| Board excludes `skipped` tasks | Task 3 (tasks route `ne` filter) |
| RecurringRule + PublicHoliday frontend types | Task 5 |
| API client functions | Task 5 |
| Zustand store for rules | Task 6 |
| App-startup generate call | Task 6 |
| Recurrence toggle + type chips + day picker | Task 7 |
| TaskDrawer: recurrence section | Task 8 |
| TaskDrawer: rule-aware field updates | Task 8 |
| TaskCard: ↻ type badge | Task 9 |
| Settings: HolidayManager | Task 10 |
| Editing rule updates title/desc/project/poms (not task) | Task 8 |
| Disabling recurrence sets end_date to yesterday | Task 8 |
| Enabling on existing task uses last_generated_date=today | Task 8 |

**No placeholders found.** All steps contain explicit code.

**Type consistency:** `RecurrenceType` defined in Task 5 → used in Task 7 (`RecurrenceConfig`) → used in Task 9 (`recurrenceLabel`). `RecurringRule` defined in Task 5 → used consistently in Tasks 6, 7, 8, 9.

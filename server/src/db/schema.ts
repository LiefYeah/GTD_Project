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

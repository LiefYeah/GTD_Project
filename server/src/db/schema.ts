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

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  projectId: text('project_id').references(() => projects.id),
  // status: 'planned' | 'in_progress' | 'on_hold' | 'done'
  status: text('status').notNull().default('planned'),
  priority: integer('priority').notNull().default(0),
  // fractional indexing: 取相邻两卡 sort_order 中点，避免频繁全列重排
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
});

export const pomodoros = sqliteTable('pomodoros', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id),
  startedAt: integer('started_at').notNull(),
  endedAt: integer('ended_at'),
  durationSeconds: integer('duration_seconds'),
  // status: 'running' | 'completed' | 'interrupted'
  status: text('status').notNull(),
  notes: text('notes'),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Pomodoro = typeof pomodoros.$inferSelect;
export type NewPomodoro = typeof pomodoros.$inferInsert;

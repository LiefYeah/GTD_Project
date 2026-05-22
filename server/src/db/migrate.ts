import { sqlite } from '../lib/db';

export function runMigrations(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id          TEXT    PRIMARY KEY,
      name        TEXT    NOT NULL,
      description TEXT,
      color       TEXT,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL,
      archived    INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id                   TEXT    PRIMARY KEY,
      title                TEXT    NOT NULL,
      description          TEXT,
      project_id           TEXT    REFERENCES projects(id),
      status               TEXT    NOT NULL DEFAULT 'planned',
      priority             INTEGER NOT NULL DEFAULT 0,
      sort_order           REAL    NOT NULL DEFAULT 0,
      due_date             INTEGER,
      scheduled_start      INTEGER,
      scheduled_end        INTEGER,
      all_day              INTEGER NOT NULL DEFAULT 0,
      estimated_pomodoros  INTEGER,
      completed_pomodoros  INTEGER NOT NULL DEFAULT 0,
      created_at           INTEGER NOT NULL,
      updated_at           INTEGER NOT NULL,
      completed_at         INTEGER
    );

    CREATE TABLE IF NOT EXISTS pomodoros (
      id               TEXT    PRIMARY KEY,
      task_id          TEXT    NOT NULL REFERENCES tasks(id),
      started_at       INTEGER NOT NULL,
      ended_at         INTEGER,
      duration_seconds INTEGER,
      status           TEXT    NOT NULL,
      notes            TEXT
    );
  `);

  console.log('[db] migrations OK');
}

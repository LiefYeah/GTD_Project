import { sqlite } from '../lib/db';

export function runMigrations(): void {
  // ── Initial table creation ─────────────────────────────────────────────────
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
      task_id          TEXT    REFERENCES tasks(id),
      started_at       INTEGER NOT NULL,
      ended_at         INTEGER,
      duration_seconds INTEGER,
      status           TEXT    NOT NULL,
      notes            TEXT
    );
  `);

  // ── Migration M001: make pomodoros.task_id nullable ───────────────────────
  // SQLite does not support DROP NOT NULL directly; we must recreate the table.
  type ColInfo = { cid: number; name: string; type: string; notnull: number; dflt_value: unknown; pk: number };
  const cols = sqlite.prepare('PRAGMA table_info(pomodoros)').all() as ColInfo[];
  const taskIdCol = cols.find((c) => c.name === 'task_id');
  if (taskIdCol && taskIdCol.notnull === 1) {
    sqlite.exec(`
      ALTER TABLE pomodoros RENAME TO pomodoros_m001_old;

      CREATE TABLE pomodoros (
        id               TEXT    PRIMARY KEY,
        task_id          TEXT    REFERENCES tasks(id),
        started_at       INTEGER NOT NULL,
        ended_at         INTEGER,
        duration_seconds INTEGER,
        status           TEXT    NOT NULL,
        notes            TEXT
      );

      INSERT INTO pomodoros SELECT * FROM pomodoros_m001_old;
      DROP TABLE pomodoros_m001_old;
    `);
    console.log('[db] M001: pomodoros.task_id is now nullable');
  }

  console.log('[db] migrations OK');
}

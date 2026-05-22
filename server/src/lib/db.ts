import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema';
import path from 'path';
import fs from 'fs';

// data/ 目录在 server/ 的上级（gtd-app/data/）
// process.cwd() is gtd-app/server/ when npm workspace script runs
const dataDir = path.resolve(process.cwd(), '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(path.join(dataDir, 'gtd.db'));

// WAL 提升并发读性能；外键约束 SQLite 默认关闭，需显式开启
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export { sqlite };

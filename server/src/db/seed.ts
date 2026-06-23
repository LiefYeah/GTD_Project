import { randomUUID } from 'crypto';
import { sqlite } from '../lib/db';

function todayAt(hour: number, minute = 0): number {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

function daysFromNow(days: number, hour = 10): number {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

export function seedDatabase(): void {
  const { count } = sqlite
    .prepare('SELECT COUNT(*) as count FROM projects')
    .get() as { count: number };
  if (count > 0) return;

  const now = Date.now();
  const projectId = randomUUID();
  const task1Id = randomUUID();
  const task2Id = randomUUID();
  const task3Id = randomUUID();
  const task4Id = randomUUID();
  const pom1Id = randomUUID();
  const pom2Id = randomUUID();

  sqlite
    .prepare(
      `INSERT INTO projects (id, name, description, color, created_at, updated_at, archived)
       VALUES (?, ?, ?, ?, ?, ?, 0)`
    )
    .run(projectId, 'GTD 入门项目', '用于演示工具功能的示例项目', '#6366f1', now, now);

  // planned: 今天下午 14:00–15:30，两天后截止
  sqlite
    .prepare(
      `INSERT INTO tasks (id, title, description, project_id, status, priority, sort_order,
         due_date, scheduled_start, scheduled_end, all_day,
         estimated_pomodoros, completed_pomodoros, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'planned', 1, 1.0, ?, ?, ?, 0, 3, 0, ?, ?)`
    )
    .run(
      task1Id,
      '阅读《搞定》第一章',
      '了解 GTD 的核心理念：收集所有未尽事宜，清空大脑。',
      projectId,
      daysFromNow(2),
      todayAt(14, 0),
      todayAt(15, 30),
      now,
      now
    );

  // in_progress: 今天上午 10:00–11:30，已完成 1 个番茄
  sqlite
    .prepare(
      `INSERT INTO tasks (id, title, description, project_id, status, priority, sort_order,
         scheduled_start, scheduled_end, all_day,
         estimated_pomodoros, completed_pomodoros, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'in_progress', 2, 2.0, ?, ?, 0, 3, 1, ?, ?)`
    )
    .run(
      task2Id,
      '整理工作收件箱',
      '处理积压的邮件、便条和文件，全部录入 GTD 系统。',
      projectId,
      todayAt(10, 0),
      todayAt(11, 30),
      now,
      now
    );

  // done: 全天事件标记
  sqlite
    .prepare(
      `INSERT INTO tasks (id, title, description, project_id, status, priority, sort_order,
         scheduled_start, scheduled_end, all_day,
         estimated_pomodoros, completed_pomodoros, created_at, updated_at, completed_at)
       VALUES (?, ?, ?, ?, 'done', 0, 3.0, ?, ?, 1, 2, 2, ?, ?, ?)`
    )
    .run(
      task3Id,
      '安装并配置 GTD 工具',
      '完成工具安装，验证数据库初始化和种子数据正常。',
      projectId,
      daysFromNow(1),
      daysFromNow(2),
      now,
      now,
      now
    );

  // on_hold: 明天截止（测试临近截止橙色边框）
  sqlite
    .prepare(
      `INSERT INTO tasks (id, title, description, project_id, status, priority, sort_order,
         due_date, all_day, estimated_pomodoros, completed_pomodoros, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'on_hold', 1, 4.0, ?, 0, 4, 0, ?, ?)`
    )
    .run(
      task4Id,
      '制定本周回顾清单',
      '每周回顾是 GTD 系统维持运转的关键，需定期执行。',
      projectId,
      daysFromNow(1),
      now,
      now
    );

  // 番茄记录：task2 完成（2 小时前）
  sqlite
    .prepare(
      `INSERT INTO pomodoros (id, task_id, started_at, ended_at, duration_seconds, status, notes)
       VALUES (?, ?, ?, ?, 1500, 'completed', ?)`
    )
    .run(
      pom1Id,
      task2Id,
      now - 2 * 3_600_000,
      now - 2 * 3_600_000 + 1_500_000,
      '完成了邮件分类，处理了 12 封积压邮件'
    );

  // 番茄记录：task3 完成（26 小时前，即昨天）
  sqlite
    .prepare(
      `INSERT INTO pomodoros (id, task_id, started_at, ended_at, duration_seconds, status, notes)
       VALUES (?, ?, ?, ?, 1500, 'completed', ?)`
    )
    .run(
      pom2Id,
      task3Id,
      now - 26 * 3_600_000,
      now - 26 * 3_600_000 + 1_500_000,
      '完成了工具安装和初始化配置'
    );

  console.log('[db] seed data inserted');

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
}

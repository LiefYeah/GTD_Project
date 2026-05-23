# GTD App

一个基于番茄工作法的 GTD（Getting Things Done）任务管理工具。

## 功能特性

- **看板视图** — 双栏布局：左侧四列看板（计划 / 进行中 / 搁置 / 已完成），支持跨列和列内拖拽排序；右侧今日日程面板，内嵌周视图、日程列表和番茄钟卡片
- **日历视图** — 月 / 周 / 日三种视图，基于 CSS Grid + date-fns 自建，不依赖任何外部日历库；URL 参数保留视图与日期状态，刷新不丢失
- **番茄计时器** — 全局常驻底栏，跨页面持久；看板页在右侧面板内嵌完整番茄卡片；自然结束后原子更新任务计数
- **项目管理** — 创建 / 编辑 / 归档项目，颜色标记，任务完成率进度条，累计番茄数统计
- **数据导入导出** — 导出全量 JSON；增量导入（按 ID 去重，已存在的记录自动跳过，不产生重复）
- **深色模式** — 一键切换，首次渲染前应用 `dark` 类，无闪烁
- **键盘快捷键** — `B` 看板 · `C` 日历 · `P` 项目 · `S` 设置 · `Esc` 关闭抽屉

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 · TypeScript · Vite 5 · Tailwind CSS 3 |
| 状态管理 | Zustand 4（含 persist 中间件） |
| 拖拽 | @dnd-kit/core + @dnd-kit/sortable |
| 后端 | Node.js 20 · Express 4 |
| 数据库 | SQLite（better-sqlite3 同步 API） |
| ORM | Drizzle ORM（自动建表迁移） |
| 日期处理 | date-fns |
| 进程管理 | concurrently |

## 快速开始

```bash
# 安装依赖
npm install

# 同时启动前后端（concurrently）
npm run dev
```

- 前端：http://localhost:5173
- 后端 API：http://localhost:3001/api

首次启动时服务端自动建表并写入示例数据（1 个项目、3 个不同状态任务、若干带排期字段的任务），打开即可看到效果。

## 项目结构

```
gtd-app/
├── client/               # React 前端
│   └── src/
│       ├── api/          # fetch 封装（snake_case ↔ camelCase 自动转换）
│       ├── components/
│       │   ├── board/    # 看板页（BoardPage, KanbanColumn, TaskCard, TaskDrawer,
│       │   │             #          FocusHero, PomodoroCard, TodaySchedule, WeekPanel…）
│       │   ├── calendar/ # 日历页（CalendarPage, MonthView, WeekView, DayView）
│       │   ├── pomodoro/ # 全局番茄底栏（PomodoroBar）
│       │   ├── projects/ # 项目管理页
│       │   └── settings/ # 设置页
│       ├── hooks/        # useKeyboardShortcuts, useNow
│       ├── lib/          # calendar 工具函数, shadcn utils
│       ├── store/        # Zustand stores（board, calendar, pomodoro, settings）
│       └── types.ts      # 前端类型定义
├── server/               # Express 后端
│   └── src/
│       ├── db/           # Drizzle schema + migrate + seed
│       ├── lib/          # better-sqlite3 连接
│       └── routes/       # projects, tasks, pomodoros, calendar, import
├── data/                 # SQLite 数据文件（已加入 .gitignore，可直接 cp 迁移）
└── package.json          # npm workspaces 根配置
```

## API 路由

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/projects` | 获取所有未归档项目 |
| POST | `/api/projects` | 创建项目 |
| PATCH | `/api/projects/:id` | 更新项目 |
| DELETE | `/api/projects/:id` | 归档项目（软删除） |
| GET | `/api/tasks` | 获取任务（支持 `?project_id=` `?status=` 筛选） |
| POST | `/api/tasks` | 创建任务 |
| PATCH | `/api/tasks/:id` | 更新任务（状态变更、排序、排期等） |
| DELETE | `/api/tasks/:id` | 删除任务 |
| GET | `/api/pomodoros` | 获取所有番茄记录（支持 `?task_id=`） |
| POST | `/api/pomodoros` | 开始番茄（写入 started_at, status=running） |
| PATCH | `/api/pomodoros/:id/complete` | 完成番茄（事务：写 ended_at + 任务计数 +1） |
| PATCH | `/api/pomodoros/:id/interrupt` | 中断番茄 |
| GET | `/api/pomodoros/today` | 今日完成的番茄列表 |
| GET | `/api/calendar?start=&end=` | 时间窗内的任务（按 scheduled_* / due_date）+ 番茄记录 |
| POST | `/api/import` | 增量导入 JSON（按 ID 去重） |

## 数据库迁移与备份

```bash
# 备份 / 迁移：直接复制单文件即可
cp data/gtd.db data/gtd.db.bak

# 数据库文件路径
data/gtd.db
```

服务端启动时自动运行 `runMigrations()`，新版本字段会自动补齐，无需手动执行任何迁移命令。

## 数据导入导出

在设置页（`/settings`）操作：

- **导出**：将所有任务、项目、番茄记录打包为 JSON 文件（文件名格式 `gtd-export-YYYY-MM-DD.json`）。
- **导入**：选择由本应用导出的 JSON 文件，按 ID 增量合并：已存在的记录跳过，仅插入新记录；引用了不存在项目的任务会将 `project_id` 置为 null 而非报错。

## 设计决策

- **看板排序**：`sort_order` 使用 REAL 类型，拖拽时取相邻两卡中点，避免全列重排
- **乐观更新**：先改本地 Zustand store，API 失败后通过 `load()` 回滚
- **番茄计时持久化**：运行中的番茄状态存入 `sessionStorage`（含 `startedAt` 时间戳），刷新后重算剩余秒数，不依赖 `setInterval` 精度
- **深色模式**：`main.tsx` 在首次渲染前读取 localStorage 并应用 `dark` class，避免白闪；Tailwind `darkMode: ['class']` + CSS 变量驱动
- **camelCase ↔ snake_case**：API 请求体用 snake_case，前端 TypeScript 类型用 camelCase，统一在 `api/client.ts` 转换
- **日历视图**：纯 CSS Grid + date-fns 自建，不引入 FullCalendar / react-big-calendar，保持 Notion 极简风格
- **番茄计数事务**：`PATCH /api/pomodoros/:id/complete` 在 SQLite 事务内同时写 `ended_at` 和 `tasks.completed_pomodoros += 1`，保证原子性

## 后续可扩展点

- 子任务 / 清单（在现有任务 `description` 字段基础上支持 Markdown checklist）
- 重复任务（新增 `recurrence_rule` 字段）
- 桌面通知静默期配置
- 多设备同步（将 SQLite 替换为 libSQL/Turso 即可保持 API 兼容）

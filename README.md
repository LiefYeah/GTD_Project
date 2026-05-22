# GTD App

一个基于番茄工作法的 GTD（Getting Things Done）任务管理工具。

## 功能特性

- **看板视图** — 四列（计划 / 进行中 / 搁置 / 已完成），支持跨列和列内拖拽排序
- **日历视图** — 月/周/日三种视图，时间轴展示排期任务
- **番茄计时器** — 固定底栏，跨页面持久，刷新后自动恢复
- **项目管理** — 创建/编辑/归档项目，带颜色标记和任务进度条
- **设置** — 可调节专注/短休/长休时长（持久化到 localStorage），JSON 数据导出
- **深色模式** — 一键切换，无闪烁
- **键盘快捷键** — `B` 看板 · `C` 日历 · `P` 项目 · `S` 设置 · `Esc` 关闭抽屉

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 · TypeScript · Vite 5 · Tailwind CSS 3 |
| 状态管理 | Zustand 4（含 persist 中间件） |
| 拖拽 | @dnd-kit/core + @dnd-kit/sortable |
| 后端 | Node.js 20 · Express 4 |
| 数据库 | SQLite（better-sqlite3 同步 API） |
| ORM | Drizzle ORM |

## 快速开始

```bash
# 安装依赖
npm install

# 同时启动前后端（concurrently）
npm run dev
```

- 前端：http://localhost:5173
- 后端 API：http://localhost:3001/api

## 项目结构

```
gtd-app/
├── client/               # React 前端
│   └── src/
│       ├── api/          # fetch 封装（snake_case ↔ camelCase 转换）
│       ├── components/   # 页面组件
│       │   ├── board/    # 看板页（KanbanColumn, TaskCard, TaskDrawer）
│       │   ├── calendar/ # 日历页（MonthView, WeekView, DayView）
│       │   ├── pomodoro/ # 番茄底栏
│       │   ├── projects/ # 项目管理页
│       │   └── settings/ # 设置页
│       ├── hooks/        # 自定义 Hook
│       ├── store/        # Zustand stores
│       └── types.ts      # 前端类型定义
└── server/               # Express 后端
    └── src/
        ├── db/           # Drizzle schema + migrations + seed
        ├── lib/          # DB 连接
        └── routes/       # REST API 路由
```

## API 路由

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/projects` | 获取所有未归档项目 |
| POST | `/api/projects` | 创建项目 |
| PATCH | `/api/projects/:id` | 更新项目 |
| DELETE | `/api/projects/:id` | 归档项目（软删除） |
| GET | `/api/tasks` | 获取所有任务 |
| POST | `/api/tasks` | 创建任务 |
| PATCH | `/api/tasks/:id` | 更新任务 |
| DELETE | `/api/tasks/:id` | 删除任务 |
| GET | `/api/pomodoros` | 获取所有番茄记录 |
| POST | `/api/pomodoros` | 开始番茄 |
| PATCH | `/api/pomodoros/:id/complete` | 完成番茄（原子更新任务计数） |
| PATCH | `/api/pomodoros/:id/interrupt` | 中断番茄 |
| GET | `/api/calendar?start=&end=` | 获取时间范围内的任务和番茄 |

## 设计决策

- **排序**: 分数索引（`sort_order` REAL），取相邻两卡中点，避免全列重排
- **乐观更新**: 先改本地 store，API 失败后通过 `load()` 回滚
- **番茄持久化**: 运行中的番茄写入 sessionStorage，包含 `startedAt` 时间戳，刷新后重算剩余秒数
- **深色模式**: Tailwind `darkMode: ['class']` + CSS 变量，main.tsx 读取 localStorage 在首次渲染前应用 `dark` 类，避免闪烁
- **camelCase ↔ snake_case**: API 请求体用 snake_case，前端 TypeScript 类型用 camelCase，在 `api/client.ts` 统一转换

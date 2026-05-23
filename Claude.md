# GTD 工作流工具开发提示词

## 角色与目标

你是一名全栈工程师，需要基于 **Node.js + SQLite** 从零构建一个 **GTD（Getting Things Done）工作流桌面/Web 工具**。项目要求开箱即用：一条命令即可启动，数据库文件随项目可移植，UI 风格参照 **Notion** 的简洁克制美学。

请在动手前先输出一份"项目骨架 + 技术决策"清单让我确认，再开始写代码；写完后用 `README.md` 说明启动方式。

---

## 一、技术栈要求

| 层 | 选型 | 说明 |
|---|---|---|
| 运行时 | Node.js 20+ | LTS 版本 |
| 后端框架 | Express（或 Fastify，二选一并说明理由） | RESTful API |
| 数据库 | SQLite | 使用 `better-sqlite3`，单文件存储于 `./data/gtd.db`，方便迁移 |
| ORM/查询层 | Drizzle ORM 或 Knex（请选一个并说明理由） | 必须支持自动迁移 |
| 前端框架 | React 18 + Vite + TypeScript | 单页应用 |
| 状态管理 | Zustand（轻量优先） | 不要引入 Redux 全家桶 |
| 拖拽库 | `@dnd-kit/core` + `@dnd-kit/sortable` | 看板拖拽核心依赖 |
| UI 库 | Tailwind CSS + shadcn/ui | Notion 风格，避免重 UI 框架 |
| 图标 | lucide-react | 番茄图标可用 emoji 🍅 或自定义 SVG |
| 日期处理 | `date-fns` | 日历计算（不要用 Moment.js，已废弃；不要 Day.js，date-fns 与 tree-shaking 更搭） |
| 日历实现 | 自己基于 CSS Grid 实现，不引入 FullCalendar | 保持 Notion 极简风，库太重 |
| 进程管理 | concurrently | 一键启动前后端 |

**目录结构期望：**
```
gtd-app/
├── server/              # Express 后端
│   ├── src/
│   │   ├── routes/      # tasks, projects, pomodoros
│   │   ├── db/          # schema + migrations
│   │   └── index.ts
├── client/              # React 前端
│   ├── src/
│   │   ├── components/  # Board, TaskCard, PomodoroTimer ...
│   │   ├── store/       # Zustand stores
│   │   └── App.tsx
├── data/                # SQLite 文件存放，加入 .gitignore
├── package.json         # 根目录 workspace
└── README.md
```

---

## 二、核心数据模型

请在 SQLite 中建立以下三张主表，字段必须完整：

### 1. `projects` 项目
| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT (uuid) PK | |
| name | TEXT NOT NULL | 项目名 |
| description | TEXT | 描述（可空） |
| color | TEXT | 颜色标签，hex 值，前端用 |
| created_at | INTEGER | 时间戳 |
| updated_at | INTEGER | 时间戳 |
| archived | INTEGER DEFAULT 0 | 软归档 |

### 2. `tasks` 任务
| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT (uuid) PK | |
| title | TEXT NOT NULL | |
| description | TEXT | 富文本或 Markdown |
| project_id | TEXT FK → projects.id | 关联项目，可空（无项目=收件箱） |
| status | TEXT | `planned` / `in_progress` / `on_hold` / `done` 四种 |
| priority | INTEGER | 0-3，默认 0 |
| sort_order | REAL | 同一状态列内的排序权重，拖拽时更新 |
| due_date | INTEGER | 截止时间戳，可空 |
| scheduled_start | INTEGER | **排期开始时间戳**，可空（用于日历显示） |
| scheduled_end | INTEGER | **排期结束时间戳**，可空（用于日历显示） |
| all_day | INTEGER DEFAULT 0 | 是否全天事件（1=是，忽略具体时分） |
| estimated_pomodoros | INTEGER | 预估番茄数，可空 |
| completed_pomodoros | INTEGER DEFAULT 0 | **每完成一个番茄钟自动 +1** |
| created_at | INTEGER | |
| updated_at | INTEGER | |
| completed_at | INTEGER | 移入 done 列时填充 |

### 3. `pomodoros` 番茄钟记录
| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT (uuid) PK | |
| task_id | TEXT FK → tasks.id NOT NULL | **必须关联任务** |
| started_at | INTEGER NOT NULL | |
| ended_at | INTEGER | 完成时填充 |
| duration_seconds | INTEGER | 实际时长（一般 1500=25min，可配置） |
| status | TEXT | `completed` / `interrupted` / `running` |
| notes | TEXT | 番茄复盘备注（可空） |

> 完成番茄钟（status=completed）后，通过事务原子地把 `tasks.completed_pomodoros` 自增 1。中断（interrupted）的不计入累计。

> **`due_date` vs `scheduled_*` 字段的语义区分**：`due_date` 是任务的"截止日期"（deadline，必须完成的最晚时间）；`scheduled_start/end` 是"我打算什么时候做这件事"（计划执行时间块）。两者独立，可同时存在。日历主要按 `scheduled_*` 渲染时间块，按 `due_date` 渲染当日的截止标记（如红色小旗）。

---

## 三、核心功能详细规格

### A. 看板页（主页 `/board`，应用首屏）

页面布局（**从上到下、从左到右**）：

```
┌─────────────────────────────────────────────────────────────┐
│  顶部栏：项目下拉筛选 ▼   |    🍅 番茄钟控件（常驻）         │
│                          ┌──────────────────────────┐       │
│                          │ 当前任务：[任务名]       │       │
│                          │ 25:00  [▶ 开始/⏸ 暂停/⏹]│       │
│                          │ 今日完成：🍅🍅🍅🍅 (4)   │       │
│                          └──────────────────────────┘       │
├─────────────┬─────────────┬─────────────┬───────────────────┤
│  📋 计划    │  🔥 进行中  │  ⏸ 搁置     │  ✅ 已完成        │
│  (planned)  │ (in_progress)│ (on_hold)   │  (done)           │
├─────────────┼─────────────┼─────────────┼───────────────────┤
│ ┌─────────┐ │ ┌─────────┐ │             │                   │
│ │ 任务卡片│ │ │ 任务卡片│ │             │                   │
│ │ 🍅🍅 2/5│ │ │ 🍅🍅🍅 3│ │             │                   │
│ │ #项目A  │ │ │ #项目B  │ │             │                   │
│ └─────────┘ │ └─────────┘ │             │                   │
└─────────────┴─────────────┴─────────────┴───────────────────┘
```

**功能要求：**

1. **四列分区**：计划 / 进行中 / 搁置 / 已完成，列头显示该列任务数。
2. **拖拽**：
   - 任务卡片可在四列之间自由拖拽，松手即写库（PATCH `/api/tasks/:id` 同时更新 `status` 和 `sort_order`）。
   - 同列内拖拽改变顺序，使用 `sort_order` 字段（取相邻两卡 sort_order 的中点，避免频繁全列重排）。
   - 拖入"已完成"时自动写 `completed_at`，并触发轻量动画。
3. **任务卡片显示**：
   - 标题、所属项目色标、🍅 累计图标（`completed_pomodoros` 个番茄 + `/estimated_pomodoros`，如 🍅🍅🍅 3/5）。
   - 番茄数大于 5 个时显示为 "🍅 × 8" 而非密密麻麻的图标，保持简洁。
   - 截止日期临近时（≤2 天）边框变橙，逾期变红。
4. **新建任务**：每列底部"+ 添加任务"按钮，输入标题回车即创建到该列。
5. **任务详情**：点击卡片右侧滑出抽屉（参考 Notion 的 side peek），展示完整字段，支持编辑、查看番茄历史记录。

### B. 番茄钟（常驻看板顶部）

1. **关联任务**：开始前必须选择一个任务（默认选中"进行中"列的首个任务）。未选择不可启动。
2. **状态机**：`idle → running → (paused) → completed | interrupted`。
3. **时长**：默认 25 分钟工作 / 5 分钟休息 / 4 个一循环后 15 分钟长休（可在设置页改）。
4. **完成处理**：
   - 自然结束 → 番茄记录 `status=completed` → 任务 `completed_pomodoros += 1` → 浏览器 Notification + 提示音。
   - 手动停止 → 弹窗确认是 `interrupted` 还是 `completed`。
5. **页面切走仍计时**：用 `Date.now()` 计算剩余时间，不依赖 `setInterval` 精度，避免后台 throttle。
6. **今日番茄数**：番茄钟控件底部显示今天累计完成的番茄数（图标横排，超过 8 个折叠为数字）。

### C. 项目管理页 `/projects`

- 项目列表（卡片视图），每张卡片显示：项目名、色标、任务总数、完成率进度条、累计番茄数。
- 新建 / 编辑 / 归档项目。
- 点击项目卡片 → 进入该项目的看板视图（看板页 URL 带 `?project=xxx`，复用同一组件）。

### D. 日历页 `/calendar`（系统内自建，不接入任何外部日历服务）

**重要**：不要使用 Google Calendar / Outlook / iCal 订阅等任何外部集成，所有日历数据来自本地 SQLite 中的 `tasks` 和 `pomodoros` 表。**不要**引入 FullCalendar 这类重型库（它默认绑定 jQuery/Moment 生态会显得臃肿），用 `react-big-calendar` 或干脆基于 CSS Grid + `date-fns` 自己实现（推荐后者，更贴合 Notion 极简风格）。

#### D.1 三种视图切换

顶部 Tab 切换 **月 / 周 / 日** 三种视图，URL 反映视图与日期，如 `/calendar?view=week&date=2026-05-21`，刷新不丢状态。

**月视图（默认）**：
- 标准 7×N 网格，今天高亮，周末浅灰底。
- 每个日期格子内显示：
  - 当天 `scheduled_*` 落在该日的任务（最多显示 3 条小条，超出显示"+N 更多"）。
  - 当天 `due_date` 的任务（前面带 🚩 小旗图标）。
  - 当天完成的番茄数角标（右上角小红点 + 数字，如 `🍅 6`）。
- 任务条颜色 = 所属项目色，没有项目用灰色。
- 点击日期格子 → 跳转日视图查看详情。
- 点击任务条 → 弹出与看板相同的任务详情抽屉。

**周视图**：
- 左侧时间轴（0:00–24:00，可配置工作时段如 7:00–22:00 为默认显示范围，凌晨折叠）。
- 7 天纵向排列，每个 `scheduled_start/end` 的任务渲染为时间块，块内显示标题 + 🍅 累计。
- 已完成的番茄钟（`pomodoros` 表中 status=completed 的记录）以**半透明红色细条**叠加在时间轴对应位置，让"计划 vs 实际"一目了然。
- 全天事件（`all_day=1`）单独显示在顶部窄条区域。

**日视图**：
- 单日详细时间轴，左侧时间，右侧任务时间块。
- 右侧栏（或下方）列出：
  - 当日所有任务清单（按状态分组）。
  - 当日番茄钟完成记录列表（时间 + 任务名 + 备注）。
  - 当日累计番茄数大图标展示。

#### D.2 交互（核心）

1. **从看板拖到日历排期**（跨页面拖拽不必做，复杂度高）→ 改为：在任务详情抽屉里有"安排时间"按钮，弹出日期/时间选择器写入 `scheduled_start/end`。
2. **日历内拖拽改时间**：
   - 月视图：拖动任务条到另一天 → 平移 `scheduled_start/end`（保持时长）。
   - 周/日视图：拖动时间块上下移动改开始时间；拖动块底部边缘改时长（resize）。
   - 所有拖拽操作即时 PATCH 到 `/api/tasks/:id`。
3. **日历内新建**：周/日视图下，在空白时间槽点击拖选 → 弹出快速创建任务表单（标题 + 项目，提交后任务直接落在该时间段，状态默认 `planned`）。
4. **从番茄钟联动**：番茄钟开始的同时，可勾选"加入日历"自动给关联任务写入一段 `scheduled_start/end`（等于实际工作时段），方便事后回顾。

#### D.3 数据源约定

- 月/周/日视图都通过 `GET /api/calendar?start=<ts>&end=<ts>` 一次性拿到该时间窗内的：
  - 所有 `scheduled_start` 或 `scheduled_end` 落在窗口内的任务。
  - 所有 `due_date` 落在窗口内的任务。
  - 所有 `started_at` 落在窗口内的番茄钟记录。
- 前端用 React Query 或 SWR 缓存，切换月份预加载相邻月份。

#### D.4 顶部导航统一

整个应用使用左侧固定导航栏（参考 Notion 侧边栏）：📋 看板 / 📅 日历 / 📁 项目 / ⚙️ 设置。看板顶部的番茄钟控件**在所有页面都常驻**（位置：右上角悬浮，可折叠为小药丸），这样在日历页工作时也能看到当前番茄钟状态。

### E. 设置页 `/settings`

- 工作 / 短休 / 长休时长。
- **日历设置**：周起始日（周日/周一）、日历显示时段范围（如 7:00–22:00）、默认视图（月/周/日）。
- 数据导出（导出 SQLite 文件下载链接）/ 导入。
- 主题切换（light/dark，Notion 风格的中性灰）。

---

## 四、API 设计（RESTful）

```
GET    /api/projects                  列表
POST   /api/projects                  新建
PATCH  /api/projects/:id              更新
DELETE /api/projects/:id              归档（软删）

GET    /api/tasks?project_id=&status= 列表（支持筛选）
POST   /api/tasks                     新建
PATCH  /api/tasks/:id                 更新（含状态变更、排序）
DELETE /api/tasks/:id                 删除

POST   /api/pomodoros                 开始番茄（写 started_at, status=running）
PATCH  /api/pomodoros/:id/complete    完成（事务：写 ended_at + 任务计数+1）
PATCH  /api/pomodoros/:id/interrupt   中断
GET    /api/pomodoros?task_id=        某任务历史
GET    /api/pomodoros/today           今日完成的番茄列表

GET    /api/calendar?start=&end=      日历窗口数据（返回 { tasks: [...], pomodoros: [...] }）
                                       一次拉取该时间窗内所有 scheduled_*、due_date 落入的任务
                                       和 started_at 落入的番茄记录，前端按视图渲染
```

---

## 五、UI/UX 设计准则（Notion 风格要点）

1. **极简色板**：背景近白（#FAFAFA / dark: #191919），文字深灰，仅项目色标和番茄红 (#E03E3E) 作为高亮色。
2. **不要花哨阴影和渐变**：边框 1px、圆角 6px、悬停时浅灰背景。
3. **字体**：系统字体栈优先（`-apple-system, Inter, ...`）。
4. **间距统一**：用 Tailwind 的 `space-y-2/4`，避免随意像素。
5. **微动效**：拖拽用 dnd-kit 内置过渡；状态变更用 200ms 淡入淡出，不要弹跳。
6. **空状态**：所有列表为空时给一句中性提示 + 一个"创建"按钮，不要插画。

---

## 六、交付要求

1. **可一键启动**：根目录 `npm install && npm run dev` 同时启动后端（3001）和前端（5173），前端代理 API 到后端。
2. **首次启动自动建表**：检测到 `data/gtd.db` 不存在则自动建库 + 跑迁移 + 写入一份示例数据（1 个项目、3 个不同状态的任务），便于第一眼看到效果。
3. **README.md** 必须包含：
   - 启动步骤
   - 目录结构说明
   - 数据库迁移与备份方法（直接 cp `data/gtd.db` 即可迁移）
   - 后续可扩展点
4. **代码规范**：TypeScript strict、ESLint + Prettier 配置好、关键业务逻辑（拖拽排序算法、番茄计数事务）写注释。
5. **错误处理**：API 统一错误格式 `{ error: { code, message } }`；前端用 toast 提示，不抛白屏。

---

## 七、开发顺序建议

请按以下顺序提交，每完成一阶段先让我确认再继续：

1. **阶段 1**：项目骨架 + 数据库 schema + 迁移脚本 + 示例数据种子（示例数据要包含若干带 `scheduled_*` 的任务，方便日历页一上来就有内容）。
2. **阶段 2**：后端 API（projects / tasks / pomodoros / calendar 全部）+ 用 curl 或 REST client 文件演示可调。
3. **阶段 3**：前端看板页（四列 + 拖拽 + 卡片显示，不含番茄钟）。
4. **阶段 4**：番茄钟模块（计时器 + 任务关联 + 计数事务 + 全局常驻悬浮控件）。
5. **阶段 5**：**日历页**（先实现月视图，再周视图，再日视图；先静态展示，再加拖拽改时间，最后加空白拖选新建）。
6. **阶段 6**：项目页 + 设置页 + 数据导入导出。
7. **阶段 7**：打磨（动效、空状态、暗色模式、左侧导航统一、README）。

---

## 八、不要做的事

- ❌ 不要引入 Electron / Tauri，保持纯 Web，浏览器打开即用。
- ❌ 不要用 MongoDB / PostgreSQL，必须 SQLite 单文件。
- ❌ 不要做用户登录系统（单机使用）。
- ❌ 不要把番茄钟做成独立页面，必须常驻在所有页面顶部。
- ❌ **不要接入任何外部日历服务**（Google Calendar / Outlook / Apple iCloud / CalDAV / ics 订阅一律不要），日历视图完全基于本地 SQLite 数据自建。
- ❌ 不要引入 FullCalendar、react-calendar 这类大型日历库，自己用 CSS Grid + date-fns 实现，保持轻量和 Notion 风格统一。
- ❌ 不要堆砌功能（标签、子任务、提醒邮件、重复任务等）在初版里，先把核心闭环做完。

---

**开始吧。先输出阶段 1 的计划和文件清单让我确认。**
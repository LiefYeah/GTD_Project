# 重复任务功能设计文档

**日期：** 2026-06-23  
**状态：** 已批准，待实现

---

## 概述

为 GTD 应用新增重复任务功能，允许用户配置任务按照指定规则自动生成（如每天生成"英语阅读"任务）。每次打开应用时自动补齐当日应生成的实例，过期未完成的实例自动跳过。

---

## 数据模型

### 新增表：`recurring_rules`（重复规则）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | uuid |
| title | TEXT NOT NULL | 任务标题模板 |
| description | TEXT | 任务描述，可空 |
| project_id | TEXT FK → projects.id | 关联项目，可空 |
| estimated_pomodoros | INTEGER | 预估番茄数，可空 |
| recurrence_type | TEXT NOT NULL | `daily` / `weekdays` / `non_workdays` / `custom_days` |
| recurrence_days | TEXT | JSON 数组，仅 `custom_days` 时使用，如 `[1,3,5]` 代表周一三五（0=周日，1=周一，…，6=周六） |
| start_date | TEXT NOT NULL | 规则开始日期，ISO 格式 `2026-06-23` |
| end_date | TEXT | 规则结束日期，可空（为空则永久重复） |
| last_generated_date | TEXT | 上次成功生成实例的日期，用于断点续生；新建规则初始为 start_date 前一天 |
| created_at | INTEGER NOT NULL | 创建时间戳 |
| updated_at | INTEGER NOT NULL | 更新时间戳 |

**重复类型说明：**
- `daily`：每天生成
- `weekdays`：周一至周五生成
- `non_workdays`：周六、周日，以及 `public_holidays` 表中记录的法定节假日
- `custom_days`：由 `recurrence_days` 数组指定的星期几

### 新增表：`public_holidays`（法定节假日）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| date | TEXT NOT NULL | ISO 日期，如 `2026-01-01` |
| name | TEXT | 节假日名称，如"元旦" |
| year | INTEGER NOT NULL | 年份，用于快速按年筛选 |

初始数据：随 seed 脚本内置 2026 年中国法定节假日。每年由管理员（用户）在设置页手动维护。

### `tasks` 表变更

新增字段：
- `recurring_rule_id TEXT` — FK → `recurring_rules.id`，普通任务为 null

新增状态值：
- `status` 字段新增 `skipped` 值，表示过期未完成的重复任务实例
- 看板列表查询须过滤掉 `status = 'skipped'` 的任务

---

## 生成逻辑

### 触发时机

前端 `App.tsx` 初始化时调用一次 `POST /api/recurring/generate`，无需用户感知。

### 服务端算法

```
对每条满足条件的 recurring_rule（end_date 为空 OR end_date >= 今天）：
  计算待补日期范围：
    from = last_generated_date + 1 天
    to   = 今天
  
  对范围内每一天 date：
    1. 判断 date 是否符合 recurrence_type：
       - daily       → 始终匹配
       - weekdays    → getDay(date) in [1,2,3,4,5]
       - non_workdays → getDay(date) in [0,6] OR date in public_holidays
       - custom_days  → getDay(date) in recurrence_days
    
    2. 若匹配：
       a. 若 date < 今天（历史日期）：
          → 不生成任务，直接跳过
       b. 若 date = 今天：
          → 将该规则所有 status IN ('planned','in_progress') 且
            due_date < 今天 的旧实例批量更新为 status='skipped'
          → 若今天尚无该规则的实例，则 INSERT 一条新任务：
              title = rule.title
              description = rule.description
              project_id = rule.project_id
              estimated_pomodoros = rule.estimated_pomodoros
              status = 'planned'
              due_date = 今天的时间戳（当日0点）
              recurring_rule_id = rule.id
  
  更新 rule.last_generated_date = 今天
```

### 边界情况

| 场景 | 处理方式 |
|------|---------|
| 应用离线多天后恢复 | 中间历史日期跳过不生成，只生成今天的实例，历史未完成实例一并设为 skipped |
| 规则 end_date 已过 | 跳过该规则，不再生成 |
| 今天已有该规则实例（重复调用） | 幂等：检测到今天实例已存在则跳过 INSERT |
| 调休（工作日变节假日）| 以 `public_holidays` 表记录为准 |

---

## API 设计

### 重复规则 CRUD

```
GET    /api/recurring              列出所有规则
POST   /api/recurring              新建规则
PATCH  /api/recurring/:id          更新规则（标题/类型等变更影响所有未来实例）
DELETE /api/recurring/:id          删除规则，同时将该规则所有 planned 实例设为 skipped
```

### 实例生成

```
POST   /api/recurring/generate     App 启动时调用，补齐所有规则的当日实例
```

响应示例：
```json
{
  "generated": 2,
  "skipped_stale": 1,
  "rules_processed": 5
}
```

### 节假日管理

```
GET    /api/holidays?year=2026     获取某年节假日列表
POST   /api/holidays               新增节假日 { date, name }
DELETE /api/holidays/:id           删除节假日
```

---

## 前端 UI

### 任务编辑抽屉 — 重复配置区域

位置：任务编辑抽屉底部，现有字段下方新增"重复"区块。

**关闭状态（默认）：**
```
重复
[toggle: OFF]  不重复
```

**开启后（展开）：**
```
重复
[toggle: ON]  已开启

[ 每天 ] [ 工作日 ] [ 非工作日 ] [ 自定义 ▾ ]

结束日期  [选择日期（可选）]
```

**自定义模式下额外显示星期选择器：**
```
( 一 ) ( 二 ) ( 三 ) ( 四 ) ( 五 ) ( 六 ) ( 日 )
```
圆形按钮，可多选，选中态填充蓝色。

**交互规则：**
- toggle 关闭时，将对应 `recurring_rule.end_date` 设为昨天（停止未来生成），已生成的今日实例保留不变
- 重复任务抽屉中修改标题、描述、项目、预估番茄时，实际更新的是 `recurring_rules` 表，而非当前任务实例（今日实例保留原值，明日起的新实例使用更新后的规则）
- 若需单独修改今日实例（不影响规则），用户应先关闭重复开关将实例转为普通任务，再编辑
- 重复规则只能在任务详情抽屉中创建/编辑，不能在看板"快速添加"中配置

### 看板卡片 — 重复标识

重复任务实例在卡片底部标签区显示蓝色徽标：

```
英语阅读
🍅 0/2   学习   ↻ 每天
```

标签文案对应规则类型：
- `daily` → `↻ 每天`
- `weekdays` → `↻ 工作日`
- `non_workdays` → `↻ 非工作日`
- `custom_days` → `↻ 每周 一三五`（展示已选星期）

### 设置页 — 节假日管理

在设置页新增"节假日管理"区块：
- 按年份分组展示现有节假日列表
- "添加节假日"按钮：选择日期 + 输入名称
- 每条记录右侧有删除按钮
- 提示文案说明初始内置 2026 年数据，每年需手动更新

---

## 不在本次范围内

- 重复任务的日历视图高亮（规则级别，非实例）
- 跨实例统计（如"本月英语阅读完成率"）
- iCal / 外部日历同步
- 子任务重复
- 重复间隔（如每 3 天、每 2 周）

---

## 文件影响范围

**后端：**
- `server/src/db/schema.ts` — 新增两张表，修改 tasks
- `server/src/db/migrate.ts` — 新增迁移
- `server/src/db/seed.ts` — 新增 2026 年节假日种子数据
- `server/src/routes/recurring.ts` — 新增路由文件
- `server/src/routes/holidays.ts` — 新增路由文件
- `server/src/index.ts` — 注册新路由

**前端：**
- `client/src/store/recurringStore.ts` — 新增 Zustand store
- `client/src/components/board/TaskDrawer.tsx`（或同类文件）— 新增重复配置区域
- `client/src/components/board/TaskCard.tsx` — 新增重复标签
- `client/src/components/settings/HolidayManager.tsx` — 新增节假日管理组件
- `client/src/App.tsx` — 启动时调用 generate API

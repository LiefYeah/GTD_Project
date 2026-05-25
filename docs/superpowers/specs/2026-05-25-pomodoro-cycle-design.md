# 番茄钟完整循环设计

**日期：** 2026-05-25  
**状态：** 已审批

## 背景

当前番茄钟在专注时间结束后直接进入 idle 状态，没有通知提醒，没有休息阶段，也没有循环逻辑。本次设计补全"专注→提醒→休息→专注"的完整闭环。

## 需求

- 专注结束时触发浏览器 Notification + 音效提示
- 弹出 5 秒缓冲倒计时，不操作则自动开始休息
- 循环规则：前 3 颗番茄 → 短休（5min），第 4 颗 → 长休（15min），之后轮次重置
- 休息结束时再次触发 Notification + 音效
- 休息结束后显示"准备好了吗"界面，用户手动点击开始下一轮专注

## 方案：扩展 pomodoroStore（Phase 状态机）

### 新增类型

```ts
type Phase =
  | 'focus'         // 专注倒计时中（或 idle 待机）
  | 'awaitingBreak' // 专注结束，5 秒缓冲，等待自动开始休息
  | 'shortBreak'    // 短休倒计时中
  | 'longBreak'     // 长休倒计时中
  | 'awaitingFocus' // 休息结束，等待用户手动开始专注
```

### Store 新增字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `phase` | `Phase` | 当前阶段，默认 `'focus'` |
| `cycleCount` | `number` | 当前大轮已完成的专注颗数（1–4），达 4 后重置为 0 |
| `breakCountdown` | `number` | `awaitingBreak` 阶段的 5→0 倒计时 |

`TimerStatus`（`'idle' | 'running'`）保留不变，两者正交：

| status | phase | 含义 |
|--------|-------|------|
| idle | focus | 初始待机，等用户开始 |
| running | focus | 专注计时中 |
| idle | awaitingBreak | 专注完成，5 秒缓冲中 |
| running | shortBreak / longBreak | 休息倒计时中（纯前端，无 API 记录） |
| idle | awaitingFocus | 休息完成，等用户点击 |

### 新增 Actions

| Action | 触发方 | 行为 |
|--------|--------|------|
| `tickBreakCountdown()` | PomodoroTicker | `breakCountdown -= 1`；到 0 时自动调 `startBreak()` |
| `startBreak()` | PomodoroTicker（自动）/ 用户点击 | phase → short/longBreak，status → running，secondsLeft = 短/长休时长 |
| `skipBreak()` | 用户点击 | phase → awaitingFocus，status → idle |
| `breakComplete()` | PomodoroTicker（secondsLeft→0） | phase → awaitingFocus，status → idle |
| `startNextFocus()` | 用户点击 | 带同一 taskId/taskTitle 调 `start()`，phase → focus |

### cycleCount 规则

- 每次 `complete()`（专注自然结束）成功后：`cycleCount += 1`
- cycleCount 1 / 2 / 3 → 进入 `shortBreak`
- cycleCount 4 → 进入 `longBreak`，完成后重置为 0
- 用户主动中断（`interrupt()`）不影响 cycleCount

## 状态机转换

```
[idle / focus]
     ↓ 用户点"开始专注"
[running / focus]
     ↓ secondsLeft → 0
[idle / awaitingBreak]  ← 触发 Notification + 音效，breakCountdown = 5
     ↓ breakCountdown → 0（自动）或 用户点"立即开始休息"
[running / short|longBreak]
     ↓ secondsLeft → 0
[idle / awaitingFocus]  ← 触发 Notification + 音效
     ↓ 用户点"开始专注"
[running / focus]（循环）
```

## 组件变更

### PomodoroTicker（App.tsx）

新增两个 useEffect：

1. `phase === 'awaitingBreak'`：每秒调 `tickBreakCountdown()`；在进入 awaitingBreak 时触发 Notification + `playChime()`
2. `phase === 'shortBreak' | 'longBreak'`：沿用现有 tick 逻辑；`secondsLeft <= 0` 时调 `breakComplete()`，触发第二次 Notification + `playChime()`

### PomodoroCard.tsx

按 phase 渲染：

| phase | 圆环 | 按钮区 |
|-------|------|--------|
| focus（idle） | 完整圆环，专注时长 | "开始专注" |
| focus（running） | 红色倒计时弧 | "完成" / "中断" / "跳过" |
| awaitingBreak | 蓝/绿静止圆环，显示 `5…4…3` 缓冲 | "立即开始休息" / "跳过休息" |
| shortBreak / longBreak | 蓝/绿倒计时弧 | "跳过休息" |
| awaitingFocus | 空圆环，"休息结束，准备好了吗？" | "开始专注" |

模式 Tab（专注/短休/长休）改为只读，跟随 phase 自动高亮，不允许手动点击切换。

### PomodoroBar.tsx（非 Board 页底部悬浮条）

| phase | 显示 |
|-------|------|
| awaitingBreak | "🎉 专注完成！休息即将开始 (Ns)" + "立即开始"按钮 |
| shortBreak / longBreak | 休息倒计时 + "跳过"按钮 |
| awaitingFocus | "☕ 休息结束" + "开始专注"按钮 |

## 声音实现

新建 `client/src/lib/sound.ts`，用 Web Audio API 合成提示音，无需额外音频文件：

```ts
export function playChime() {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
  osc.start();
  osc.stop(ctx.currentTime + 0.8);
}
```

## 持久化

`saveSession` 新增字段：`phase`、`cycleCount`、`breakType`（'short' | 'long'）、`breakStartedAt`（休息开始时间戳）。刷新后 `readSession` 根据 `breakStartedAt` 计算剩余休息时间，还原到正确阶段。

## 文件变更清单

| 文件 | 变更类型 |
|------|---------|
| `client/src/store/pomodoroStore.ts` | 修改：增加 Phase 类型、新字段、新 actions |
| `client/src/App.tsx` | 修改：PomodoroTicker 增加 awaitingBreak/break 驱动逻辑 |
| `client/src/components/board/PomodoroCard.tsx` | 修改：按 phase 渲染 UI |
| `client/src/components/pomodoro/PomodoroBar.tsx` | 修改：按 phase 渲染悬浮条 |
| `client/src/lib/sound.ts` | 新建：Web Audio API 提示音 |

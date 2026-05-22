# Stage 6: Projects Page + Settings Page + Data Export

**Date:** 2026-05-22  
**Scope:** Projects page, Settings page, Data export, Left sidebar nav, Pomodoro card UI  
**Approach:** Vertical slices — layout → settings → projects → export

---

## 1. Summary

Stage 6 completes the application's core pages and introduces a Notion-style left sidebar navigation. It replaces the existing top navigation bar, adds `/projects` and `/settings` routes, redesigns the PomodoroBar into a floating card with a circular countdown ring, persists user settings to SQLite, and provides a one-click SQLite database export.

---

## 2. Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Navigation | Left sidebar (180px fixed) | User chose sidebar now vs double-refactor in Stage 7 |
| Projects layout | 3-column card grid | Comfortable density, Notion-style whitespace |
| Pomodoro widget | Floating card, fixed bottom-right, SVG ring | Always accessible without blocking nav |
| Settings persistence | SQLite `settings` table via `/api/settings` | Consistent with rest of app; survives browser clears |
| Dark mode | Toggle UI only; CSS deferred to Stage 7 | Avoid premature dark: class sprawl |
| Data import | Deferred to Stage 7 | Destructive operation needs more UX care |
| Implementation order | Layout → Settings → Projects → Export | Each slice is independently runnable |

---

## 3. Architecture

### 3.1 File Changes Overview

```
server/src/
├── db/schema.ts          (+) settings table
├── db/migrate.ts         (+) create settings table migration
├── routes/settings.ts    (new) GET/PATCH /api/settings
├── routes/export.ts      (new) GET /api/export — streams gtd.db file
└── index.ts              (+) mount /api/settings and /api/export

client/src/
├── App.tsx               (edit) flex-row layout: SideBar + content area
├── components/
│   ├── SideBar.tsx       (new) replaces NavBar.tsx — vertical nav
│   ├── NavBar.tsx        (delete — fully replaced by SideBar.tsx)
│   ├── projects/
│   │   └── ProjectsPage.tsx   (new)
│   └── settings/
│       └── SettingsPage.tsx   (new)
├── store/
│   └── settingsStore.ts  (new) Zustand store, loads from API
├── api/client.ts         (+) createProject, updateProject, deleteProject,
│                              getSettings, updateSettings, exportDownload
└── types.ts              (+) Settings interface
```

### 3.2 Routing

```tsx
<Route path="/" element={<Navigate to="/board" />} />
<Route path="/board" element={<BoardPage />} />
<Route path="/calendar" element={<CalendarPage />} />
<Route path="/projects" element={<ProjectsPage />} />   // new
<Route path="/settings" element={<SettingsPage />} />   // new
```

---

## 4. Backend Design

### 4.1 Settings Table (new)

```sql
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Default rows seeded on first run:

| key | default value |
|---|---|
| `work_duration` | `1500` (25 min in seconds) |
| `short_break` | `300` (5 min) |
| `long_break` | `900` (15 min) |
| `calendar_week_start` | `1` (1=Monday, 0=Sunday) |
| `calendar_day_start` | `7` (hour, 0–23) |
| `calendar_day_end` | `22` (hour, 0–23) |
| `calendar_default_view` | `month` |
| `theme` | `light` |

### 4.2 `/api/settings` Route

```
GET  /api/settings        → { key: value, ... }  (all settings as flat object)
PATCH /api/settings       → body: { key: value, ... }  (partial update)
                            Response: updated flat settings object
```

Implementation: single upsert transaction per key in PATCH body.

### 4.3 `/api/export` Route

```
GET /api/export
  Response headers:
    Content-Type: application/octet-stream
    Content-Disposition: attachment; filename="gtd-backup-{YYYY-MM-DD}.db"
  Body: streams `./data/gtd.db` file bytes
```

Use `fs.createReadStream` piped to `res`. No body parsing needed.

### 4.4 Projects Stats in `/api/projects`

Extend `GET /api/projects` response to include computed stats (added via SQL aggregation JOIN, not separate endpoint):

```json
{
  "id": "...",
  "name": "产品设计",
  "color": "#3B82F6",
  "taskCount": 8,
  "doneCount": 5,
  "completionRate": 0.625,
  "totalPomodoros": 24
}
```

SQL approach: subquery or LEFT JOIN with tasks + pomodoros GROUP BY project_id, computed in the projects route.

---

## 5. Frontend Design

### 5.1 Layout Refactor (App.tsx + SideBar.tsx)

**Before:**
```tsx
<div className="flex flex-col h-screen">
  <NavBar />          {/* top bar */}
  <main>...</main>
  <PomodoroBar />     {/* fixed overlay */}
</div>
```

**After:**
```tsx
<div className="flex h-screen overflow-hidden">
  <SideBar />                          {/* 180px, flex-col */}
  <div className="flex-1 flex flex-col overflow-hidden">
    <Routes>...</Routes>
  </div>
  <PomodoroFloatingCard />             {/* fixed bottom-right */}
</div>
```

**SideBar.tsx structure:**
- Top: `🍅 GTD` logo/title
- Nav links: 看板 / 日历 / 项目 (with lucide icons)
- Bottom (margin-top: auto): 设置 link

### 5.2 PomodoroFloatingCard (replaces PomodoroBar)

Location: `client/src/components/pomodoro/PomodoroFloatingCard.tsx`

**Layout:** `fixed bottom-4 right-4 z-50` — card with shadow, 160px wide

**Elements:**
- SVG circular ring (r=30, stroke-dasharray calculated from `secondsLeft / durationSeconds`)
- Center text: `MM:SS` countdown
- Task name (1 line, ellipsis overflow)
- Control buttons: ▶/⏸ and ⏹
- Idle state: "选择任务开始" placeholder + task selector dropdown

**SVG ring formula:**
```
circumference = 2 * π * r = 188.5
progress = secondsLeft / durationSeconds
strokeDashoffset = circumference * (1 - progress)
```

**Ring color:** Red (`#E03E3E`) while running, gray when idle.

**Collapsible:** Small chevron button to minimize card to a 40×40px pill showing only the ring + time. Collapse state stored in component local state (not persisted).

### 5.3 Settings Store (settingsStore.ts)

```typescript
interface Settings {
  work_duration: number;       // seconds
  short_break: number;
  long_break: number;
  calendar_week_start: number; // 0 | 1
  calendar_day_start: number;
  calendar_day_end: number;
  calendar_default_view: 'month' | 'week' | 'day';
  theme: 'light' | 'dark';
}

interface SettingsState {
  settings: Settings;
  isLoaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<Settings>) => Promise<void>;
}
```

- `load()` called once on app mount in `App.tsx`
- `update()` optimistic: update local state immediately, PATCH to API, rollback on error
- pomodoroStore reads `settings.work_duration` from settingsStore **at the moment the user clicks ▶ start** (not cached at app load, so changing the setting takes effect on the next timer)
- calendarStore reads `calendar_week_start`, `calendar_day_start/end`, `calendar_default_view` on load

### 5.4 Projects Page (ProjectsPage.tsx)

**Layout:**
```
/projects
┌─────────────────────────────────┐
│ 项目                  [+ 新建]  │
├─────────────────────────────────┤
│  [Card] [Card] [Card]           │
│  [Card] [Card] [+ 新建卡]       │
└─────────────────────────────────┘
```

**Project Card:**
- Color dot + project name (bold)
- Task count + pomodoro count (small text)
- Progress bar (completionRate, colored with project color)
- "X/Y done · Z%" caption
- Hover: show Edit (pencil) + Archive (box) icon buttons
- Click card body → navigate to `/board?project={id}`

**Create/Edit flow:** Click "+ 新建项目" or Edit icon → inline modal dialog:
- Fields: name (required), color picker (preset swatches: 8 colors), description (optional)
- Submit → `POST /api/projects`, refresh list

**Archive:** Click archive icon → confirmation popover ("归档后任务仍保留，确认？") → `DELETE /api/projects/:id` (soft archive)

**Empty state:** "还没有项目 · 创建第一个项目开始吧" + "+ 新建项目" button

### 5.5 SettingsPage (SettingsPage.tsx)

Three grouped sections (see Section 3 of design review):

1. **番茄钟**: work_duration / short_break / long_break — stepper (−/+) in minutes, writes seconds
2. **日历**: calendar_week_start (select) / calendar_day_start–end (two number inputs) / calendar_default_view (select)
3. **外观 & 数据**:
   - Theme toggle: segmented control (☀️浅色 / 🌙深色) — updates `theme` setting, no CSS side effects in Stage 6
   - Export button: calls `/api/export`, triggers browser file download

---

## 6. API Client Additions (client.ts)

```typescript
// Projects (new)
export const createProject = (data: { name: string; color?: string; description?: string }) => ...
export const updateProject = (id: string, data: { name?: string; color?: string; description?: string }) => ...
export const archiveProject = (id: string) => ...

// Settings (new)
// Server stores all values as TEXT; client parses numeric fields in settingsStore
export const getSettings = () => req<Record<string, string>>('/settings')
export const updateSettings = (patch: Partial<Record<string, string>>) =>
  req<Record<string, string>>('/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),   // numeric values serialized as strings before call
  })

// Export (new)
export const exportDatabase = () => {
  window.location.href = '/api/export';  // triggers download directly
}
```

---

## 7. Data Flow

```
App mount
  └─ settingsStore.load()
       └─ GET /api/settings
            └─ settingsStore.settings populated
                 ├─ pomodoroStore reads work_duration when starting timer
                 └─ calendarStore reads calendar_* settings on load

User edits setting
  └─ settingsStore.update({ key: value })
       ├─ optimistic local update
       └─ PATCH /api/settings
```

---

## 8. Error Handling

- All API calls use existing `req<T>()` helper (throws on non-2xx)
- Settings page: show toast on save failure, revert optimistic update
- Projects page: show toast on create/archive failure
- Export: if `/api/export` fails, show toast "导出失败，请重试"

---

## 9. What's NOT in Stage 6

- Dark mode CSS (`dark:` Tailwind classes) → Stage 7
- Data import (upload SQLite) → Stage 7
- Pomodoro short/long break auto-cycle → Stage 7 (if not already implemented)
- Sub-tasks, tags, recurring tasks → never (per spec)

---

## 10. Implementation Slices (ordered)

1. **Slice 1: Layout** — App.tsx refactor + SideBar.tsx + PomodoroFloatingCard (SVG ring)
2. **Slice 2: Settings** — DB migration (settings table) + `/api/settings` route + settingsStore + SettingsPage
3. **Slice 3: Projects** — Extend `/api/projects` with stats + ProjectsPage (cards + create/edit/archive modal)
4. **Slice 4: Export** — `/api/export` route + export button in SettingsPage + API client function

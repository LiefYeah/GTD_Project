import { useMemo } from 'react';
import { format, isToday, startOfWeek, eachDayOfInterval, endOfWeek, isSameDay } from 'date-fns';
import { useBoardStore } from '../../store/boardStore';
import { useNow } from '../../hooks/useNow';
import type { Task } from '../../types';

const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i); // 8..18
const TOTAL_MINUTES = HOURS.length * 60;

function timeToMinutes(h: number, m: number) {
  return (h - 8) * 60 + m;
}

function tsToMinutes(ts: number) {
  const d = new Date(ts);
  return timeToMinutes(d.getHours(), d.getMinutes());
}

interface DayPipData {
  day: string;
  date: number;
  done: number;
  total: number;
  isToday: boolean;
}

interface Props {
  onTaskClick: (task: Task) => void;
}

export function TodaySchedule({ onTaskClick }: Props) {
  const { tasks, projects } = useBoardStore();
  const now = useNow();
  const nowMin = timeToMinutes(now.getHours(), now.getMinutes());
  const nowLabel = format(now, 'HH:mm');

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  // Week stats: Mon–Sun of current week
  const weekStats = useMemo<DayPipData[]>(() => {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const dayLabels = ['一', '二', '三', '四', '五', '六', '日'];

    return days.map((day, i) => {
      const dayTasks = tasks.filter((t) =>
        (t.scheduledStart && isSameDay(new Date(t.scheduledStart), day)) ||
        (t.status === 'done' && t.completedAt && isSameDay(new Date(t.completedAt), day))
      );
      const done = dayTasks.filter((t) => t.status === 'done').length;
      return {
        day: dayLabels[i],
        date: day.getDate(),
        done,
        total: Math.max(done, dayTasks.length),
        isToday: isToday(day),
      };
    });
  }, [tasks, now]);

  // Today's scheduled tasks (8:00–18:00)
  const todayTasks = useMemo(() =>
    tasks.filter((t) => {
      if (!t.scheduledStart) return false;
      const d = new Date(t.scheduledStart);
      if (!isToday(d)) return false;
      const h = d.getHours();
      return h >= 8 && h < 18;
    }),
    [tasks, now]
  );

  const nowInRange = nowMin >= 0 && nowMin <= TOTAL_MINUTES;
  const nowPct = nowMin / TOTAL_MINUTES;

  function taskColor(t: Task) {
    return (t.projectId && projectMap[t.projectId]?.color) ?? 'var(--c-plan)';
  }

  return (
    <div
      className="h-full flex flex-col rounded-3xl overflow-hidden"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-start justify-between p-5 pb-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--line-soft)' }}
      >
        <div>
          <div
            className="text-[11px] uppercase tracking-widest mb-1"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)' }}
          >
            今日时间线
          </div>
          <div
            className="text-xl font-semibold tracking-tight"
            style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
          >
            {format(now, 'M月d日')} · {['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]}
          </div>
        </div>
      </div>

      {/* Week stats */}
      <div
        className="grid grid-cols-7 gap-1.5 mx-4 my-3 p-3 rounded-xl flex-shrink-0"
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--line-soft)',
        }}
      >
        {weekStats.map((d) => (
          <div
            key={d.date}
            className="flex flex-col items-center py-2 rounded-xl transition-all duration-150 cursor-pointer"
            style={d.isToday ? {
              background: 'var(--brand)',
              color: '#fff',
            } : {
              color: 'var(--ink-mute)',
            }}
          >
            <span
              className="text-[10px]"
              style={{
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em',
                color: d.isToday ? 'rgba(255,255,255,0.8)' : 'var(--ink-mute)',
              }}
            >
              {d.day}
            </span>
            <span
              className="text-lg font-semibold mt-0.5"
              style={{
                fontFamily: 'var(--font-mono)',
                letterSpacing: '-0.02em',
                color: d.isToday ? '#fff' : 'var(--ink)',
              }}
            >
              {d.date}
            </span>
            {/* Mini bar */}
            <div
              className="w-1 my-1.5 rounded-sm relative overflow-hidden"
              style={{
                height: '26px',
                background: d.isToday ? 'rgba(255,255,255,0.25)' : 'var(--line)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: d.total > 0 ? `${(d.done / d.total) * 100}%` : '0%',
                  background: d.isToday ? '#fff' : 'var(--c-done)',
                  borderRadius: '2px',
                  minHeight: d.done > 0 ? '2px' : 0,
                  transition: 'height 0.3s',
                }}
              />
            </div>
            <span
              className="text-[10px]"
              style={{
                fontFamily: 'var(--font-mono)',
                color: d.isToday ? 'rgba(255,255,255,0.8)' : 'var(--ink-mute)',
              }}
            >
              {d.done}/{d.total}
            </span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div
        className="flex-1 min-h-0 overflow-y-auto mx-4 mb-4"
      >
        <div
          className="grid relative"
          style={{
            gridTemplateColumns: '36px 1fr',
            minHeight: `${HOURS.length * 52}px`,
          }}
        >
          {/* Hour labels */}
          <div className="flex flex-col">
            {HOURS.map((h) => (
              <div
                key={h}
                className="flex-1 relative"
                style={{ height: 52 }}
              >
                <span
                  className="absolute text-[10px] select-none pr-1"
                  style={{
                    top: '-6px',
                    left: 0,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--ink-faint)',
                    letterSpacing: '0.04em',
                    background: 'var(--surface)',
                    paddingRight: 6,
                  }}
                >
                  {String(h).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>

          {/* Track */}
          <div
            className="relative"
            style={{ borderLeft: '1px solid var(--line)' }}
          >
            {/* Hour rows */}
            {HOURS.map((h) => (
              <div
                key={h}
                style={{
                  height: 52,
                  borderTop: h === 8 ? 'none' : '1px dashed var(--line-soft)',
                }}
              />
            ))}

            {/* Task blocks */}
            {todayTasks.map((task) => {
              const startMin = tsToMinutes(task.scheduledStart!);
              const endMin = task.scheduledEnd
                ? tsToMinutes(task.scheduledEnd)
                : startMin + 60;
              const topPct = (startMin / TOTAL_MINUTES) * 100;
              const heightPct = ((endMin - startMin) / TOTAL_MINUTES) * 100;
              const color = taskColor(task);

              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  style={{
                    position: 'absolute',
                    top: `${topPct}%`,
                    height: `${Math.max(5, heightPct)}%`,
                    left: 8,
                    right: 8,
                    background: `color-mix(in oklab, ${color} 10%, var(--surface))`,
                    border: `1px solid color-mix(in oklab, ${color} 25%, var(--line))`,
                    borderRadius: 10,
                    padding: '6px 10px 6px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    overflow: 'hidden',
                    cursor: 'pointer',
                  }}
                  className="transition-all duration-150 hover:brightness-95"
                >
                  {/* Left accent bar */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 0, top: 4, bottom: 4,
                      width: 4,
                      background: color,
                      borderRadius: 2,
                    }}
                  />
                  <div>
                    <div
                      className="text-xs font-semibold leading-tight truncate"
                      style={{ color: 'var(--ink)' }}
                    >
                      {task.title}
                    </div>
                    <div
                      className="text-[10px] mt-0.5"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)', letterSpacing: '0.02em' }}
                    >
                      {format(new Date(task.scheduledStart!), 'HH:mm')}
                      {task.scheduledEnd && ` · ${Math.round((task.scheduledEnd - task.scheduledStart!) / 60000)}分钟`}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Now indicator */}
            {nowInRange && (
              <div
                style={{
                  position: 'absolute',
                  top: `${nowPct * 100}%`,
                  left: -4,
                  right: 0,
                  height: 0,
                  borderTop: '1.5px solid var(--brand)',
                  zIndex: 3,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    width: 9, height: 9,
                    borderRadius: '50%',
                    background: 'var(--brand)',
                    marginLeft: -5,
                    flexShrink: 0,
                    boxShadow: '0 0 0 3px color-mix(in oklab, var(--brand) 25%, transparent)',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: -10,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: 'var(--brand)',
                    background: 'var(--surface)',
                    padding: '2px 6px',
                    borderRadius: 4,
                    border: '1px solid color-mix(in oklab, var(--brand) 30%, var(--line))',
                    letterSpacing: '0.04em',
                    fontWeight: 600,
                  }}
                >
                  现在 {nowLabel}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {todayTasks.length === 0 && (
        <div
          className="text-center py-4 text-sm flex-shrink-0 -mt-2 mb-4"
          style={{ color: 'var(--ink-mute)' }}
        >
          今日暂无排期任务
          <div className="text-[11px] mt-1" style={{ color: 'var(--ink-faint)' }}>
            在任务详情中设置排期时间
          </div>
        </div>
      )}
    </div>
  );
}

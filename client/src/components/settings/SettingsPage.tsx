import { Download } from 'lucide-react';
import { format } from 'date-fns';
import { useSettingsStore } from '../../store/settingsStore';
import * as api from '../../api/client';

const POMODORO_OPTIONS = [
  { label: '15 分钟', value: 900 },
  { label: '20 分钟', value: 1200 },
  { label: '25 分钟（默认）', value: 1500 },
  { label: '30 分钟', value: 1800 },
  { label: '45 分钟', value: 2700 },
  { label: '60 分钟', value: 3600 },
];

const SHORT_BREAK_OPTIONS = [
  { label: '3 分钟', value: 180 },
  { label: '5 分钟（默认）', value: 300 },
  { label: '10 分钟', value: 600 },
  { label: '15 分钟', value: 900 },
];

const LONG_BREAK_OPTIONS = [
  { label: '10 分钟', value: 600 },
  { label: '15 分钟（默认）', value: 900 },
  { label: '20 分钟', value: 1200 },
  { label: '30 分钟', value: 1800 },
];

interface SelectFieldProps {
  label: string;
  description?: string;
  value: number;
  options: { label: string; value: number }[];
  onChange: (v: number) => void;
}

function SelectField({ label, description, value, options, onChange }: SelectFieldProps) {
  return (
    <div
      className="flex items-center justify-between py-3.5 last:border-0"
      style={{ borderBottom: '1px solid var(--line-soft)' }}
    >
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{label}</p>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-mute)' }}>{description}</p>
        )}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="text-sm rounded-xl px-3 py-1.5 outline-none cursor-pointer transition-all duration-150"
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--line)',
          color: 'var(--ink)',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SettingsPage() {
  const {
    pomodoroDuration, shortBreak, longBreak,
    setPomodoroDuration, setShortBreak, setLongBreak,
  } = useSettingsStore();

  const handleExport = async () => {
    try {
      const [tasks, projects, pomodoros] = await Promise.all([
        api.getTasks(),
        api.getProjects(),
        api.getAllPomodoros(),
      ]);

      const data = {
        exportedAt: new Date().toISOString(),
        version: 1,
        tasks,
        projects,
        pomodoros,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gtd-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in-0 duration-150">
      {/* Page header */}
      <header
        className="sticky top-0 z-20 flex items-center px-7 py-3.5 flex-shrink-0"
        style={{
          background: 'color-mix(in oklab, var(--bg) 85%, transparent)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--line-soft)',
        }}
      >
        <h1
          className="text-lg font-semibold"
          style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
        >
          设置
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto p-7 pb-20" style={{ maxWidth: 560 }}>
        {/* Timer settings */}
        <section className="mb-8">
          <h2
            className="text-[11px] font-semibold mb-3"
            style={{
              color: 'var(--ink-mute)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            计时器
          </h2>
          <div
            className="rounded-2xl px-5"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <SelectField
              label="专注时长"
              description="每个番茄钟的工作时间"
              value={pomodoroDuration}
              options={POMODORO_OPTIONS}
              onChange={setPomodoroDuration}
            />
            <SelectField
              label="短休息"
              description="每个番茄钟后的短暂休息"
              value={shortBreak}
              options={SHORT_BREAK_OPTIONS}
              onChange={setShortBreak}
            />
            <SelectField
              label="长休息"
              description="每 4 个番茄钟后的长休息"
              value={longBreak}
              options={LONG_BREAK_OPTIONS}
              onChange={setLongBreak}
            />
          </div>
          <p
            className="text-xs mt-2"
            style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}
          >
            设置已自动保存到本地，下次启动生效。
          </p>
        </section>

        {/* Keyboard shortcuts */}
        <section className="mb-8">
          <h2
            className="text-[11px] font-semibold mb-3"
            style={{
              color: 'var(--ink-mute)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            键盘快捷键
          </h2>
          <div
            className="rounded-2xl px-5"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {[
              { key: 'B', label: '看板' },
              { key: 'C', label: '日历' },
              { key: 'P', label: '项目' },
              { key: 'S', label: '设置' },
              { key: 'Esc', label: '关闭任务详情' },
            ].map(({ key, label }, i, arr) => (
              <div
                key={key}
                className="flex items-center justify-between py-3"
                style={i < arr.length - 1 ? { borderBottom: '1px solid var(--line-soft)' } : {}}
              >
                <span className="text-sm" style={{ color: 'var(--ink)' }}>{label}</span>
                <kbd
                  className="text-xs px-2 py-0.5 rounded-lg"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    background: 'var(--bg-2)',
                    border: '1px solid var(--line)',
                    color: 'var(--ink-soft)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {key}
                </kbd>
              </div>
            ))}
          </div>
          <p
            className="text-xs mt-2"
            style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}
          >
            快捷键在输入框获得焦点时不生效。
          </p>
        </section>

        {/* Data export */}
        <section>
          <h2
            className="text-[11px] font-semibold mb-3"
            style={{
              color: 'var(--ink-mute)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            数据
          </h2>
          <div
            className="rounded-2xl px-5 py-4"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>导出数据</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-mute)' }}>
                  将所有任务、项目和番茄记录导出为 JSON 文件
                </p>
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm rounded-xl transition-all duration-150"
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink-soft)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--ink)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--brand)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--ink-soft)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)';
                }}
              >
                <Download className="w-4 h-4" />
                导出 JSON
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

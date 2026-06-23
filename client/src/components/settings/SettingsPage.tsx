import { useState, useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { useSettingsStore } from '../../store/settingsStore';
import { useBoardStore } from '../../store/boardStore';
import * as api from '../../api/client';
import { HolidayManager } from './HolidayManager';

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

type ImportState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'success'; imported: api.ImportResult['imported']; skipped: api.ImportResult['skipped'] }
  | { phase: 'error'; message: string };

export function SettingsPage() {
  const {
    pomodoroDuration, shortBreak, longBreak,
    setPomodoroDuration, setShortBreak, setLongBreak,
  } = useSettingsStore();
  const { load: reloadBoard } = useBoardStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importState, setImportState] = useState<ImportState>({ phase: 'idle' });

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

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setImportState({ phase: 'loading' });
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data || typeof data !== 'object' || !Array.isArray(data.tasks)) {
        setImportState({ phase: 'error', message: '文件格式不正确，请选择由本应用导出的 JSON 文件' });
        return;
      }

      const result = await api.importData(data);
      setImportState({ phase: 'success', imported: result.imported, skipped: result.skipped });
      // Reload board so newly imported tasks/projects are visible immediately
      reloadBoard();
    } catch (e) {
      const msg = e instanceof SyntaxError ? '文件不是有效的 JSON 格式' : String(e);
      setImportState({ phase: 'error', message: msg });
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

        {/* Data import / export */}
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
            className="rounded-2xl px-5"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {/* Export */}
            <div
              className="flex items-center justify-between py-4"
              style={{ borderBottom: '1px solid var(--line-soft)' }}
            >
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

            {/* Import */}
            <div className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>导入数据</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-mute)' }}>
                    增量导入，已存在的记录自动跳过，不会产生重复
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleImportFile}
                />
                <button
                  onClick={() => { setImportState({ phase: 'idle' }); fileInputRef.current?.click(); }}
                  disabled={importState.phase === 'loading'}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm rounded-xl transition-all duration-150"
                  style={{
                    background: 'var(--bg-2)',
                    border: '1px solid var(--line)',
                    color: importState.phase === 'loading' ? 'var(--ink-faint)' : 'var(--ink-soft)',
                    cursor: importState.phase === 'loading' ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (importState.phase !== 'loading') {
                      (e.currentTarget as HTMLElement).style.color = 'var(--ink)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--brand)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = 'var(--ink-soft)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)';
                  }}
                >
                  <Upload className="w-4 h-4" />
                  {importState.phase === 'loading' ? '导入中…' : '选择文件'}
                </button>
              </div>

              {/* Import result feedback */}
              {importState.phase === 'success' && (
                <div
                  className="mt-3 px-3 py-2.5 rounded-xl text-xs"
                  style={{
                    background: 'color-mix(in oklab, var(--c-done) 12%, var(--surface))',
                    border: '1px solid color-mix(in oklab, var(--c-done) 30%, transparent)',
                    color: 'var(--ink)',
                  }}
                >
                  <span style={{ color: 'var(--c-done)', fontWeight: 600 }}>导入成功</span>
                  <span className="ml-1.5" style={{ color: 'var(--ink-soft)' }}>
                    新增 项目 {importState.imported.projects} · 任务 {importState.imported.tasks} · 番茄 {importState.imported.pomodoros}
                    {(importState.skipped.projects + importState.skipped.tasks + importState.skipped.pomodoros) > 0 && (
                      <>
                        {' '}· 跳过重复 {importState.skipped.projects + importState.skipped.tasks + importState.skipped.pomodoros} 条
                      </>
                    )}
                  </span>
                </div>
              )}
              {importState.phase === 'error' && (
                <div
                  className="mt-3 px-3 py-2.5 rounded-xl text-xs"
                  style={{
                    background: 'color-mix(in oklab, var(--brand) 10%, var(--surface))',
                    border: '1px solid color-mix(in oklab, var(--brand) 30%, transparent)',
                    color: 'var(--ink)',
                  }}
                >
                  <span style={{ color: 'var(--brand)', fontWeight: 600 }}>导入失败</span>
                  <span className="ml-1.5" style={{ color: 'var(--ink-soft)' }}>{importState.message}</span>
                </div>
              )}
            </div>
          </div>

          <p
            className="text-xs mt-2"
            style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}
          >
            导入文件必须是由本应用导出的 JSON 格式，相同 ID 的记录会自动跳过。
          </p>
        </section>

        <section
          className="rounded-2xl p-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
        >
          <h2
            className="text-base font-semibold mb-1"
            style={{ color: 'var(--ink)' }}
          >
            节假日管理
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--ink-mute)' }}>
            用于"非工作日"重复任务的判断依据。已内置 2026 年中国法定节假日，每年需手动更新。
          </p>
          <HolidayManager />
        </section>
      </div>
    </div>
  );
}

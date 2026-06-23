import { useState, useEffect } from 'react';
import { Trash2, Plus } from 'lucide-react';
import * as api from '../../api/client';
import type { PublicHoliday } from '../../types';

export function HolidayManager() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [newDate, setNewDate] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.getHolidays(year).then(setHolidays);
  }, [year]);

  async function handleAdd() {
    if (!newDate || !newName.trim()) return;
    const holiday = await api.createHoliday({ date: newDate, name: newName.trim() });
    setHolidays((prev) => [...prev, holiday].sort((a, b) => a.date.localeCompare(b.date)));
    setNewDate('');
    setNewName('');
    setAdding(false);
  }

  async function handleDelete(id: number) {
    await api.deleteHoliday(id);
    setHolidays((prev) => prev.filter((h) => h.id !== id));
  }

  return (
    <div className="space-y-3">
      {/* Year selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setYear((y) => y - 1)}
          className="px-2 py-1 rounded-lg text-sm"
          style={{ background: 'var(--bg-2)', color: 'var(--ink-mute)' }}
        >
          ‹
        </button>
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
          {year} 年
        </span>
        <button
          onClick={() => setYear((y) => y + 1)}
          className="px-2 py-1 rounded-lg text-sm"
          style={{ background: 'var(--bg-2)', color: 'var(--ink-mute)' }}
        >
          ›
        </button>
        <span className="ml-auto text-xs" style={{ color: 'var(--ink-mute)' }}>
          {holidays.length} 个节假日
        </span>
      </div>

      {/* Holiday list */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--line)' }}
      >
        {holidays.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--ink-mute)' }}>
            暂无节假日数据
          </p>
        ) : (
          holidays.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between px-3 py-2"
              style={{ borderBottom: '1px solid var(--line-soft)' }}
            >
              <span className="text-xs font-mono" style={{ color: 'var(--ink-mute)' }}>
                {h.date}
              </span>
              <span className="text-sm flex-1 ml-3" style={{ color: 'var(--ink)' }}>
                {h.name}
              </span>
              <button
                onClick={() => handleDelete(h.id)}
                className="p-1 rounded hover:opacity-70 transition-opacity"
                style={{ color: 'var(--ink-mute)' }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add holiday */}
      {adding ? (
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="text-sm rounded-lg px-2 py-1.5 outline-none"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="节假日名称"
            className="flex-1 text-sm rounded-lg px-2 py-1.5 outline-none"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          />
          <button
            onClick={handleAdd}
            className="text-sm px-3 py-1.5 rounded-lg font-medium"
            style={{ background: 'var(--brand)', color: '#fff' }}
          >
            添加
          </button>
          <button
            onClick={() => setAdding(false)}
            className="text-sm"
            style={{ color: 'var(--ink-mute)' }}
          >
            取消
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-sm"
          style={{ color: 'var(--brand)' }}
        >
          <Plus className="w-4 h-4" />
          添加节假日
        </button>
      )}
    </div>
  );
}

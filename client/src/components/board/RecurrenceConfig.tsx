import { useState, useEffect } from 'react';
import type { RecurringRule, RecurrenceType } from '../../types';

const RECURRENCE_TYPES: { value: RecurrenceType; label: string }[] = [
  { value: 'daily', label: '每天' },
  { value: 'weekdays', label: '工作日' },
  { value: 'non_workdays', label: '非工作日' },
  { value: 'custom_days', label: '自定义' },
];

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function isRuleActive(rule: RecurringRule): boolean {
  return rule.endDate === null || rule.endDate >= todayISO();
}

interface RecurrenceConfigProps {
  rule: RecurringRule | null;
  onEnable: (config: {
    recurrenceType: RecurrenceType;
    recurrenceDays: string | null;
    endDate: string | null;
  }) => void;
  onUpdate: (update: {
    recurrenceType?: RecurrenceType;
    recurrenceDays?: string | null;
    endDate?: string | null;
  }) => void;
  onDisable: () => void;
}

export function RecurrenceConfig({ rule, onEnable, onUpdate, onDisable }: RecurrenceConfigProps) {
  const active = rule !== null && isRuleActive(rule);

  const [type, setType] = useState<RecurrenceType>(rule?.recurrenceType ?? 'daily');
  const [customDays, setCustomDays] = useState<number[]>(
    rule?.recurrenceDays ? (JSON.parse(rule.recurrenceDays) as number[]) : []
  );
  const [endDate, setEndDate] = useState<string>(rule?.endDate ?? '');

  // Sync local state when rule changes from outside
  useEffect(() => {
    if (rule) {
      setType(rule.recurrenceType);
      setCustomDays(rule.recurrenceDays ? (JSON.parse(rule.recurrenceDays) as number[]) : []);
      setEndDate(rule.endDate ?? '');
    }
  }, [rule?.id]);

  function handleToggle() {
    if (active) {
      onDisable();
    } else if (rule && !isRuleActive(rule)) {
      // Re-enable a stopped rule
      onUpdate({ end_date: null } as never);
    } else {
      // Enable for the first time
      onEnable({
        recurrenceType: type,
        recurrenceDays: type === 'custom_days' ? JSON.stringify(customDays) : null,
        endDate: endDate || null,
      });
    }
  }

  function handleTypeChange(newType: RecurrenceType) {
    setType(newType);
    if (rule && active) {
      onUpdate({
        recurrenceType: newType,
        recurrenceDays: newType === 'custom_days' ? JSON.stringify(customDays) : null,
      });
    }
  }

  function toggleDay(dow: number) {
    const next = customDays.includes(dow)
      ? customDays.filter((d) => d !== dow)
      : [...customDays, dow].sort((a, b) => a - b);
    setCustomDays(next);
    if (rule && active) {
      onUpdate({ recurrenceDays: JSON.stringify(next) });
    }
  }

  function handleEndDateChange(val: string) {
    setEndDate(val);
    if (rule && active) {
      onUpdate({ endDate: val || null });
    }
  }

  return (
    <div className="space-y-3">
      {/* Toggle row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={active}
          onClick={handleToggle}
          className="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
          style={{ background: active ? 'var(--brand)' : 'var(--bg-2)' }}
        >
          <span
            className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200"
            style={{ transform: active ? 'translateX(16px)' : 'translateX(0)' }}
          />
        </button>
        <span
          className="text-sm"
          style={{ color: active ? 'var(--ink)' : 'var(--ink-mute)' }}
        >
          {active ? '已开启' : '不重复'}
        </span>
      </div>

      {/* Config (only when active) */}
      {active && (
        <>
          {/* Type chips */}
          <div className="grid grid-cols-2 gap-1.5">
            {RECURRENCE_TYPES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleTypeChange(value)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150"
                style={
                  type === value
                    ? { background: 'var(--brand)', color: '#fff' }
                    : { background: 'var(--bg-2)', color: 'var(--ink-soft)', border: '1px solid var(--line)' }
                }
              >
                {label}
              </button>
            ))}
          </div>

          {/* Custom day picker */}
          {type === 'custom_days' && (
            <div className="flex gap-1.5 justify-between">
              {DAY_LABELS.map((label, dow) => (
                <button
                  key={dow}
                  type="button"
                  onClick={() => toggleDay(dow)}
                  className="w-8 h-8 rounded-full text-xs font-medium transition-colors duration-150 flex-shrink-0"
                  style={
                    customDays.includes(dow)
                      ? { background: 'var(--brand)', color: '#fff' }
                      : { background: 'var(--bg-2)', color: 'var(--ink-mute)', border: '1px solid var(--line)' }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* End date */}
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--ink-mute)', whiteSpace: 'nowrap' }}>
              结束日期
            </span>
            <input
              type="date"
              value={endDate}
              min={todayISO()}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="flex-1 text-xs rounded-lg px-2 py-1 outline-none"
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--line)',
                color: endDate ? 'var(--ink)' : 'var(--ink-mute)',
              }}
            />
            {endDate && (
              <button
                type="button"
                onClick={() => handleEndDateChange('')}
                className="text-xs"
                style={{ color: 'var(--ink-mute)' }}
              >
                ✕
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

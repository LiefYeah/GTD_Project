import { useState, useRef } from 'react';
import type { TaskStatus } from '../../types';

interface Props {
  status: TaskStatus;
  projectId?: string;
  onAdd: (title: string) => void;
  accent?: string;
}

export function AddTaskInput({ status: _status, onAdd, accent }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onAdd(trimmed);
      setValue('');
    }
    setOpen(false);
  };

  const colAccent = accent ?? 'var(--brand)';

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
        className="w-full text-[12px] py-2 rounded-xl transition-all duration-150"
        style={{
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.02em',
          border: `1px dashed color-mix(in oklab, ${colAccent} 22%, var(--line))`,
          color: 'var(--ink-mute)',
          background: 'transparent',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = colAccent;
          (e.currentTarget as HTMLElement).style.borderColor = colAccent;
          (e.currentTarget as HTMLElement).style.background = `color-mix(in oklab, ${colAccent} 6%, transparent)`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = 'var(--ink-mute)';
          (e.currentTarget as HTMLElement).style.borderColor = `color-mix(in oklab, ${colAccent} 22%, var(--line))`;
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }}
      >
        ＋ 添加任务
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') submit();
        if (e.key === 'Escape') { setValue(''); setOpen(false); }
      }}
      onBlur={submit}
      placeholder="任务标题…"
      className="w-full text-sm rounded-xl px-3 py-2 outline-none"
      style={{
        background: 'var(--surface)',
        border: `1px solid ${colAccent}`,
        color: 'var(--ink)',
        fontFamily: 'var(--font-sans)',
        boxShadow: `0 0 0 3px color-mix(in oklab, ${colAccent} 15%, transparent)`,
      }}
    />
  );
}

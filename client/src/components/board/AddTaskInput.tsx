import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import type { TaskStatus } from '../../types';

interface Props {
  status: TaskStatus;
  projectId?: string;
  onAdd: (title: string) => void;
}

export function AddTaskInput({ status: _status, onAdd }: Props) {
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

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        添加任务
      </button>
    );
  }

  return (
    <div className="space-y-1">
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
        className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded-md outline-none focus:ring-1 focus:ring-primary/30"
      />
    </div>
  );
}

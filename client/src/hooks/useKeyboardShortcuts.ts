import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBoardStore } from '../store/boardStore';

/** Returns true if the event originates from an editable element */
function isEditing(e: KeyboardEvent): boolean {
  const tag = (e.target as HTMLElement)?.tagName;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return true;
  if ((e.target as HTMLElement)?.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const setSelectedTask = useBoardStore((s) => s.setSelectedTask);

  const handler = useCallback(
    (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditing(e)) return;

      switch (e.key) {
        case 'b':
        case 'B':
          e.preventDefault();
          navigate('/board');
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          navigate('/calendar');
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          navigate('/projects');
          break;
        case 's':
        case 'S':
          e.preventDefault();
          navigate('/settings');
          break;
        case 'Escape':
          // Close task drawer if open
          setSelectedTask(null);
          break;
        default:
          break;
      }
    },
    [navigate, setSelectedTask],
  );

  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler]);
}

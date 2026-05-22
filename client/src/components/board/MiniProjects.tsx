import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';

export function MiniProjects() {
  const navigate = useNavigate();
  const { projects, tasks } = useBoardStore();

  const stats = projects.map((p) => {
    const pts  = tasks.filter((t) => t.projectId === p.id);
    const done = pts.filter((t) => t.status === 'done').length;
    return { ...p, total: pts.length, done };
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border flex-shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          项目
        </span>
        <button
          onClick={() => navigate('/projects')}
          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
        >
          全部 <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Scrollable project list */}
      <div className="flex-1 overflow-y-auto py-1">
        {stats.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">暂无项目</p>
        ) : (
          stats.map((p) => {
            const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
            return (
              <button
                key={p.id}
                onClick={() => navigate('/projects')}
                className="w-full px-3 py-2 hover:bg-muted/50 transition-colors text-left group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: p.color ?? '#6366f1' }}
                  />
                  <span className="text-xs font-medium truncate flex-1 group-hover:text-foreground transition-colors">
                    {p.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
                    {p.done}/{p.total}
                  </span>
                </div>
                <div className="ml-4 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: p.color ?? '#6366f1',
                    }}
                  />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

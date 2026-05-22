import { NavLink } from 'react-router-dom';
import { LayoutGrid, Calendar, FolderOpen, Settings, Moon, Sun } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSettingsStore } from '../store/settingsStore';

export function NavBar() {
  const { theme, toggleTheme } = useSettingsStore();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors',
      isActive
        ? 'bg-muted text-foreground font-medium'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
    );

  return (
    <nav className="flex-shrink-0 border-b border-border bg-background/90 backdrop-blur px-3 py-1.5 flex items-center gap-1">
      <span className="text-sm font-bold mr-3 pl-1 select-none">🍅 GTD</span>
      <NavLink to="/board" className={linkClass}>
        <LayoutGrid className="w-4 h-4" />
        看板
      </NavLink>
      <NavLink to="/calendar" className={linkClass}>
        <Calendar className="w-4 h-4" />
        日历
      </NavLink>
      <NavLink to="/projects" className={linkClass}>
        <FolderOpen className="w-4 h-4" />
        项目
      </NavLink>
      <NavLink to="/settings" className={linkClass}>
        <Settings className="w-4 h-4" />
        设置
      </NavLink>

      {/* Dark mode toggle — pushed to far right */}
      <button
        onClick={toggleTheme}
        className="ml-auto p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </nav>
  );
}

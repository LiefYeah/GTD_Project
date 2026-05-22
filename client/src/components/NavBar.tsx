import { NavLink } from 'react-router-dom';
import { LayoutGrid, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

export function NavBar() {
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
    </nav>
  );
}

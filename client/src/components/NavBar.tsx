import { NavLink, useLocation } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSettingsStore } from '../store/settingsStore';

const NAV_ITEMS = [
  { to: '/board',    label: '看板' },
  { to: '/calendar', label: '日历' },
  { to: '/projects', label: '项目' },
  { to: '/settings', label: '设置' },
];

export function NavBar() {
  const { theme, toggleTheme } = useSettingsStore();
  const location = useLocation();

  return (
    <header
      className="flex-shrink-0 sticky top-0 z-50"
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: '32px',
        padding: '12px 24px',
        background: 'color-mix(in oklab, var(--bg) 80%, transparent)',
        backdropFilter: 'saturate(140%) blur(12px)',
        WebkitBackdropFilter: 'saturate(140%) blur(12px)',
        borderBottom: '1px solid var(--line-soft)',
      }}
    >
      {/* Left: Brand */}
      <div className="flex items-center gap-3">
        {/* Overlapping dots mark */}
        <div className="relative w-7 h-7">
          <span
            className="absolute"
            style={{
              left: '2px', top: '4px',
              width: '18px', height: '18px',
              borderRadius: '50%',
              background: 'var(--brand)',
              boxShadow: '0 2px 8px color-mix(in oklab, var(--brand) 40%, transparent)',
            }}
          />
          <span
            className="absolute"
            style={{
              left: '9px', top: '9px',
              width: '14px', height: '14px',
              borderRadius: '50%',
              background: 'var(--ink)',
              mixBlendMode: theme === 'dark' ? 'screen' : 'multiply',
              opacity: 0.9,
            }}
          />
        </div>
        {/* Brand name */}
        <span
          className="font-mono text-xl font-bold tracking-tight select-none"
          style={{ fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}
        >
          GTD<span style={{ color: 'var(--brand)' }}>.</span>
        </span>
        {/* Version chip */}
        <span
          className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full border select-none"
          style={{
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.02em',
            color: 'var(--ink-mute)',
            background: 'var(--surface)',
            borderColor: 'var(--line)',
          }}
        >
          番茄工作法
        </span>
      </div>

      {/* Center: Pill nav */}
      <nav
        className="hidden sm:flex items-center gap-0.5 justify-self-center"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: '12px',
          padding: '4px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {NAV_ITEMS.map(({ to, label }) => {
          const isActive = location.pathname === to || (to === '/board' && location.pathname === '/');
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'text-[var(--bg)]'
                  : 'hover:bg-[var(--bg-2)]',
              )}
              style={isActive ? {
                background: 'var(--ink)',
                color: 'var(--bg)',
              } : {
                color: 'var(--ink-soft)',
              }}
            >
              {label}
            </NavLink>
          );
        })}
      </nav>

      {/* Right: Search + theme toggle + avatar */}
      <div className="flex items-center gap-2">
        {/* Search box */}
        <div
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border min-w-[220px]"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--line)',
            color: 'var(--ink-mute)',
          }}
        >
          <span className="text-base leading-none select-none">⌕</span>
          <span
            className="flex-1 text-sm select-none"
            style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-sans)' }}
          >
            搜索任务、项目…
          </span>
          <kbd
            className="text-[11px] px-1.5 py-0.5 rounded border"
            style={{
              fontFamily: 'var(--font-mono)',
              background: 'var(--bg-2)',
              borderColor: 'var(--line)',
              color: 'var(--ink-mute)',
            }}
          >
            ⌘K
          </kbd>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
          className="w-8 h-8 rounded-xl grid place-items-center border transition-all duration-150"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--line)',
            color: 'var(--ink-soft)',
          }}
        >
          {theme === 'dark'
            ? <Sun className="w-4 h-4" />
            : <Moon className="w-4 h-4" />}
        </button>

        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full grid place-items-center text-white text-[11px] font-bold select-none flex-shrink-0"
          style={{
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.02em',
            background: 'linear-gradient(135deg, var(--brand), color-mix(in oklab, var(--brand) 60%, #ff8e3a))',
          }}
        >
          ME
        </div>
      </div>
    </header>
  );
}

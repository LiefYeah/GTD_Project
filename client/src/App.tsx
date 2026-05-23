import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BoardPage } from './components/board/BoardPage';
import { CalendarPage } from './components/calendar/CalendarPage';
import { ProjectsPage } from './components/projects/ProjectsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { PomodoroBar } from './components/pomodoro/PomodoroBar';
import { NavBar } from './components/NavBar';
import { useSettingsStore } from './store/settingsStore';
import { usePomodoroStore } from './store/pomodoroStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

/** Headless: drives tick + auto-complete for the pomodoro timer, always mounted regardless of route */
function PomodoroTicker() {
  const { status, secondsLeft, tick, complete } = usePomodoroStore();
  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status, tick]);
  useEffect(() => {
    if (status === 'running' && secondsLeft <= 0) complete();
  }, [status, secondsLeft, complete]);
  return null;
}

/** Null-rendering component that registers keyboard shortcuts (needs useNavigate inside BrowserRouter) */
function KeyboardShortcuts() {
  useKeyboardShortcuts();
  return null;
}

/** Syncs settingsStore.theme → <html> class */
function ThemeSync() {
  const theme = useSettingsStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PomodoroTicker />
      <ThemeSync />
      <KeyboardShortcuts />
      <div className="flex flex-col h-screen app-bg">
        <NavBar />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/board" replace />} />
            <Route path="/board" element={<BoardPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
      {/* PomodoroBar: hidden on /board (PomodoroCard is shown there instead) */}
      <PomodoroBar />
    </BrowserRouter>
  );
}

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BoardPage } from './components/board/BoardPage';
import { CalendarPage } from './components/calendar/CalendarPage';
import { ProjectsPage } from './components/projects/ProjectsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { PomodoroBar } from './components/pomodoro/PomodoroBar';
import { NavBar } from './components/NavBar';
import { useSettingsStore } from './store/settingsStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

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
      <ThemeSync />
      <KeyboardShortcuts />
      <div className="flex flex-col h-screen">
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
      {/* PomodoroBar lives outside Routes — survives navigation */}
      <PomodoroBar />
    </BrowserRouter>
  );
}

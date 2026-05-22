import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BoardPage } from './components/board/BoardPage';
import { CalendarPage } from './components/calendar/CalendarPage';
import { ProjectsPage } from './components/projects/ProjectsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { PomodoroBar } from './components/pomodoro/PomodoroBar';
import { NavBar } from './components/NavBar';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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

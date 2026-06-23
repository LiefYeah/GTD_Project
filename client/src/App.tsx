import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BoardPage } from './components/board/BoardPage';
import { CalendarPage } from './components/calendar/CalendarPage';
import { ProjectsPage } from './components/projects/ProjectsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { PomodoroBar } from './components/pomodoro/PomodoroBar';
import { NavBar } from './components/NavBar';
import { useSettingsStore } from './store/settingsStore';
import { usePomodoroStore } from './store/pomodoroStore';
import type { Phase } from './store/pomodoroStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { playChime, requestNotificationPermission, sendNotification } from './lib/sound';
import { useRecurringStore } from './store/recurringStore';
import { useBoardStore } from './store/boardStore';

/** Headless: drives tick + phase transitions + notifications for the pomodoro timer */
function PomodoroTicker() {
  const {
    status, secondsLeft, tick, complete,
    phase, breakCountdown, tickBreakCountdown, startBreak, breakComplete,
  } = usePomodoroStore();

  // Request notification permission on first mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Drive tick for both focus and break running phases
  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status, tick]);

  // Snap to correct time immediately when tab regains visibility
  useEffect(() => {
    if (status !== 'running') return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [status, tick]);

  // Auto-complete focus when timer hits 0
  useEffect(() => {
    if (status === 'running' && phase === 'focus' && secondsLeft <= 0) complete();
  }, [status, phase, secondsLeft, complete]);

  // Drive awaitingBreak countdown (5→0)
  useEffect(() => {
    if (phase !== 'awaitingBreak') return;
    const id = setInterval(tickBreakCountdown, 1000);
    return () => clearInterval(id);
  }, [phase, tickBreakCountdown]);

  // Auto-start break when 5s countdown expires
  useEffect(() => {
    if (phase === 'awaitingBreak' && breakCountdown <= 0) startBreak();
  }, [phase, breakCountdown, startBreak]);

  // Auto-complete break when timer hits 0
  useEffect(() => {
    if ((phase === 'shortBreak' || phase === 'longBreak') && status === 'running' && secondsLeft <= 0) {
      breakComplete();
    }
  }, [phase, status, secondsLeft, breakComplete]);

  // Fire notification + chime on phase transitions
  const prevPhaseRef = useRef<Phase>(phase);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    if (phase !== prev) {
      if (phase === 'awaitingBreak') {
        playChime();
        sendNotification('🍅 专注结束！', '休息将在 5 秒后开始...');
      }
      if (phase === 'awaitingFocus') {
        playChime();
        sendNotification('☕ 休息结束！', '准备好了吗？点击开始专注');
      }
      prevPhaseRef.current = phase;
    }
  }, [phase]);

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

/** Initializes recurring tasks generation on app startup */
function RecurringInitializer() {
  const generateAndReload = useRecurringStore((s) => s.generateAndReload);
  const loadBoard = useBoardStore((s) => s.load);

  useEffect(() => {
    generateAndReload(loadBoard);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PomodoroTicker />
      <ThemeSync />
      <KeyboardShortcuts />
      <RecurringInitializer />
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

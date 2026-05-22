import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BoardPage } from './components/board/BoardPage';
import { PomodoroBar } from './components/pomodoro/PomodoroBar';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Navigate to="/board" replace />} />
        <Route path="/board" element={<BoardPage />} />
      </Routes>
      {/* PomodoroBar lives outside Routes — never unmounts on navigation */}
      <PomodoroBar />
    </BrowserRouter>
  );
}

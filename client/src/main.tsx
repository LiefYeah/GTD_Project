import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

// Apply dark class before first paint to avoid flash of wrong theme
try {
  const raw = localStorage.getItem('gtd-settings');
  if (raw) {
    const stored = JSON.parse(raw) as { state?: { theme?: string } };
    if (stored?.state?.theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }
} catch {
  // localStorage unavailable — skip
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

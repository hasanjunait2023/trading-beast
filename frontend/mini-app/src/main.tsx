import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { initTelegram, getWebApp } from './telegram';
import { ThemeProvider, useTheme } from '@shared/theme';
import { ToastProvider } from '@shared/components/Toast';
import './index.css';

// Initialise the Telegram WebApp (ready/expand/theme vars) before first paint.
// Null-safe: does nothing in a plain browser.
initTelegram();

// Captured before ThemeProvider can persist anything: whether the user had
// an explicit stored theme preference at startup.
const HAD_STORED_THEME = (() => {
  try {
    return Boolean(localStorage.getItem('tb-theme'));
  } catch {
    return false;
  }
})();

/**
 * Initial theme rule (handoff §5): an explicit stored preference wins; when
 * inside Telegram with no stored preference, the host colorScheme is the
 * initial theme; otherwise ThemeProvider's stored/system default applies.
 */
function TelegramThemeSeed() {
  const { setTheme } = useTheme();
  useEffect(() => {
    if (HAD_STORED_THEME) return;
    const wa = getWebApp();
    if (wa) setTheme(wa.colorScheme);
    // Run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <TelegramThemeSeed />
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>,
);

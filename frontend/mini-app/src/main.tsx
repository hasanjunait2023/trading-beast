import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { initTelegram } from './telegram';
import '@shared/global.css';
import './index.css';

// Initialise the Telegram WebApp (ready/expand/theme vars) before first paint.
// Null-safe: does nothing in a plain browser.
initTelegram();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

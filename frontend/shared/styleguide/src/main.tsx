import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '../../theme';
import { ToastProvider } from '../../components/Toast';
import App from './App';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Missing #root element');

createRoot(rootEl).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>,
);

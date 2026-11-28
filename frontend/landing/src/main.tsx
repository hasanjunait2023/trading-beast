import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { OfflineBanner } from '@shared/components/OfflineBanner';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OfflineBanner />
    <ErrorBoundary context="TradingBeast">
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

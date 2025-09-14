// ⬇️ CSS must be first so Vite injects Tailwind
import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { queryClient } from './queryClient';
import { AppBoundary } from './components/boundaries/AppBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppBoundary>
        <App />
      </AppBoundary>
    </QueryClientProvider>
  </React.StrictMode>
);
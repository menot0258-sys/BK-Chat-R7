import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// AI Studio HMR constraint: Ignore WebSocket connection errors when HMR is disabled
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const reasonStr = String(reason?.message || reason || '');
    if (
      reasonStr.includes('WebSocket') ||
      reasonStr.includes('websocket') ||
      reasonStr.includes('closed without opened') ||
      reasonStr.includes('[vite]')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = String(event.message || '');
    if (msg.includes('WebSocket') || msg.includes('websocket') || msg.includes('[vite]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);

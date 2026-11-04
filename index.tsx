import { registerSW } from 'virtual:pwa-register';

import React from 'react';
import { Capacitor } from '@capacitor/core';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker for offline support
if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  registerSW({ immediate: true });
}

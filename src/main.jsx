import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import VelvetWolf from './App.jsx'
import './index.css'
import { API_BASE_URL } from './velvetwolf/utils/api'

// Global fetch interceptor to inject credentials: 'include' for HttpOnly cookies
const originalFetch = window.fetch;
window.fetch = function (url, options) {
  const urlStr = typeof url === 'string' ? url : (url instanceof URL ? url.href : '');
  if (urlStr.startsWith('/') || urlStr.includes(API_BASE_URL)) {
    options = options || {};
    options.credentials = 'include';
  }
  return originalFetch(url, options);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <VelvetWolf />
    </BrowserRouter>
  </React.StrictMode>
);

// Register Service Worker for PWA support (Production only to avoid caching dev assets/breaking HMR)
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered successfully:', registration.scope);
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    });
  } else {
    // In development, unregister any active service worker to prevent HMR and WebSocket issues
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log('[PWA] Development mode: Active Service Worker unregistered to allow HMR.');
          }
        });
      }
    });
  }
}
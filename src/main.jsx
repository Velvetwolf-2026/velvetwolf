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
)
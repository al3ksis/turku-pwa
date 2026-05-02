import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register service worker for PWA installation
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}

// Anonymous daily visit ping (one per device per day)
const today = new Date().toISOString().slice(0, 10)
if (localStorage.getItem('lastTrackDate') !== today) {
  fetch('/.netlify/functions/track', { method: 'POST' })
    .then(() => localStorage.setItem('lastTrackDate', today))
    .catch(() => { /* silent */ })
}

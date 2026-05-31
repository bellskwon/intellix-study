import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/app-params'
import App from '@/App.jsx'
import '@/index.css'

// Force light mode — remove any previously saved dark preference
document.documentElement.classList.remove('dark');
try { localStorage.removeItem('intellix_dark'); } catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
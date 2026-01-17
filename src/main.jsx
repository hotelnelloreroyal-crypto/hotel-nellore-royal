import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Disable inspect mode if VITE_DISABLE_DEVTOOLS is true
if (import.meta.env.VITE_DISABLE_DEVTOOLS === 'true') {
  // Disable right-click context menu
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  
  // Disable keyboard shortcuts for DevTools
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
      e.preventDefault();
      return false;
    }
    // Ctrl+U (View Source)
    if (e.ctrlKey && e.key.toUpperCase() === 'U') {
      e.preventDefault();
      return false;
    }
  });

  // Detect DevTools open (basic detection)
  const detectDevTools = () => {
    const threshold = 160;
    if (window.outerWidth - window.innerWidth > threshold || 
        window.outerHeight - window.innerHeight > threshold) {
      document.body.innerHTML = '<h1 style="text-align:center;margin-top:50px;">DevTools is disabled</h1>';
    }
  };
  setInterval(detectDevTools, 1000);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

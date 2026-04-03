import React from 'react';
import ReactDOM from 'react-dom/client';
import Main from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => console.log('SW registered:', registration.scope))
      .catch((error) => console.log('SW registration failed:', error));
  });
}

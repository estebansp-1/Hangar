import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/global.css';

// El backend gratuito (Render) se duerme sin visitas: lo despertamos apenas abre la página,
// para que cuando el visitante llegue al catálogo o al login ya esté respondiendo.
fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/health`).catch(() => {});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

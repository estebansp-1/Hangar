import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LazyMotion } from 'motion/react';
import App from './App';
import './styles/global.css';

// El backend gratuito (Render) se duerme sin visitas: lo despertamos apenas abre la página,
// para que cuando el visitante llegue al catálogo o al login ya esté respondiendo.
fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/health`).catch(() => {});

const loadMotionFeatures = () => import('./lib/motion-features').then((r) => r.default);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Motion en modo ligero: los componentes m.* cargan sus funciones bajo demanda */}
    <LazyMotion features={loadMotionFeatures}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </LazyMotion>
  </React.StrictMode>,
);

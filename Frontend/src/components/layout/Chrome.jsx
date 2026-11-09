import { useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, m as motion, useMotionValue, useSpring } from 'motion/react';
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap';
import { toast, useToasts } from '../../store/ui';
import { useAuth, useFavorites } from '../../store/auth';
import { useI18n } from '../../i18n';
import { getLenis } from './SmoothScroll';
import { CONTACT } from '../../content/site';
import './chrome.css';

/* ───────── Preloader (una vez por sesión): el logo de HANGAR se construye como una obra ───────── */
export function Preloader() {
  const [done, setDone] = useState(() => {
    try {
      return sessionStorage.getItem('hangar-loaded') === '1';
    } catch {
      return false;
    }
  });
  const root = useRef(null);
  const num = useRef(null);
  useGSAP(
    () => {
      if (done) return;
      const c = { v: 0 };
      gsap
        .timeline({
          onComplete: () => {
            try {
              sessionStorage.setItem('hangar-loaded', '1');
            } catch {
              /* sin storage */
            }
            setDone(true);
          },
        })
        .to(c, { v: 100, duration: 2.1, ease: 'power2.inOut', onUpdate: () => num.current && (num.current.textContent = String(Math.round(c.v)).padStart(3, '0')) }, 0)
        // 1. replanteo: retícula de obra y línea de terreno
        .from('.pl__grid line', { opacity: 0, duration: 0.5, stagger: 0.02 }, 0)
        .from('.pl__ground', { strokeDashoffset: 1, duration: 0.5, ease: 'power3.out' }, 0.05)
        // 2. estructura: suben las dos columnas de la H
        .from('.pl__stem', { scaleY: 0, transformOrigin: '50% 100%', duration: 0.55, stagger: 0.12, ease: 'expo.out' }, 0.35)
        // 3. losas: los pisos aparecen de abajo hacia arriba
        .from('.pl__floor', { scaleX: 0, transformOrigin: '50% 50%', duration: 0.3, stagger: 0.07, ease: 'back.out(2)' }, 0.65)
        // 4. viga en voladizo lima
        .from('.pl__beam', { strokeDashoffset: 1, duration: 0.45, ease: 'power3.inOut' }, 0.95)
        // 5. cubierta: se traza la bóveda del hangar
        .from('.pl__vault', { strokeDashoffset: 1, duration: 0.8, ease: 'power2.inOut' }, 1.05)
        .from('.pl__vault--in', { strokeDashoffset: 1, duration: 0.7, ease: 'power2.inOut' }, 1.2)
        // 6. sale el sol
        .from('.pl__sun', { scale: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(3)' }, 1.7)
        .to('.pl__grid', { opacity: 0, duration: 0.6 }, 1.6)
        .from('.pre__word span', { yPercent: 115, duration: 1.1, stagger: 0.06, ease: 'expo.out' }, 0.9)
        .from('.pre__beam', { scaleX: 0, duration: 1.1, ease: 'expo.inOut' }, 1.2)
        .from('.pre__tag', { opacity: 0, y: 10, duration: 0.7 }, 1.5)
        .to(root.current, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' }, '+=0.2');
    },
    { scope: root },
  );
  if (done) return null;
  return (
    <div className="pre" ref={root}>
      <div className="pre__center">
      <svg viewBox="0 0 48 48" className="pre__logo" aria-hidden="true">
        <g className="pl__grid">
          {[8, 16, 24, 32, 40].map((x) => (
            <line key={`v${x}`} x1={x} y1="4" x2={x} y2="44" />
          ))}
          {[8, 16, 24, 32, 40].map((y) => (
            <line key={`h${y}`} x1="4" y1={y} x2="44" y2={y} />
          ))}
        </g>
        <path className="pl__vault" pathLength="1" d="M7 40V22.5C7 13.4 14.6 6 24 6s17 7.4 17 16.5V40" />
        <path className="pl__vault pl__vault--in" pathLength="1" d="M11.5 40V23c0-6.9 5.6-12.5 12.5-12.5S36.5 16.1 36.5 23v17" />
        <path className="pl__stem" d="M17 40V19" />
        <path className="pl__stem" d="M31 40V19" />
        {[34.5, 29].map((y) => [14.5, 28.5].map((x) => <path key={`${x}${y}`} className="pl__floor" d={`M${x} ${y}h5`} />))}
        <path className="pl__beam" pathLength="1" d="M17 25h18.5" />
        <path className="pl__ground" pathLength="1" d="M3 40h42" />
        <circle className="pl__sun" cx="38.5" cy="12" r="2.2" />
      </svg>
        <h1 className="pre__word" aria-label="HANGAR">
          {'HANGAR'.split('').map((c, i) => (
            <span key={i} aria-hidden="true">
              {c}
            </span>
          ))}
        </h1>
        <i className="pre__beam" aria-hidden="true" />
        <span className="pre__tag mono">Architecture · Interiors · Cali</span>
      </div>
      <div className="pre__meta container">
        <span />
        <span className="pre__num serif" ref={num}>
          000
        </span>
      </div>
    </div>
  );
}

/* ───────── Transición entre páginas: cortina oliva ───────── */
export function PageTransition({ children }) {
  const { pathname } = useLocation();
  return (
    <AnimatePresence
      mode="wait"
      onExitComplete={() => {
        const l = getLenis();
        if (l) l.scrollTo(0, { immediate: true, force: true });
        else window.scrollTo(0, 0);
        requestAnimationFrame(() => ScrollTrigger.refresh());
      }}
    >
      <motion.div key={pathname} initial="init" animate="enter" exit="exit">
        <motion.div className="curtain" style={{ originY: 0 }} variants={{ init: { scaleY: 1 }, enter: { scaleY: 0, transition: { duration: 0.75, ease: [0.76, 0, 0.24, 1] } }, exit: { scaleY: 0 } }} />
        <motion.div className="curtain" style={{ originY: 1 }} variants={{ init: { scaleY: 0 }, enter: { scaleY: 0 }, exit: { scaleY: 1, transition: { duration: 0.5, ease: [0.76, 0, 0.24, 1] } } }} />
        <motion.div variants={{ init: { opacity: 0, y: 30 }, enter: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] } }, exit: { opacity: 0 } }}>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ───────── Toasts ───────── */
export function Toasts() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="toasts" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            className={`toast toast--${t.tone}`}
            onClick={() => dismiss(t.id)}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            <span className="toast__dot" />
            {t.message}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ───────── Botón magnético ───────── */
export function Magnetic({ children, strength = 0.3, className = '' }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 16 });
  const sy = useSpring(y, { stiffness: 220, damping: 16 });
  return (
    <motion.div
      className={className}
      style={{ x: sx, y: sy, display: 'inline-flex' }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * strength);
        y.set((e.clientY - r.top - r.height / 2) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/* ───────── Corazón de favoritos (exige sesión) ───────── */
export function FavButton({ kind, refId, className = '' }) {
  const user = useAuth((s) => s.user);
  const active = useFavorites((s) => s.keys.includes(`${kind}:${refId}`));
  const toggle = useFavorites((s) => s.toggle);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  return (
    <motion.button
      className={`fav ${active ? 'is-active' : ''} ${className}`}
      whileTap={{ scale: 0.85 }}
      aria-pressed={active}
      aria-label={active ? t('common.favRemove') : t('common.favAdd')}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
          toast(t('common.loginNeeded'), 'accent');
          return navigate('/acceso', { state: { from: location.pathname + location.search } });
        }
        try {
          await toggle(kind, refId);
        } catch (err) {
          toast(err.message, 'error');
        }
      }}
    >
      <svg viewBox="0 0 24 24" width="18" height="18">
        <motion.path
          d="M12 20s-7.5-4.6-7.5-10.4A4.1 4.1 0 0 1 12 7.2a4.1 4.1 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20Z"
          strokeWidth="1.7"
          stroke="currentColor"
          initial={false}
          animate={{ fill: active ? 'currentColor' : 'rgba(0,0,0,0)', scale: active ? [1, 1.25, 1] : 1 }}
          transition={{ duration: 0.35 }}
        />
      </svg>
    </motion.button>
  );
}

/* ───────── Rutas protegidas ───────── */
export function RequireAuth({ children, role }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/acceso" replace state={{ from: location.pathname + location.search }} />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

/* ───────── Footer ───────── */
export function Footer() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  const root = useRef(null);
  useGSAP(
    () => {
      gsap.from('.footer__brand > *', { y: 28, opacity: 0, stagger: 0.12, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: root.current, start: 'top 85%' } });
      gsap.from('.footer__line', { scaleX: 0, duration: 1.3, ease: 'expo.inOut', delay: 0.3, scrollTrigger: { trigger: root.current, start: 'top 85%' } });
    },
    { scope: root, dependencies: [pathname], revertOnUpdate: true },
  );
  if (pathname.startsWith('/admin') || pathname.startsWith('/acceso')) return null;
  return (
    <footer className="footer" ref={root}>
      <div className="container">
        <div className="footer__grid">
          <div className="footer__about">
            <p className="footer__lead serif">{t('footer.news')}</p>
            <form className="footer__form" onSubmit={(e) => e.preventDefault()}>
              <input className="input" type="email" placeholder="tu@correo.com" aria-label={t('auth.email')} />
              <button className="btn btn--primary">{t('footer.join')}</button>
            </form>
          </div>
          <div className="footer__cols">
            <div>
              <p className="eyebrow">HANGAR</p>
              <Link to="/proyectos">{t('nav.projects')}</Link>
              <Link to="/estilos">{t('nav.styles')}</Link>
              <Link to="/servicios">{t('nav.services')}</Link>
            </div>
            <div>
              <p className="eyebrow">{t('nav.contact')}</p>
              <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              <a href={CONTACT.whatsapp} target="_blank" rel="noreferrer">
                WhatsApp {CONTACT.phone}
              </a>
              <span className="muted">{CONTACT.city}</span>
            </div>
          </div>
        </div>
        <div className="footer__brand">
          <span className="footer__word">Hangar</span>
        </div>
        <i className="footer__line" aria-hidden="true" />
      </div>
    </footer>
  );
}

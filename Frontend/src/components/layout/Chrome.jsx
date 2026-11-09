import { useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValue, useSpring } from 'motion/react';
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap';
import { toast, useToasts } from '../../store/ui';
import { useAuth, useFavorites } from '../../store/auth';
import { useI18n } from '../../i18n';
import { getLenis } from './SmoothScroll';
import { CONTACT } from '../../content/site';
import './chrome.css';

/* ───────── Preloader (una vez por sesión): se dibuja la silueta de un edificio ───────── */
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
        .from('.pre__line', { strokeDashoffset: 900, duration: 1.7, stagger: 0.06, ease: 'power2.inOut' }, 0)
        .to(c, { v: 100, duration: 1.9, ease: 'power2.inOut', onUpdate: () => num.current && (num.current.textContent = String(Math.round(c.v)).padStart(3, '0')) }, 0)
        .to('.pre__win', { opacity: 1, stagger: { each: 0.03, from: 'random' }, duration: 0.2 }, 0.9)
        .to(root.current, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' }, '+=0.2');
    },
    { scope: root },
  );
  if (done) return null;
  return (
    <div className="pre" ref={root}>
      <svg viewBox="0 0 120 160" className="pre__svg" aria-hidden="true">
        <path className="pre__line" d="M10 150 H110" />
        <path className="pre__line" d="M30 150 V30 H90 V150" />
        {Array.from({ length: 8 }).map((_, i) => (
          <path key={i} className="pre__line" d={`M30 ${45 + i * 13} H90`} />
        ))}
        {Array.from({ length: 24 }).map((_, i) => (
          <rect key={i} className="pre__win" x={36 + (i % 3) * 17} y={34 + Math.floor(i / 3) * 13} width="12" height="7" />
        ))}
      </svg>
      <div className="pre__meta container">
        <span className="pre__brand serif">
          Hangar<span>.</span>
        </span>
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
      gsap.from('.footer__giant span', { yPercent: 105, stagger: 0.05, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: root.current, start: 'top 85%' } });
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
        <div className="footer__giant serif" aria-hidden="true">
          {'Hangar.'.split('').map((c, i) => (
            <span key={i}>{c}</span>
          ))}
        </div>
        <div className="footer__bottom mono">
          <span>© {new Date().getFullYear()} HANGAR — {t('brand.tag')}</span>
          <span>{t('footer.credits')}</span>
        </div>
      </div>
    </footer>
  );
}

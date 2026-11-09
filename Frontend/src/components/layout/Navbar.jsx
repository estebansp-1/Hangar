import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ArrowUpRight, ClipboardList, Heart, House, LayoutGrid, LogOut, Menu, Moon, Sun, UserRound } from 'lucide-react';
import { CONTACT } from '../../content/site';
import { useAuth } from '../../store/auth';
import { usePrefs, useI18n } from '../../i18n';
import { getLenis } from './SmoothScroll';
import Logo from './Logo';
import './navbar.css';

const LINKS = [
  { to: '/proyectos', key: 'nav.projects' },
  { to: '/estilos', key: 'nav.styles' },
  { to: '/servicios', key: 'nav.services' },
  { to: '/recorrido', key: 'nav.plans3d' },
];

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

export function ThemeToggle() {
  const { theme, toggleTheme } = usePrefs();
  const { t } = useI18n();
  return (
    <button className="util" onClick={toggleTheme} aria-label={t('nav.theme')} title={t('nav.theme')}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={theme} initial={{ rotate: -60, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 60, opacity: 0 }} transition={{ duration: 0.25 }} style={{ display: 'grid' }}>
          {theme === 'dark' ? <Moon size={16} strokeWidth={1.6} /> : <Sun size={16} strokeWidth={1.6} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

export function LangSwitch() {
  const { lang, setLang } = usePrefs();
  const { t } = useI18n();
  return (
    <div className="langs" role="radiogroup" aria-label={t('nav.lang')}>
      {['es', 'en'].map((l, i) => (
        <span key={l} className="langs__item">
          {i > 0 && <i aria-hidden="true">/</i>}
          <button role="radio" aria-checked={lang === l} onClick={() => setLang(l)}>
            {l.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  );
}

function Account({ compact = false }) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (!user)
    return (
      <Link to="/acceso" className={`signin ${compact ? 'signin--compact' : ''}`}>
        <span>{t('nav.signin')}</span>
        <ArrowRight size={15} strokeWidth={1.8} />
      </Link>
    );

  return (
    <div className="acct" ref={ref}>
      <button className={`acct__btn ${open ? 'is-open' : ''}`} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="acct__ini">{initials(user.name)}</span>
        {!compact && <span className="acct__name">{user.name.split(' ')[0]}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="acct__menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="acct__head">
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
            <Link to="/cuenta?tab=fav">
              <Heart size={15} strokeWidth={1.6} /> {t('nav.favorites')}
            </Link>
            <Link to="/cuenta?tab=req">
              <ClipboardList size={15} strokeWidth={1.6} /> {t('nav.requests')}
            </Link>
            <Link to="/cuenta?tab=profile">
              <UserRound size={15} strokeWidth={1.6} /> {t('nav.account')}
            </Link>
            {user.role === 'ADMIN' && (
              <Link to="/admin">
                <LayoutGrid size={15} strokeWidth={1.6} /> {t('nav.admin')}
              </Link>
            )}
            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
            >
              <LogOut size={15} strokeWidth={1.6} /> {t('nav.logout')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Navbar() {
  const [solid, setSolid] = useState(false);
  const [sheet, setSheet] = useState(false);
  const { pathname } = useLocation();
  const { t } = useI18n();

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setSheet(false), [pathname]);
  useEffect(() => {
    const l = getLenis();
    if (sheet) l?.stop();
    else l?.start();
    const esc = (e) => e.key === 'Escape' && setSheet(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [sheet]);

  if (pathname.startsWith('/admin') || pathname === '/acceso') return null;
  // Portadas fotográficas oscuras: texto claro mientras la barra es transparente
  const onDark = !solid && /^\/(proyectos|estilos)\/[^/]+$/.test(pathname);

  return (
    <>
      <header className={`bar ${solid ? 'is-solid' : ''} ${onDark ? 'is-on-dark' : ''}`}>
        <div className="bar__inner">
          <Link to="/" aria-label="HANGAR" className="bar__logo">
            <Logo />
          </Link>

          <nav className="bar__links" aria-label="Principal">
            <NavLink to="/" end className="bar__link bar__home" aria-label={t('nav.home')} title={t('nav.home')}>
              {({ isActive }) => (
                <>
                  <House size={17} strokeWidth={1.6} />
                  {isActive && <motion.i layoutId="bar-dot" className="bar__dot" transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }} />}
                </>
              )}
            </NavLink>
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className="bar__link">
                {({ isActive }) => (
                  <>
                    {t(l.key)}
                    {isActive && <motion.i layoutId="bar-dot" className="bar__dot" transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }} />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="bar__utils">
            <LangSwitch />
            <ThemeToggle />
            <span className="bar__sep" aria-hidden="true" />
            <Account />
          </div>

          <div className="bar__mobile">
            <Account compact />
            <button className="bar__menu" onClick={() => setSheet(true)} aria-expanded={sheet} aria-controls="sheet" aria-label={t('nav.menu')}>
              <Menu size={20} strokeWidth={1.6} />
            </button>
          </div>
        </div>
      </header>

      {/* Celular: panel inferior */}
      <AnimatePresence>
        {sheet && (
          <>
            <motion.div className="sheet-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheet(false)} />
            <motion.nav
              id="sheet"
              className="sheet"
              aria-label="Principal"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => (info.offset.y > 90 || info.velocity.y > 500) && setSheet(false)}
              data-lenis-prevent
            >
              <span className="sheet__handle" aria-hidden="true" />
              <ul>
                {[{ to: '/', key: 'nav.home' }, ...LINKS].map((l, i) => (
                  <motion.li key={l.to} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.04 }}>
                    <NavLink to={l.to} end={l.to === '/'} className="sheet__link">
                      <span className="serif">{t(l.key)}</span>
                      <ArrowUpRight size={18} strokeWidth={1.5} />
                    </NavLink>
                  </motion.li>
                ))}
              </ul>
              <div className="sheet__foot">
                <LangSwitch />
                <ThemeToggle />
                <a href={CONTACT.whatsapp} target="_blank" rel="noreferrer" className="muted">
                  {CONTACT.phone}
                </a>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

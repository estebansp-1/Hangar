import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Box, DraftingCompass, Map, Sun, X, ArrowRight, Leaf } from 'lucide-react';
import { gsap, SplitText, useGSAP } from '../../lib/gsap';
import { usePrefs, useI18n } from '../../i18n';
import { getLenis } from '../layout/SmoothScroll';
import { PHASES } from './data';
import Blueprint from './Blueprint';
import './residence.css';

const Residence = lazy(() => import('../three/Residence'));
const BOUNDS = [0, 0.15, 0.4, 0.7, 0.9];
const phaseOf = (p) => (p >= 0.9 ? 4 : p >= 0.7 ? 3 : p >= 0.4 ? 2 : p >= 0.15 ? 1 : 0);

/** Hero: la Residencia HANGAR se construye fase por fase con el scroll */
export default function ResidenceHero() {
  const root = useRef(null);
  const progress = useRef(0);
  const [phase, setPhase] = useState(0);
  const [mode, setMode] = useState('real');
  const [plan, setPlan] = useState(false);
  const theme = usePrefs((s) => s.theme);
  const { t, l, lang } = useI18n();
  const P = PHASES[phase];

  useGSAP(
    () => {
      const split = SplitText.create('.rh__brand', { type: 'chars', mask: 'chars' });
      let loaded = false;
      try {
        loaded = sessionStorage.getItem('hangar-loaded') === '1';
      } catch {
        /* sin storage */
      }
      gsap.from(split.chars, { yPercent: 110, stagger: 0.04, duration: 1.2, ease: 'expo.out', delay: loaded ? 0.4 : 3.1 });
      gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: '+=560%',
          scrub: true,
          pin: true,
          onUpdate: (self) => {
            progress.current = self.progress;
            setPhase(phaseOf(self.progress));
          },
        },
      });
      return () => split.revert();
    },
    { scope: root },
  );

  // Escape cierra el plano y bloquea el scroll mientras está abierto
  useEffect(() => {
    const l2 = getLenis();
    if (plan) l2?.stop();
    else l2?.start();
    const esc = (e) => e.key === 'Escape' && setPlan(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [plan]);

  const MODES = [
    { id: 'real', icon: Sun, label: lang === 'en' ? 'Render' : 'Render' },
    { id: 'blueprint', icon: DraftingCompass, label: lang === 'en' ? 'Blueprint' : 'Plano' },
    { id: 'wire', icon: Box, label: 'Wireframe' },
  ];

  return (
    <section className={`rh rh--${mode}`} ref={root} aria-label="Residencia HANGAR">
      <div className="rh__canvas">
        <Suspense fallback={<div className="rh__loading mono">{t('common.loading')}</div>}>
          <Residence progress={progress} mode={mode} theme={theme} />
        </Suspense>
      </div>

      {/* título y fase */}
      <div className="rh__title container">
        <p className="eyebrow eyebrow--accent">HANGAR // ARCHITECTURAL LABS · RESIDENCES</p>
        <h1 className="rh__brand display-caps">
          <span className="nowrap">Hangar</span> <span className="rh__slash">/</span> <span className="nowrap">Residence 01</span>
        </h1>
        <AnimatePresence mode="wait">
          <motion.p key={phase} className="rh__sub" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }}>
            <span className="mono">{l(P.kicker)}:</span> {l(P.sub)}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* riel de progreso lateral */}
      <ol className="rh__rail" aria-hidden="true">
        <i className="rh__rail-track">
          <motion.i className="rh__rail-fill" animate={{ scaleY: (phase + 1) / PHASES.length }} transition={{ type: 'spring', stiffness: 120, damping: 22 }} />
        </i>
        {PHASES.map((ph, i) => (
          <li key={ph.id} className={i <= phase ? 'is-on' : ''} style={{ top: `${(i / (PHASES.length - 1)) * 100}%` }}>
            <span className="rh__dot" />
            <span className="rh__rail-label mono">{ph.h}</span>
          </li>
        ))}
      </ol>

      {/* tarjeta de especificaciones */}
      <div className="rh__cards">
        <AnimatePresence mode="wait">
          <motion.article
            key={phase}
            className="rh__card"
            initial={{ opacity: 0, x: 40, filter: 'blur(6px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -20, filter: 'blur(6px)' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="eyebrow eyebrow--accent">{l(P.kicker)}</span>
            <h2 className="serif">{l(P.title)}</h2>
            <p className="muted">{l(P.text)}</p>
            <dl className="rh__specs">
              {P.specs.map(([k, v]) => (
                <div key={l(k)}>
                  <dt className="mono">{l(k)}</dt>
                  <dd className="serif">{l(v)}</dd>
                </div>
              ))}
            </dl>
            <div className="rh__cert">
              <Leaf size={14} /> {lang === 'en' ? 'Green certification' : 'Certificación verde'} <strong>A++</strong>
            </div>
            <div className="rh__actions">
              <button className="btn btn--ghost btn--sm" onClick={() => setPlan(true)} aria-label={lang === 'en' ? 'Explore 2D plan' : 'Explorar Plano 2D'}>
                <Map size={15} /> {lang === 'en' ? 'Explore 2D plan' : 'Explorar Plano 2D'}
              </button>
              {phase === 4 && (
                <Link to="/servicios?s=house#cotizar" className="btn btn--primary btn--sm">
                  {lang === 'en' ? 'Book a private meeting' : 'Agendar Cita Privada'} <ArrowRight size={15} />
                </Link>
              )}
            </div>
          </motion.article>
        </AnimatePresence>
      </div>

      {/* telemetría */}
      <Telemetry phase={phase} progress={progress} />

      {/* selector de modo */}
      <div className="rh__modes" role="radiogroup" aria-label={lang === 'en' ? 'View mode' : 'Modo de visualización'}>
        {MODES.map(({ id, icon: Icon, label }) => (
          <button key={id} role="radio" aria-checked={mode === id} onClick={() => setMode(id)} title={label}>
            {mode === id && <motion.span layoutId="mode-pill" className="rh__mode-pill" transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }} />}
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* modal: plano 2D del nivel activo (portal: fuera de la sección fijada por GSAP) */}
      {createPortal(
      <AnimatePresence>
        {plan && (
          <motion.div className="rh__modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPlan(false)} data-lenis-prevent>
            <motion.div
              className="rh__sheet"
              role="dialog"
              aria-modal="true"
              aria-label={l(P.title)}
              initial={{ y: 40, scale: 0.97, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 20, scale: 0.98, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <header className="rh__sheet-head">
                <div>
                  <span className="eyebrow eyebrow--accent">
                    {l(P.kicker)} · {P.h}
                  </span>
                  <h3 className="serif">{l(P.title)}</h3>
                </div>
                <button className="icon-btn" onClick={() => setPlan(false)} aria-label={t('nav.close')}>
                  <X size={18} />
                </button>
              </header>
              <Blueprint phaseId={P.id} />
              <footer className="rh__sheet-foot mono">
                <span>HANGAR // RESIDENCE 01</span>
                <span>{lang === 'en' ? 'Scale' : 'Escala'} 1:200</span>
              </footer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
        document.body,
      )}

      <div className={`rh__hint mono ${phase > 0 ? 'is-hidden' : ''}`}>
        <span>{t('hero.scroll')}</span>
        <i />
      </div>
    </section>
  );
}

/** Coordenadas de cámara, cota y avance: se actualizan sin re-render (escritura directa al DOM) */
function Telemetry({ phase, progress }) {
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    let mod;
    import('../three/Residence').then((m) => (mod = m));
    const tick = () => {
      const el = ref.current;
      if (el && mod) {
        const { x, y, z } = mod.telemetry;
        el.querySelector('[data-x]').textContent = x.toFixed(2);
        el.querySelector('[data-y]').textContent = y.toFixed(2);
        el.querySelector('[data-z]').textContent = z.toFixed(2);
        el.querySelector('[data-p]').textContent = `${String(Math.round(progress.current * 100)).padStart(3, '0')}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress]);
  return (
    <div className="rh__hud mono" ref={ref} aria-hidden="true">
      <div className="rh__hud-row">
        <span>X</span>
        <b data-x>0.00</b>
        <span>Y</span>
        <b data-y>0.00</b>
        <span>Z</span>
        <b data-z>0.00</b>
      </div>
      <div className="rh__hud-row">
        <span>H</span>
        <b>{PHASES[phase].h}</b>
        <span className="rh__badge" data-p>
          000%
        </span>
      </div>
    </div>
  );
}

export { BOUNDS };

import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { gsap, SplitText, useGSAP } from '../lib/gsap';
import { api } from '../services';
import { useAsync } from '../hooks/useAsync';
import { usePrefs, useI18n, html } from '../i18n';
import { Magnetic } from '../components/layout/Chrome';
import { PropertyCard, StyleCard, useScrollFx } from '../components/cards';
import { PROCESS, SERVICES } from '../content/site';
import ResidenceHero from '../components/residence/ResidenceHero';
import { Droplets, Leaf, Sun as SunIcon, Wind } from 'lucide-react';
import './home.css';

const TourScene = lazy(() => import('../components/three/TourScene'));

export default function Home() {
  const { data, error } = useAsync(() => Promise.all([api.styles.list(), api.properties.list({ featured: 'true' })]).then(([s, p]) => ({ styles: s.styles, properties: p.properties })), []);
  // Todo se monta junto (con datos o sin ellos): los ScrollTrigger con pin se crean en orden de DOM
  if (!data && !error) return <main className="page" aria-busy="true" />;
  const styles = data?.styles || [];
  const properties = data?.properties || [];
  return (
    <main>
      <ResidenceHero />
      <Services />
      <Process />
      <Sustainability />
      {styles.length > 0 && <Styles styles={styles} />}
      {properties.length > 0 && <Featured properties={properties} />}
      <Stats />
      <Cta />
    </main>
  );
}

/* ─────────────── 1. Recorrido 3D: edificio → piso → apartamento → plano ─────────────── */
/** Estilo de respaldo del recorrido cuando aún no hay estilos cargados en el panel */
const DEFAULT_STYLE = {
  slug: 'base',
  name: { es: 'Base', en: 'Base' },
  pricePerM2: 0,
  scene: { floor: '#D8C3A0', wall: '#F3EFE8', sofa: '#C9C4B8', accent: '#84CC16', wood: '#C9A97C', metal: '#2F2F2C', rug: '#E3DACB', stone: '#EDEAE4', plant: '#5E7A4A' },
};

export function Tour({ styles }) {
  const root = useRef(null);
  const progress = useRef(0);
  const [step, setStep] = useState(-1); // -1 = portada
  const [styleIdx, setStyleIdx] = useState(0);
  const theme = usePrefs((s) => s.theme);
  const { t, l } = useI18n();
  const style = styles[styleIdx] || styles[0] || DEFAULT_STYLE;

  useGSAP(
    () => {
      const split = SplitText.create('.tour__title', { type: 'words,lines', mask: 'lines' });
      let loaded = false;
      try {
        loaded = sessionStorage.getItem('hangar-loaded') === '1';
      } catch {
        /* sin storage */
      }
      gsap.from(split.lines, { yPercent: 110, duration: 1.2, stagger: 0.08, ease: 'expo.out', delay: loaded ? 0.4 : 3.1 });
      gsap.from('.tour__intro .eyebrow, .tour__hint', { opacity: 0, y: 16, duration: 0.9, delay: loaded ? 0.7 : 3.4, stagger: 0.1 });

      gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: '+=520%',
          scrub: true,
          pin: true,
          onUpdate: (self) => {
            progress.current = self.progress;
            const p = self.progress;
            setStep(p < 0.06 ? -1 : Math.min(4, Math.floor(p * 5.0001)));
          },
        },
      });
      return () => split.revert();
    },
    { scope: root },
  );

  const steps = [1, 2, 3, 4, 5];
  return (
    <section className="tour" ref={root} aria-label="Recorrido 3D">
      <div className="tour__canvas">
        <Suspense fallback={<div className="tour__loading mono">{t('common.loading')}</div>}>
          <TourScene progress={progress} theme={theme} styleScene={style?.scene} />
        </Suspense>
      </div>
      <div className="tour__shade" />

      <AnimatePresence>
        {step === -1 && (
          <motion.div className="tour__intro container" exit={{ opacity: 0, y: -40, transition: { duration: 0.5 } }}>
            <p className="eyebrow eyebrow--accent">{t('hero.eyebrow')}</p>
            <h1 className="tour__title serif" dangerouslySetInnerHTML={html(t('hero.title'))} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="tour__panel container">
        <AnimatePresence mode="wait">
          {step >= 0 && (
            <motion.div
              key={step}
              className="tour__card"
              initial={{ opacity: 0, y: 30, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(6px)' }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="eyebrow eyebrow--accent">{t(`tour.s${step + 1}.k`)}</span>
              <h2 className="serif">{t(`tour.s${step + 1}.t`)}</h2>
              <p>{t(`tour.s${step + 1}.p`)}</p>
              {step === 1 && <span className="tour__specs mono">{t('tour.specs')}</span>}
              {step === 4 && (
                <>
                  <div className="tour__styles" role="radiogroup" aria-label={t('common.style')}>
                    {styles.map((s, i) => (
                      <button key={s.slug} role="radio" aria-checked={i === styleIdx} className="chip" aria-pressed={i === styleIdx} onClick={() => setStyleIdx(i)}>
                        <span className="tour__swatch" style={{ background: `linear-gradient(135deg, ${s.scene.floor} 50%, ${s.scene.sofa} 50%)` }} />
                        {l(s.name)}
                      </button>
                    ))}
                  </div>
                  <div className="tour__cta">
                    <span className="mono muted">
                      {l(style.name)}
                    </span>
                    <Link to="/proyectos" className="btn btn--primary btn--sm">
                      {t('tour.cta')} <span className="arrow">→</span>
                    </Link>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ol className="tour__rail" aria-hidden="true">
        {steps.map((n, i) => (
          <li key={n} className={i <= step ? 'is-on' : ''}>
            <span className="mono">0{n}</span>
            <i />
          </li>
        ))}
      </ol>

      <div className={`tour__hint mono ${step >= 0 ? 'is-hidden' : ''}`}>
        <span>{t('hero.scroll')}</span>
        <i />
      </div>
    </section>
  );
}

/* ─────────────── 2. Servicios con imágenes que se amplían ─────────────── */
function Services() {
  const root = useRef(null);
  const { t, l } = useI18n();
  useScrollFx(root);
  return (
    <section className="services section" ref={root}>
      <div className="container">
        <div className="sec-head">
          <p className="eyebrow eyebrow--accent">{t('home.services.k')}</p>
          <h2 className="serif" dangerouslySetInnerHTML={html(t('home.services.t'))} />
        </div>
        <div className="services__grid">
          {SERVICES.map((s, i) => (
            <Link to={`/servicios?s=${s.id}`} key={s.id} className="service" style={{ '--i': i }}>
              <div className="service__media" data-expand>
                <img src={s.image} alt="" loading="lazy" />
              </div>
              <div className="service__body">
                <span className="mono muted">0{i + 1}</span>
                <h3 className="serif">{l(s.title)}</h3>
                <p className="muted">{l(s.text)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────── 3. Proceso: scroll horizontal con ampliación ─────────────── */
function Process() {
  const root = useRef(null);
  const { t, l } = useI18n();
  useGSAP(
    () => {
      const track = root.current.querySelector('.process__track');
      const distance = () => track.scrollWidth - window.innerWidth + 64;
      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: () => `+=${distance()}`, scrub: 1, pin: true, invalidateOnRefresh: true },
      });
      gsap.utils.toArray('.step').forEach((el) => {
        gsap.fromTo(
          el.querySelector('.step__media'),
          { clipPath: 'inset(18% 18% 18% 18% round 24px)' },
          { clipPath: 'inset(0% 0% 0% 0% round 24px)', ease: 'none', scrollTrigger: { trigger: el, containerAnimation: tween, start: 'left 95%', end: 'left 35%', scrub: true } },
        );
        gsap.fromTo(el.querySelector('img'), { scale: 1.3 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      });
      gsap.to('.process__bar i', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: () => `+=${distance()}`, scrub: true } });
    },
    { scope: root },
  );
  return (
    <section className="process" id="proceso" ref={root}>
      <div className="process__head container">
        <div>
          <p className="eyebrow eyebrow--accent">{t('home.process.k')}</p>
          <h2 className="serif">{t('home.process.t')}</h2>
        </div>
        <div className="process__bar">
          <i />
        </div>
      </div>
      <div className="process__track">
        {PROCESS.map((s, i) => (
          <article key={s.id} className="step">
            <div className="step__media">
              <img src={s.image} alt="" loading="lazy" />
            </div>
            <div className="step__body">
              <span className="step__num serif">0{i + 1}</span>
              <div>
                <h3 className="serif">{l(s.title)}</h3>
                <p className="muted">{l(s.text)}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ─────────────── Sostenibilidad ─────────────── */
function Sustainability() {
  const root = useRef(null);
  const { lang } = useI18n();
  useScrollFx(root);
  const en = lang === 'en';
  const items = [
    { icon: SunIcon, v: en ? 'Sun' : 'Sol', t: en ? 'Rooftop solar power' : 'Energía solar en cubierta', d: en ? 'Panels sized to each project’s real consumption.' : 'Paneles dimensionados según el consumo real de cada proyecto.' },
    { icon: Droplets, v: en ? 'Rain' : 'Lluvia', t: en ? 'Rainwater harvesting' : 'Recolección de agua lluvia', d: en ? 'Tanks for irrigation and toilets.' : 'Tanques para riego y sanitarios.' },
    { icon: Wind, v: en ? 'Breeze' : 'Brisa', t: en ? 'Cross ventilation' : 'Ventilación cruzada', d: en ? 'We orient each home to catch Cali’s afternoon breeze and stay cool with less air conditioning.' : 'Orientamos cada casa para recibir la brisa de la tarde de Cali y mantenerla fresca con menos aire acondicionado.' },
    { icon: Leaf, v: en ? 'Green' : 'Verde', t: en ? 'Native landscaping' : 'Paisajismo nativo', d: en ? 'Native Valle del Cauca plants and low-footprint materials.' : 'Plantas nativas del Valle del Cauca y materiales de baja huella.' },
  ];
  return (
    <section className="section sustain" id="sostenibilidad" ref={root}>
      <div className="container sustain__grid">
        <div className="sustain__media" data-expand>
          <img src="/img/house-lshape.webp" alt="" loading="lazy" />
        </div>
        <div>
          <p className="eyebrow eyebrow--accent">{en ? 'Sustainability' : 'Sostenibilidad'}</p>
          <h2 className="serif sustain__title">{en ? 'Architecture that ' : 'Arquitectura que '}<i>{en ? 'breathes' : 'respira'}</i></h2>
          <p className="lead">{en ? 'Every HANGAR project is designed bioclimatically: orientation, shade, ventilation and energy are solved from the first sketch.' : 'Cada proyecto HANGAR se diseña de forma bioclimática: orientación, sombra, ventilación y energía se resuelven desde el primer trazo.'}</p>
          <div className="sustain__items">
            {items.map(({ icon: Icon, v, t, d }) => (
              <div key={t} className="sustain__item">
                <span className="sustain__icon"><Icon size={18} /></span>
                <strong className="serif">{v}</strong>
                <span className="sustain__t">{t}</span>
                <span className="muted">{d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── 4. Estilos ─────────────── */
function Styles({ styles }) {
  const { t } = useI18n();
  return (
    <section className="section">
      <div className="container">
        <div className="sec-head sec-head--split">
          <div>
            <p className="eyebrow eyebrow--accent">{t('home.styles.k')}</p>
            <h2 className="serif" dangerouslySetInnerHTML={html(t('home.styles.t'))} />
          </div>
          <div>
            <p className="lead">{t('home.styles.p')}</p>
            <Link to="/estilos" className="btn btn--ghost" style={{ marginTop: 20 }}>
              {t('common.seeAll')} <span className="arrow">→</span>
            </Link>
          </div>
        </div>
        <div className="styles-grid">
          {styles.slice(0, 6).map((s, i) => (
            <StyleCard key={s.slug} s={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────── 5. Proyectos destacados ─────────────── */
function Featured({ properties }) {
  const { t } = useI18n();
  const [first, ...rest] = properties;
  return (
    <section className="section featured">
      <div className="container">
        <div className="sec-head sec-head--split">
          <div>
            <p className="eyebrow eyebrow--accent">{t('home.projects.k')}</p>
            <h2 className="serif" dangerouslySetInnerHTML={html(t('home.projects.t'))} />
          </div>
          <Link to="/proyectos" className="btn btn--ghost">
            {t('common.seeAll')} <span className="arrow">→</span>
          </Link>
        </div>
        <div className="featured__grid">
          {first && <PropertyCard p={first} large />}
          <div className="featured__side">
            {rest.slice(0, 4).map((p, i) => (
              <PropertyCard key={p.slug} p={p} index={i + 1} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── 6. Cifras ─────────────── */
function Stats() {
  const root = useRef(null);
  const { t } = useI18n();
  const items = useMemo(
    () => [
      // Cifras del estudio: se actualizan cuando haya proyectos entregados reales
      { v: 0, s: '', k: 'home.stats.1' },
      { v: 0, s: '', k: 'home.stats.2' },
      { v: 0, s: '', k: 'home.stats.3' },
      { v: 0, s: '%', k: 'home.stats.4' },
    ],
    [],
  );
  useGSAP(
    () => {
      gsap.utils.toArray('.stat__n').forEach((el) => {
        const o = { v: 0 };
        gsap.to(o, { v: Number(el.dataset.v), duration: 2, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 88%' }, onUpdate: () => (el.textContent = Math.round(o.v) + el.dataset.s) });
      });
    },
    { scope: root },
  );
  return (
    <section className="stats" ref={root}>
      <div className="container stats__grid">
        {items.map((it) => (
          <div key={it.k} className="stat">
            <span className="stat__n serif" data-v={it.v} data-s={it.s}>
              0
            </span>
            <span className="muted">{t(it.k)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────── 7. Llamado a la acción con imagen que se expande ─────────────── */
function Cta() {
  const root = useRef(null);
  const { t } = useI18n();
  useGSAP(
    () => {
      gsap.fromTo('.cta__frame', { clipPath: 'inset(10% 8% 10% 8% round 36px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: root.current, start: 'top 85%', end: 'top 10%', scrub: true } });
      gsap.fromTo('.cta__frame img', { scale: 1.3, yPercent: -6 }, { scale: 1, yPercent: 6, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true } });
    },
    { scope: root },
  );
  return (
    <section className="cta" ref={root}>
      <div className="cta__frame">
        <img src="/img/house-dusk.webp" alt="" loading="lazy" />
        <div className="cta__content container">
          <h2 className="serif">{t('home.cta.t')}</h2>
          <p>{t('home.cta.p')}</p>
          <Magnetic>
            <Link to="/servicios#cotizar" className="btn btn--light">
              {t('home.cta.b')} <span className="arrow">→</span>
            </Link>
          </Magnetic>
        </div>
      </div>
    </section>
  );
}

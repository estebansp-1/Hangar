import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Copy } from 'lucide-react';
import { gsap, SplitText, useGSAP } from '../lib/gsap';
import { api } from '../services';
import { useAsync } from '../hooks/useAsync';
import { usePrefs, useI18n } from '../i18n';
import { toast } from '../store/ui';
import { FavButton } from '../components/layout/Chrome';
import { useScrollFx } from '../components/cards';
import { money } from '../lib/format';
import './pages.css';
import './styles-page.css';

const StructureViewer = lazy(() => import('../components/three/StructureViewer'));

/* ───────── Contenido ───────── */
const ROLES = { es: ['Fachada', 'Interior', 'Madera', 'Carpintería', 'Acento'], en: ['Façade', 'Interior', 'Timber', 'Frames', 'Accent'] };
const PALETTES = [
  { name: { es: 'Arena del Valle', en: 'Valley sand' }, use: { es: 'Casas cálidas con madera clara y verde en el jardín.', en: 'Warm homes with light timber and a green garden.' }, c: ['#EDE6DA', '#F7F4EE', '#A47A52', '#2B2B2B', '#7E9A4F'] },
  { name: { es: 'Terracota', en: 'Terracotta' }, use: { es: 'Fachadas de barro y tonos tierra, muy de clima cálido.', en: 'Clay façades and earth tones, made for warm climates.' }, c: ['#C8785A', '#F3E9DF', '#7B5A3C', '#2A2522', '#D9A441'] },
  { name: { es: 'Blanco y roble', en: 'White and oak' }, use: { es: 'Minimalista y luminosa: muros blancos y roble natural.', en: 'Minimal and bright: white walls and natural oak.' }, c: ['#F7F6F2', '#FFFFFF', '#C9A27A', '#1E1E1E', '#8FA07A'] },
  { name: { es: 'Grafito', en: 'Graphite' }, use: { es: 'Contemporánea y sobria, con madera para dar calidez.', en: 'Contemporary and sober, with timber for warmth.' }, c: ['#55595F', '#EDEBE7', '#B88A5E', '#141414', '#C7B299'] },
  { name: { es: 'Salvia', en: 'Sage' }, use: { es: 'Verdes suaves que se funden con el paisaje.', en: 'Soft greens that blend with the landscape.' }, c: ['#B9C2A8', '#F2F1EA', '#8C6A48', '#2E3329', '#E3D5B8'] },
  { name: { es: 'Finca colonial', en: 'Colonial finca' }, use: { es: 'Cal, madera oscura y teja de barro para casas de campo.', en: 'Lime wash, dark timber and clay tile for country homes.' }, c: ['#F4EFE3', '#FBF8F1', '#6B4A2E', '#3B2A1E', '#B5532F'] },
];

const PIECES = [
  { id: 'brick', es: ['Ladrillo tolete', 'Muros de fachada a la vista y mampostería confinada.'], en: ['Clay brick', 'Exposed façade walls and confined masonry.'] },
  { id: 'block', es: ['Bloque de concreto', 'Mampostería estructural reforzada: las celdas llevan acero y mortero.'], en: ['Concrete block', 'Reinforced structural masonry: the cells carry steel and grout.'] },
  { id: 'steel', es: ['Perfil de acero IPE', 'Vigas para voladizos, mezzanines y luces amplias.'], en: ['IPE steel section', 'Beams for cantilevers, mezzanines and wide spans.'] },
  { id: 'rebar', es: ['Varilla corrugada', 'El refuerzo de columnas, vigas y losas de concreto.'], en: ['Deformed rebar', 'The reinforcement inside concrete columns, beams and slabs.'] },
  { id: 'glulam', es: ['Madera laminada', 'Vigas y pérgolas en láminas encoladas e inmunizadas.'], en: ['Glulam timber', 'Glued, treated laminated beams and pergolas.'] },
  { id: 'tile', es: ['Teja de barro', 'Cubiertas a dos aguas para fincas y casas de campo.'], en: ['Clay roof tile', 'Pitched roofs for fincas and country homes.'] },
  { id: 'glass', es: ['Vidrio templado', 'Ventanería de piso a techo con marco de aluminio.'], en: ['Tempered glass', 'Floor-to-ceiling glazing in aluminium frames.'] },
  { id: 'paver', es: ['Adoquín de concreto', 'Accesos, parqueaderos y senderos de alto tráfico.'], en: ['Concrete paver', 'Driveways, parking and high-traffic paths.'] },
];

const STRUCTS = [
  { id: 'house', es: ['Casa', 'Zapatas aisladas, pórticos de columnas y vigas en concreto reforzado y losa entre niveles.'], en: ['House', 'Isolated footings, reinforced concrete column-and-beam frames and slabs between levels.'] },
  { id: 'apartments', es: ['Apartamentos', 'Pórticos con un punto fijo de muros estructurales (escaleras y ascensor) y balcones en voladizo.'], en: ['Apartments', 'Frames around a structural-wall core (stairs and lift) with cantilevered balconies.'] },
  { id: 'tower', es: ['Edificio', 'Núcleo central de muros y pórticos perimetrales, diseñado con la NSR-10 para la amenaza sísmica alta de Cali.'], en: ['Building', 'Central wall core and perimeter frames, designed to NSR-10 for Cali’s high seismic hazard.'] },
  { id: 'finca', es: ['Finca', 'Columnas en concreto, corredor perimetral con postes de madera y cubierta a dos aguas sobre cerchas.'], en: ['Finca', 'Concrete columns, a timber-post veranda all around and a pitched roof on timber trusses.'] },
];

/* ───────── Cabecera ───────── */
function Head() {
  const root = useRef(null);
  const { lang } = useI18n();
  const en = lang === 'en';
  useGSAP(
    () => {
      const split = SplitText.create('.ph__title', { type: 'chars', mask: 'chars' });
      gsap.from(split.chars, { yPercent: 100, stagger: 0.03, duration: 1.1, ease: 'expo.out', delay: 0.35 });
      return () => split.revert();
    },
    { scope: root },
  );
  return (
    <header className="ph ph--split" ref={root}>
      <div>
        <p className="eyebrow eyebrow--accent">{en ? 'Colour · Materials · Structure' : 'Color · Materiales · Estructura'}</p>
        <h1 className="ph__title serif">{en ? 'Styles' : 'Estilos'}</h1>
      </div>
      <p className="lead">{en ? 'Everything that defines how your project looks and stands: palettes, the pieces we build with and the structure underneath.' : 'Todo lo que define cómo se ve y cómo se sostiene tu proyecto: paletas, las piezas con las que construimos y la estructura que va por dentro.'}</p>
    </header>
  );
}

/* ───────── 1. Paletas ───────── */
function Palettes() {
  const { lang, l } = useI18n();
  const en = lang === 'en';
  const roles = ROLES[en ? 'en' : 'es'];
  const copy = (hex) => {
    navigator.clipboard?.writeText(hex).then(
      () => toast(`${hex} ${en ? 'copied' : 'copiado'}`, 'success'),
      () => {},
    );
  };
  return (
    <section className="st-sec">
      <div className="st-head">
        <span className="mono muted">01</span>
        <h2 className="serif">{en ? 'Colour palettes' : 'Paletas de color'}</h2>
        <p className="muted">{en ? 'Five colours per palette, from façade to accent. Tap a colour to copy its code.' : 'Cinco colores por paleta, de la fachada al acento. Toca un color para copiar su código.'}</p>
      </div>
      <div className="pals">
        {PALETTES.map((p, i) => (
          <motion.article key={p.c[0]} className="pal" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.6, delay: (i % 3) * 0.06, ease: [0.22, 1, 0.36, 1] }}>
            <div className="pal__bands">
              {p.c.map((c, j) => (
                <button key={c} className="pal__band" style={{ background: c, flexGrow: j === 0 ? 2.2 : 1 }} onClick={() => copy(c)} aria-label={`${roles[j]} ${c}`}>
                  <span className="pal__hex mono">
                    {c}
                    <Copy size={11} />
                  </span>
                </button>
              ))}
            </div>
            <div className="pal__body">
              <h3 className="serif">{l(p.name)}</h3>
              <p className="muted">{l(p.use)}</p>
              <ul className="pal__roles">
                {p.c.map((c, j) => (
                  <li key={c}>
                    <i style={{ background: c }} />
                    {roles[j]}
                  </li>
                ))}
              </ul>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

/* ───────── 2. Piezas de construcción ───────── */
function Pieces() {
  const { lang } = useI18n();
  const en = lang === 'en';
  const ref = useRef(null);
  const [imgs, setImgs] = useState(null);
  useEffect(() => {
    // las fotos se generan una vez, cuando la sección se acerca a la pantalla
    const el = ref.current;
    if (!el) return;
    let alive = true;
    const io = new IntersectionObserver(
      async ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const mod = await import('../components/three/pieces');
        mod.warm();
        if (alive) setImgs(mod.renderPieces(mod.PIECE_IDS));
      },
      { rootMargin: '400px' },
    );
    io.observe(el);
    return () => {
      alive = false;
      io.disconnect();
    };
  }, []);
  return (
    <section className="st-sec" ref={ref}>
      <div className="st-head">
        <span className="mono muted">02</span>
        <h2 className="serif">{en ? 'What we build with' : 'Con qué construimos'}</h2>
        <p className="muted">{en ? 'The pieces behind every HANGAR project.' : 'Las piezas que hay detrás de cada proyecto HANGAR.'}</p>
      </div>
      <div className="pieces">
        {PIECES.map((p, i) => {
          const [t, d] = en ? p.en : p.es;
          return (
            <motion.article key={p.id} className="piece" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.6, delay: (i % 4) * 0.05, ease: [0.22, 1, 0.36, 1] }}>
              <div className="piece__img">{imgs ? <img src={imgs[p.id]} alt={t} /> : <span className="piece__ph" />}</div>
              <h3 className="serif">{t}</h3>
              <p className="muted">{d}</p>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

/* ───────── 3. Estructuras en 3D ───────── */
function Structures() {
  const [kind, setKind] = useState('house');
  const theme = usePrefs((s) => s.theme);
  const { lang } = useI18n();
  const en = lang === 'en';
  const cur = STRUCTS.find((s) => s.id === kind);
  const [title, text] = en ? cur.en : cur.es;
  return (
    <section className="st-sec">
      <div className="st-head">
        <span className="mono muted">03</span>
        <h2 className="serif">{en ? 'Structures in 3D' : 'Estructuras en 3D'}</h2>
        <p className="muted">{en ? 'Only the bones: footings, columns, beams, slabs and roofs. Drag to rotate.' : 'Solo el esqueleto: zapatas, columnas, vigas, losas y cubiertas. Arrastra para girar.'}</p>
      </div>
      <div className="sv">
        <div className="sv__view">
          <Suspense fallback={null}>
            <StructureViewer kind={kind} theme={theme} />
          </Suspense>
        </div>
        <div className="sv__side">
          <div className="sv__tabs" role="tablist">
            {STRUCTS.map((s) => (
              <button key={s.id} role="tab" aria-selected={kind === s.id} onClick={() => setKind(s.id)}>
                {kind === s.id && <motion.span layoutId="sv-pill" className="sv__pill" transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }} />}
                <span>{(en ? s.en : s.es)[0]}</span>
              </button>
            ))}
          </div>
          <motion.div key={kind} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <h3 className="serif sv__title">{title}</h3>
            <p className="muted">{text}</p>
          </motion.div>
          <ul className="sv__legend">
            <li>
              <i className="lg-c" />
              {en ? 'Concrete: footings, columns, beams' : 'Concreto: zapatas, columnas, vigas'}
            </li>
            <li>
              <i className="lg-s" />
              {en ? 'Slabs' : 'Losas'}
            </li>
            <li>
              <i className="lg-w" />
              {en ? 'Structural walls' : 'Muros estructurales'}
            </li>
            <li>
              <i className="lg-t" />
              {en ? 'Timber' : 'Madera'}
            </li>
          </ul>
          <Link to={`/servicios?s=${kind === 'house' || kind === 'finca' ? 'house' : 'building'}`} className="btn btn--primary">
            {en ? 'Quote this structure' : 'Cotizar esta estructura'} <span className="arrow">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ───────── 4. Estilos interiores (cargados desde el admin) ───────── */
function InteriorStyles() {
  const root = useRef(null);
  const { t, l, lang } = useI18n();
  const { data } = useAsync(() => api.styles.list().then((r) => r.styles), []);
  useScrollFx(root, [data?.length]);
  return (
    <section className="st-sec" ref={root} hidden={!data?.length}>
      <div className="st-head">
        <span className="mono muted">04</span>
        <h2 className="serif">{lang === 'en' ? 'Interior styles' : 'Estilos interiores'}</h2>
        <p className="muted">{t('styles.p')}</p>
      </div>
      <div className="srows">
        {(data || []).map((s, i) => (
          <article key={s.slug} className={`srow ${i % 2 ? 'srow--rev' : ''}`}>
            <Link to={`/estilos/${s.slug}`} className="srow__media" data-expand>
              <img src={s.images[0]} alt={l(s.name)} loading="lazy" />
            </Link>
            <div className="srow__body">
              <span className="mono muted">0{i + 1}</span>
              <h2 className="serif">{l(s.name)}</h2>
              <p className="srow__tag serif">{l(s.tagline)}</p>
              <p className="muted">{l(s.description)}</p>
              <div className="palette">
                {s.palette.map((c) => (
                  <span key={c} style={{ background: c }} title={c} />
                ))}
              </div>
              <div className="srow__foot">
                <span>
                  <span className="eyebrow">{t('style.price')}</span>
                  <strong className="serif">{money(s.pricePerM2)}</strong>
                </span>
                <div className="row gap-8">
                  <FavButton kind="style" refId={s.slug} />
                  <Link to={`/estilos/${s.slug}`} className="btn btn--primary btn--sm">
                    {t('common.see')} <span className="arrow">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function Styles() {
  return (
    <main className="page">
      <div className="container">
        <Head />
        <Palettes />
        <Pieces />
        <Structures />
        <InteriorStyles />
      </div>
    </main>
  );
}

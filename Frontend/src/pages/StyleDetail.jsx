import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { gsap, SplitText, useGSAP } from '../lib/gsap';
import { api } from '../services';
import { useAsync } from '../hooks/useAsync';
import { useI18n } from '../i18n';
import { FavButton } from '../components/layout/Chrome';
import { StyleCard, useScrollFx } from '../components/cards';
import { money } from '../lib/format';
import './pages.css';

export default function StyleDetail() {
  const { slug } = useParams();
  const { t } = useI18n();
  const { data, error, loading } = useAsync(() => Promise.all([api.styles.get(slug), api.styles.list()]).then(([a, b]) => ({ s: a.style, all: b.styles })), [slug]);
  if (loading) return <main className="page" aria-busy="true" />;
  if (error)
    return (
      <main className="page container empty">
        <p className="serif">{error.message}</p>
        <Link to="/estilos" className="btn btn--primary">
          {t('nav.styles')}
        </Link>
      </main>
    );
  return <View key={data.s.slug} s={data.s} others={data.all.filter((x) => x.slug !== data.s.slug).slice(0, 3)} />;
}

function View({ s, others }) {
  const root = useRef(null);
  const { t, l } = useI18n();
  const [area, setArea] = useState(80);
  useScrollFx(root, [s.slug]);

  useGSAP(
    () => {
      const split = SplitText.create('.sd__title', { type: 'chars', mask: 'chars' });
      gsap.from(split.chars, { yPercent: 100, stagger: 0.04, duration: 1.1, ease: 'expo.out', delay: 0.4 });
      // portada: la imagen pasa de ventana a pantalla completa
      gsap.fromTo('.sd__hero-img', { clipPath: 'inset(12% 10% 6% 10% round 32px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: '.sd__hero', start: 'top top', end: 'bottom 30%', scrub: true } });
      gsap.from('.palette--big span', { scaleY: 0, transformOrigin: 'bottom', stagger: 0.07, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.palette--big', start: 'top 85%' } });
      return () => split.revert();
    },
    { scope: root },
  );

  return (
    <main className="sd" ref={root}>
      <section className="sd__hero">
        <div className="sd__hero-img">
          <img src={s.images[0]} alt={l(s.name)} />
        </div>
        <div className="sd__hero-copy container">
          <Link to="/estilos" className="mono sd__back">
            ← {t('nav.styles')}
          </Link>
          <h1 className="sd__title serif">{l(s.name)}</h1>
          <p className="sd__tag serif">{l(s.tagline)}</p>
        </div>
      </section>

      <section className="container sd__intro">
        <p className="prop__desc serif">{l(s.description)}</p>
        <FavButton kind="style" refId={s.slug} />
      </section>

      <section className="container sd__specs">
        <div>
          <p className="eyebrow eyebrow--accent">{t('style.palette')}</p>
          <div className="palette palette--big">
            {s.palette.map((c) => (
              <span key={c} style={{ background: c }}>
                <i className="mono">{c}</i>
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="eyebrow eyebrow--accent">{t('style.materials')}</p>
          <ul className="sd__materials">
            {(l(s.materials) || []).map((m, i) => (
              <li key={m}>
                <span className="mono muted">0{i + 1}</span>
                <span className="serif">{m}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container gallery gallery--wide">
        {s.images.slice(1).map((src, i) => (
          <figure key={src} className={`gallery__item gallery__item--${i % 3}`} data-expand>
            <img src={src} alt="" loading="lazy" />
          </figure>
        ))}
      </section>

      <section className="container section">
        <div className="calc card">
          <div>
            <p className="eyebrow eyebrow--accent">{t('style.calc')}</p>
            <h2 className="serif">
              {l(s.name)} · {money(s.pricePerM2)} {t('common.perm2')}
            </h2>
          </div>
          <div className="calc__body">
            <label className="label" htmlFor="area">
              {t('style.area')}: <strong>{area} m²</strong>
            </label>
            <input id="area" type="range" min="20" max="400" step="5" value={area} onChange={(e) => setArea(Number(e.target.value))} className="range" />
            <div className="calc__result">
              <span className="eyebrow">{t('style.estimate')}</span>
              <motion.strong key={area} className="serif" initial={{ opacity: 0.4, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                {money(area * s.pricePerM2)}
              </motion.strong>
            </div>
            <Link to={`/servicios?s=interior&style=${s.slug}&area=${area}#cotizar`} className="btn btn--primary">
              {t('style.quote')} <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="container section">
        <h2 className="serif related__title">{t('nav.styles')}</h2>
        <div className="grid-3">
          {others.map((x, i) => (
            <StyleCard key={x.slug} s={x} index={i} />
          ))}
        </div>
      </section>
    </main>
  );
}

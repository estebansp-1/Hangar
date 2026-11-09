import { Link } from 'react-router-dom';
import { m as motion } from 'motion/react';
import { FavButton } from './layout/Chrome';
import { useI18n } from '../i18n';
import { money, num, STATUS_TONE } from '../lib/format';
import { gsap, useGSAP } from '../lib/gsap';
import './cards.css';

export function PropertyCard({ p, index = 0, large = false }) {
  const { t } = useI18n();
  return (
    <motion.article
      className={`pcard ${large ? 'pcard--large' : ''}`}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, delay: (index % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={`/proyectos/${p.slug}`} className="pcard__media">
        <img src={p.images[0]} alt={p.name} loading="lazy" />
        <div className="pcard__top">
          <span className={`badge badge--${STATUS_TONE[p.status]}`}>
            <i className="dot" />
            {t(`status.${p.status}`)}
          </span>
          <FavButton kind="property" refId={p.slug} />
        </div>
        <span className="pcard__type mono">{t(`type.${p.type}`)}</span>
      </Link>
      <div className="pcard__body">
        <div>
          <h3 className="serif">{p.name}</h3>
          <p className="muted">
            {p.neighborhood}, {p.city}
          </p>
        </div>
        <strong className="pcard__price">{money(p.price, true)}</strong>
      </div>
      <ul className="pcard__specs mono">
        <li>{num(p.area)} m²</li>
        {p.bedrooms > 0 && (
          <li>
            {p.bedrooms} {t('common.bed')}
          </li>
        )}
        {p.bathrooms > 0 && (
          <li>
            {p.bathrooms} {t('common.bath')}
          </li>
        )}
        <li>
          {p.floors} {t('common.floors')}
        </li>
      </ul>
    </motion.article>
  );
}

export function StyleCard({ s, index = 0 }) {
  const { t, l } = useI18n();
  return (
    <motion.article
      className="scard"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, delay: (index % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={`/estilos/${s.slug}`} className="scard__media">
        <img src={s.images[0]} alt={l(s.name)} loading="lazy" />
        <FavButton kind="style" refId={s.slug} className="scard__fav" />
        <div className="scard__palette">
          {s.palette.map((c) => (
            <i key={c} style={{ background: c }} />
          ))}
        </div>
      </Link>
      <div className="scard__body">
        <h3 className="serif">{l(s.name)}</h3>
        <p className="muted">{l(s.tagline)}</p>
      </div>
    </motion.article>
  );
}

/**
 * Efectos de scroll reutilizables dentro de `scope`:
 *  [data-expand]  → la imagen se amplía (clip-path) al entrar en pantalla
 *  [data-parallax="0.2"] → desplazamiento vertical proporcional al scroll
 */
export function useScrollFx(scope, deps = []) {
  useGSAP(
    () => {
      gsap.utils.toArray('[data-expand]').forEach((el) => {
        gsap.fromTo(
          el,
          { clipPath: 'inset(14% 10% 14% 10% round 28px)' },
          { clipPath: 'inset(0% 0% 0% 0% round 28px)', ease: 'none', scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 30%', scrub: true } },
        );
        const img = el.querySelector('img');
        if (img) gsap.fromTo(img, { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
      gsap.utils.toArray('[data-parallax]').forEach((el) => {
        const k = Number(el.dataset.parallax) || 0.2;
        gsap.fromTo(el, { yPercent: 100 * k }, { yPercent: -100 * k, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    },
    { scope, dependencies: deps, revertOnUpdate: true },
  );
}

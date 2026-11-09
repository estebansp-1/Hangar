import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { gsap, SplitText, useGSAP } from '../lib/gsap';
import { api } from '../services';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../store/auth';
import { toast } from '../store/ui';
import { usePrefs, useI18n } from '../i18n';
import { FavButton } from '../components/layout/Chrome';
import { PropertyCard, useScrollFx } from '../components/cards';
import { money, num, STATUS_TONE } from '../lib/format';
import './pages.css';

const ModelViewer = lazy(() => import('../components/three/ModelViewer'));

export default function Property() {
  const { slug } = useParams();
  const { t } = useI18n();
  const { data, error, loading } = useAsync(
    () => Promise.all([api.properties.get(slug), api.properties.list(), api.styles.list()]).then(([a, b, c]) => ({ p: a.property, all: b.properties, styles: c.styles })),
    [slug],
  );
  if (loading) return <main className="page" aria-busy="true" />;
  if (error)
    return (
      <main className="page container empty">
        <p className="serif">{error.message}</p>
        <Link to="/proyectos" className="btn btn--primary">
          {t('nav.projects')}
        </Link>
      </main>
    );
  return <PropertyView key={data.p.slug} {...data} />;
}

function PropertyView({ p, all, styles }) {
  const root = useRef(null);
  const { t, l } = useI18n();
  const theme = usePrefs((s) => s.theme);
  const style = styles.find((s) => s.slug === p.styleId);
  const related = useMemo(() => all.filter((x) => x.slug !== p.slug).slice(0, 3), [all, p.slug]);
  useScrollFx(root, [p.slug]);

  useGSAP(
    () => {
      const split = SplitText.create('.prop__title', { type: 'chars', mask: 'chars' });
      gsap.from(split.chars, { yPercent: 100, stagger: 0.03, duration: 1.1, ease: 'expo.out', delay: 0.4 });
      // la foto de portada se amplía de tarjeta a pantalla completa al bajar
      gsap.fromTo('.prop__hero-img', { clipPath: 'inset(0% 3% 0% 3% round 0px 0px 32px 32px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)', ease: 'none', scrollTrigger: { trigger: '.prop__hero', start: 'top top', end: 'bottom 40%', scrub: true } });
      gsap.to('.prop__hero-img img', { yPercent: 12, scale: 1.08, ease: 'none', scrollTrigger: { trigger: '.prop__hero', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.from('.spec', { y: 40, opacity: 0, stagger: 0.08, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: '.specs', start: 'top 85%' } });
      return () => split.revert();
    },
    { scope: root },
  );

  const specs = [
    [t('property.area'), `${num(p.area)} m²`],
    p.bedrooms > 0 && [t('property.bedrooms'), p.bedrooms],
    p.bathrooms > 0 && [t('property.bathrooms'), p.bathrooms],
    [t('property.parking'), p.parking],
    [t('common.floors'), p.floors],
    p.delivery && [t('common.delivery'), p.delivery],
  ].filter(Boolean);

  return (
    <main className="prop" ref={root}>
      <section className="prop__hero">
        <div className="prop__hero-img">
          <img src={p.images[0]} alt={p.name} />
        </div>
        <div className="prop__hero-copy container">
          <div className="row gap-8">
            <span className={`badge badge--${STATUS_TONE[p.status]}`}>
              <i className="dot" />
              {t(`status.${p.status}`)}
            </span>
            <span className="badge">{t(`type.${p.type}`)}</span>
          </div>
          <h1 className="prop__title serif">{p.name}</h1>
          <p className="prop__loc">
            {p.neighborhood}, {p.city}
          </p>
        </div>
      </section>

      <section className="container prop__main">
        <div className="prop__content">
          <div className="specs">
            {specs.map(([k, v]) => (
              <div className="spec" key={k}>
                <span className="eyebrow">{k}</span>
                <strong className="serif">{v}</strong>
              </div>
            ))}
          </div>

          <p className="prop__desc serif">{l(p.description)}</p>

          <div className="prop__features">
            <p className="eyebrow eyebrow--accent">{t('property.features')}</p>
            <ul>
              {(l(p.features) || []).map((f) => (
                <li key={f}>
                  <span className="prop__check">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="gallery">
            {p.images.slice(1).map((src, i) => (
              <figure key={src} className={`gallery__item gallery__item--${i % 3}`} data-expand>
                <img src={src} alt="" loading="lazy" />
              </figure>
            ))}
          </div>

          <div className="model card">
            <div className="model__head">
              <div>
                <p className="eyebrow eyebrow--accent">{t('property.model')}</p>
                <span className="muted">{t('property.modelHint')}</span>
              </div>
              {style && (
                <Link to={`/estilos/${style.slug}`} className="chip">
                  <span className="tour__swatch" style={{ background: `linear-gradient(135deg, ${style.scene.floor} 50%, ${style.scene.sofa} 50%)` }} />
                  {t('common.style')}: {l(style.name)}
                </Link>
              )}
            </div>
            <div className="model__canvas">
              <Suspense fallback={<div className="tour__loading mono">{t('common.loading')}</div>}>
                <ModelViewer type={p.type} floors={p.floors} theme={theme} accent={style?.scene?.accent} />
              </Suspense>
            </div>
          </div>
        </div>

        <aside className="prop__aside">
          <div className="card visit">
            <div className="visit__price">
              <span className="eyebrow">{t('property.price')}</span>
              <strong className="serif">{money(p.price)}</strong>
              {p.units > 1 && (
                <span className="muted">
                  {p.units} {t('common.units')}
                </span>
              )}
            </div>
            <VisitForm p={p} />
            <div className="visit__fav">
              <FavButton kind="property" refId={p.slug} />
              <span className="muted">{t('common.favAdd')}</span>
            </div>
          </div>
        </aside>
      </section>

      {related.length > 0 && (
        <section className="container section">
          <h2 className="serif related__title">{t('property.related')}</h2>
          <div className="grid-3">
            {related.map((x, i) => (
              <PropertyCard key={x.slug} p={x} index={i} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function VisitForm({ p }) {
  const { t } = useI18n();
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  const [form, setForm] = useState({ date: tomorrow, time: '10:00', phone: user?.phone || '', message: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (p.status === 'SOLD') return <p className="muted">{t('property.sold')}</p>;

  const submit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast(t('common.loginNeeded'), 'accent');
      return navigate('/acceso', { state: { from: location.pathname } });
    }
    setError('');
    setLoading(true);
    try {
      await api.me.createRequest({ kind: 'VISIT', property: p.slug, ...form });
      toast(t('property.sent'), 'success');
      setForm((f) => ({ ...f, message: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="visit__form" onSubmit={submit}>
      <div>
        <h3 className="serif">{t('property.visit')}</h3>
        <p className="muted">{t('property.visitP')}</p>
      </div>
      <div className="visit__row">
        <div className="field">
          <label htmlFor="vd">{t('property.date')}</label>
          <input id="vd" type="date" className="input" min={tomorrow} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        </div>
        <div className="field">
          <label htmlFor="vt">{t('property.time')}</label>
          <select id="vt" className="select" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}>
            {['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'].map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="vp">{t('property.phone')}</label>
        <input id="vp" className="input" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required={!!user} />
      </div>
      <div className="field">
        <label htmlFor="vm">{t('property.message')}</label>
        <textarea id="vm" className="textarea" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      </div>
      {error && <p className="form-error">{error}</p>}
      <button className="btn btn--primary btn--block" disabled={loading}>
        {loading ? t('common.loading') : user ? t('property.send') : t('nav.signin')}
      </button>
    </form>
  );
}

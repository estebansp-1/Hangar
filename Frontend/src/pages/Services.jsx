import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { gsap, SplitText, useGSAP } from '../lib/gsap';
import { api } from '../services';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../store/auth';
import { toast } from '../store/ui';
import { useI18n, html } from '../i18n';
import { useScrollFx } from '../components/cards';
import { getLenis } from '../components/layout/SmoothScroll';
import { money } from '../lib/format';
import { PROCESS, SERVICES } from '../content/site';
import './pages.css';

export default function Services() {
  const root = useRef(null);
  const { t, l } = useI18n();
  const { data: styles } = useAsync(() => api.styles.list().then((r) => r.styles), []);
  const { hash } = useLocation();
  useScrollFx(root);

  useGSAP(
    () => {
      const split = SplitText.create('.ph__title', { type: 'words', mask: 'words' });
      gsap.from(split.words, { yPercent: 100, stagger: 0.05, duration: 1.1, ease: 'expo.out', delay: 0.35 });
      // cada servicio: la imagen queda fija mientras pasa el texto (sticky + escala)
      gsap.utils.toArray('.svc').forEach((el) => {
        gsap.fromTo(el.querySelector('.svc__media img'), { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
      return () => split.revert();
    },
    { scope: root },
  );

  useEffect(() => {
    if (hash === '#cotizar') {
      const id = setTimeout(() => {
        const el = document.getElementById('cotizar');
        const l2 = getLenis();
        if (el) l2 ? l2.scrollTo(el, { offset: -90 }) : el.scrollIntoView({ behavior: 'smooth' });
      }, 1100);
      return () => clearTimeout(id);
    }
  }, [hash]);

  return (
    <main className="page" ref={root}>
      <div className="container">
        <header className="ph">
          <p className="eyebrow eyebrow--accent">{t('services.k')}</p>
          <h1 className="ph__title serif ph__title--long" dangerouslySetInnerHTML={html(t('services.t'))} />
        </header>

        <div className="svcs">
          {SERVICES.map((s, i) => (
            <article key={s.id} className="svc" id={`svc-${s.id}`}>
              <div className="svc__media" data-expand>
                <img src={s.image} alt="" loading="lazy" />
              </div>
              <div className="svc__body">
                <span className="mono muted">0{i + 1}</span>
                <h2 className="serif">{l(s.title)}</h2>
                <p className="lead">{l(s.text)}</p>
                <ol className="svc__steps">
                  {PROCESS.map((p, j) => (
                    <li key={p.id}>
                      <span className="mono">0{j + 1}</span> {l(p.title)}
                    </li>
                  ))}
                </ol>
              </div>
            </article>
          ))}
        </div>

        <section id="cotizar" className="quote card">
          <div className="quote__intro">
            <p className="eyebrow eyebrow--accent">{t('services.quote')}</p>
            <h2 className="serif">{t('home.cta.t')}</h2>
            <p className="muted">{t('services.quoteP')}</p>
            <img src="/img/plans-2.webp" alt="" loading="lazy" className="quote__img" />
          </div>
          <QuoteForm styles={styles || []} />
        </section>
      </div>
    </main>
  );
}

function QuoteForm({ styles }) {
  const { t, l } = useI18n();
  const user = useAuth((s) => s.user);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    service: params.get('s') || 'interior',
    style: params.get('style') || '',
    area: params.get('area') || '90',
    budget: '',
    city: '',
    phone: user?.phone || '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const estimate = useMemo(() => {
    const s = styles.find((x) => x.slug === form.style);
    const svc = SERVICES.find((x) => x.id === form.service);
    const perM2 = form.service === 'interior' && s ? s.pricePerM2 : svc?.from;
    return perM2 && Number(form.area) > 0 ? perM2 * Number(form.area) : 0;
  }, [form, styles]);

  const submit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast(t('common.loginNeeded'), 'accent');
      return navigate('/acceso', { state: { from: location.pathname + location.search + '#cotizar' } });
    }
    setError('');
    setLoading(true);
    try {
      await api.me.createRequest({
        kind: 'QUOTE',
        service: form.service,
        style: form.style || null,
        area: Number(form.area),
        budget: form.budget ? Number(form.budget) : null,
        city: form.city,
        phone: form.phone,
        message: form.message,
      });
      toast(t('quote.sent'), 'success');
      navigate('/cuenta?tab=req');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="quote__form" onSubmit={submit}>
      <div className="field">
        <span className="label">{t('quote.service')}</span>
        <div className="seg">
          {SERVICES.map((s) => (
            <button type="button" key={s.id} aria-pressed={form.service === s.id} onClick={() => setForm({ ...form, service: s.id })}>
              {l(s.title)}
            </button>
          ))}
        </div>
      </div>
      <div className="form-2">
        <div className="field">
          <label htmlFor="qs">{t('quote.style')}</label>
          <select id="qs" className="select" value={form.style} onChange={set('style')}>
            <option value="">{t('quote.noStyle')}</option>
            {styles.map((s) => (
              <option key={s.slug} value={s.slug}>
                {l(s.name)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="qa">{t('quote.area')}</label>
          <input id="qa" className="input" type="number" min="10" value={form.area} onChange={set('area')} required />
        </div>
        <div className="field">
          <label htmlFor="qc">{t('quote.city')}</label>
          <input id="qc" className="input" value={form.city} onChange={set('city')} required placeholder="Cali" />
        </div>
        <div className="field">
          <label htmlFor="qp">{t('property.phone')}</label>
          <input id="qp" className="input" inputMode="tel" value={form.phone} onChange={set('phone')} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="qb">{t('quote.budget')}</label>
        <input id="qb" className="input" type="number" min="0" step="1000000" value={form.budget} onChange={set('budget')} placeholder="150000000" />
      </div>
      <div className="field">
        <label htmlFor="qm">{t('property.message')}</label>
        <textarea id="qm" className="textarea" rows={3} value={form.message} onChange={set('message')} />
      </div>
      {estimate > 0 && (
        <div className="quote__estimate">
          <span className="eyebrow">{t('style.estimate')}</span>
          <strong className="serif">{money(estimate)}</strong>
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
      <button className="btn btn--primary btn--block" disabled={loading}>
        {loading ? t('common.loading') : user ? t('quote.send') : t('nav.signin')}
      </button>
      {!user && (
        <p className="muted quote__note">
          <Link to="/acceso" state={{ from: '/servicios#cotizar' }}>
            {t('nav.signin')}
          </Link>{' '}
          · {t('common.loginNeeded')}
        </p>
      )}
    </form>
  );
}

import { useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { gsap, SplitText, useGSAP } from '../lib/gsap';
import { api } from '../services';
import { useAsync } from '../hooks/useAsync';
import { useI18n } from '../i18n';
import { PropertyCard } from '../components/cards';
import './pages.css';

const TYPES = ['apartment', 'house', 'penthouse', 'loft', 'building'];

export default function Projects() {
  const [params, setParams] = useSearchParams();
  const { t } = useI18n();
  const root = useRef(null);
  const type = params.get('type') || '';
  const city = params.get('city') || '';
  const sort = params.get('sort') || '';
  const q = params.get('q') || '';

  const { data: meta } = useAsync(() => api.properties.meta(), []);
  const { data, loading } = useAsync(() => api.properties.list({ type, city, sort, q }).then((r) => r.properties), [type, city, sort, q]);

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || next.get(key) === value) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  useGSAP(
    () => {
      const split = SplitText.create('.ph__title', { type: 'chars', mask: 'chars' });
      gsap.from(split.chars, { yPercent: 100, stagger: 0.03, duration: 1.1, ease: 'expo.out', delay: 0.35 });
      return () => split.revert();
    },
    { scope: root },
  );

  return (
    <main className="page" ref={root}>
      <div className="container">
        <header className="ph">
          <p className="eyebrow eyebrow--accent">{t('projects.k')}</p>
          <h1 className="ph__title serif">{t('projects.t')}</h1>
        </header>

        <div className="filters">
          <div className="filters__chips" role="group">
            <button className="chip" aria-pressed={!type} onClick={() => set('type', '')}>
              {t('projects.all')}
            </button>
            {TYPES.filter((x) => !meta || meta.types.includes(x)).map((x) => (
              <button key={x} className="chip" aria-pressed={type === x} onClick={() => set('type', x)}>
                {t(`type.${x}`)}
              </button>
            ))}
          </div>
          <div className="filters__tools">
            <input className="input" placeholder={t('projects.search')} defaultValue={q} onChange={(e) => set('q', e.target.value)} aria-label={t('projects.search')} />
            <select className="select" value={city} onChange={(e) => set('city', e.target.value)} aria-label={t('projects.city')}>
              <option value="">{t('projects.city')}</option>
              {(meta?.cities || []).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select className="select" value={sort} onChange={(e) => set('sort', e.target.value)} aria-label="sort">
              <option value="">{t('projects.sort')}</option>
              <option value="price-asc">{t('projects.sort.priceAsc')}</option>
              <option value="price-desc">{t('projects.sort.priceDesc')}</option>
              <option value="area">{t('projects.sort.area')}</option>
            </select>
          </div>
        </div>

        <p className="count mono">{loading ? t('common.loading') : t('projects.count', { n: data?.length ?? 0 })}</p>

        <div className="grid-3">
          {(data || []).map((p, i) => (
            <PropertyCard key={p.slug} p={p} index={i} />
          ))}
        </div>
        {!loading && data?.length === 0 && (
          <div className="empty">
            <p className="serif">{t('common.empty')}</p>
            <button className="btn btn--ghost" onClick={() => setParams({})}>
              {t('common.clear')}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth, useFavorites } from '../store/auth';
import { toast } from '../store/ui';
import { api } from '../services';
import { useAsync } from '../hooks/useAsync';
import { usePrefs, useI18n } from '../i18n';
import { PropertyCard, StyleCard } from '../components/cards';
import { date, money, REQ_TONE } from '../lib/format';
import './pages.css';
import './account.css';

const TABS = ['fav', 'req', 'profile'];

export default function Account() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'fav';
  const { user } = useAuth();
  const { t } = useI18n();

  return (
    <main className="page">
      <div className="container">
        <header className="acc__head">
          <div className="acc__id">
            <span className="avatar avatar--xl">
              <span>
                {user.name
                  .split(' ')
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()}
              </span>
            </span>
            <div>
              <p className="eyebrow eyebrow--accent">{t('account.k')}</p>
              <h1 className="serif">{t('account.hello', { name: user.name.split(' ')[0] })}</h1>
              <span className="muted">{user.email}</span>
            </div>
          </div>
          <div className="seg acc__tabs" role="tablist">
            {TABS.map((k) => (
              <button key={k} role="tab" aria-pressed={tab === k} aria-selected={tab === k} onClick={() => setParams(k === 'fav' ? {} : { tab: k }, { replace: true })}>
                {t(`account.tab.${k}`)}
              </button>
            ))}
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            {tab === 'fav' && <Favorites />}
            {tab === 'req' && <Requests />}
            {tab === 'profile' && <Profile />}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

function Favorites() {
  const { t } = useI18n();
  const keys = useFavorites((s) => s.keys);
  const { data } = useAsync(() => Promise.all([api.properties.list(), api.styles.list()]).then(([p, s]) => ({ p: p.properties, s: s.styles })), []);
  if (!data) return <p className="muted">{t('common.loading')}</p>;
  const props = data.p.filter((p) => keys.includes(`property:${p.slug}`));
  const styles = data.s.filter((s) => keys.includes(`style:${s.slug}`));
  if (!props.length && !styles.length)
    return (
      <div className="acc__empty card">
        <p className="serif">{t('account.noFav')}</p>
        <div className="row gap-8">
          <Link to="/proyectos" className="btn btn--primary btn--sm">
            {t('nav.projects')}
          </Link>
          <Link to="/estilos" className="btn btn--ghost btn--sm">
            {t('nav.styles')}
          </Link>
        </div>
      </div>
    );
  return (
    <div className="acc__favs">
      {props.length > 0 && (
        <div className="grid-3">
          {props.map((p, i) => (
            <PropertyCard key={p.slug} p={p} index={i} />
          ))}
        </div>
      )}
      {styles.length > 0 && (
        <div className="grid-3">
          {styles.map((s, i) => (
            <StyleCard key={s.slug} s={s} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function Requests() {
  const { t, l } = useI18n();
  const { data, loading, setData } = useAsync(() => Promise.all([api.me.requests(), api.properties.list(), api.styles.list()]).then(([r, p, s]) => ({ r: r.requests, p: p.properties, s: s.styles })), []);
  if (loading || !data) return <p className="muted">{t('common.loading')}</p>;
  if (!data.r.length)
    return (
      <div className="acc__empty card">
        <p className="serif">{t('account.noReq')}</p>
        <Link to="/servicios#cotizar" className="btn btn--primary btn--sm">
          {t('home.cta.b')}
        </Link>
      </div>
    );
  const cancel = async (id) => {
    try {
      const { request } = await api.me.cancelRequest(id);
      setData((d) => ({ ...d, r: d.r.map((x) => (x.id === id ? request : x)) }));
    } catch (e) {
      toast(e.message, 'error');
    }
  };
  return (
    <div className="reqs">
      {data.r.map((r, i) => {
        const prop = data.p.find((p) => p.slug === r.property);
        const style = data.s.find((s) => s.slug === r.style);
        const img = prop?.images[0] || style?.images[0] || '/img/plans-1.webp';
        return (
          <motion.article key={r.id} className="req card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <img src={img} alt="" className="req__img" loading="lazy" />
            <div className="req__body">
              <div className="row gap-8">
                <span className="badge">{r.kind === 'VISIT' ? t('account.visit') : t('account.quote')}</span>
                <span className={`badge badge--${REQ_TONE[r.status]}`}>{t(`req.${r.status}`)}</span>
                <span className="mono muted req__num">#{r.number}</span>
              </div>
              <h3 className="serif">{r.kind === 'VISIT' ? prop?.name || r.property : t(`service.${r.service}`)}</h3>
              <p className="muted">
                {r.kind === 'VISIT'
                  ? `${r.date} · ${r.time}`
                  : [style && l(style.name), `${r.area} m²`, r.city, r.estimate && money(r.estimate)].filter(Boolean).join(' · ')}
              </p>
              <span className="mono muted req__date">{date(r.createdAt)}</span>
            </div>
            {['NEW', 'CONTACTED', 'SCHEDULED'].includes(r.status) && (
              <button className="btn btn--danger btn--sm" onClick={() => cancel(r.id)}>
                {t('account.cancel')}
              </button>
            )}
          </motion.article>
        );
      })}
    </div>
  );
}

function Profile() {
  const { t } = useI18n();
  const { user, setUser, logout } = useAuth();
  const setLang = usePrefs((s) => s.setLang);
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '', lang: user.lang || 'es' });
  const [saving, setSaving] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { user: u } = await api.auth.updateMe(form);
      setUser(u);
      setLang(form.lang);
      toast(t('account.saved'), 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };
  return (
    <form className="card acc__profile" onSubmit={save}>
      <div className="form-2">
        <div className="field">
          <label htmlFor="pn">{t('auth.name')}</label>
          <input id="pn" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <label>{t('auth.email')}</label>
          <input className="input" value={user.email} disabled />
        </div>
        <div className="field">
          <label htmlFor="pp">{t('property.phone')}</label>
          <input id="pp" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="field">
          <span className="label">{t('account.lang')}</span>
          <div className="seg">
            {['es', 'en'].map((l) => (
              <button type="button" key={l} aria-pressed={form.lang === l} onClick={() => setForm({ ...form, lang: l })}>
                {l === 'es' ? 'Español' : 'English'}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="row gap-12 acc__actions">
        <button className="btn btn--primary" disabled={saving}>
          {saving ? t('common.loading') : t('common.save')}
        </button>
        <Link to="/acceso?tab=recover" className="btn btn--ghost">
          {t('auth.recover')}
        </Link>
        <button type="button" className="btn btn--danger" onClick={logout}>
          {t('nav.logout')}
        </button>
      </div>
    </form>
  );
}

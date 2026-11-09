import { Fragment, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, m as motion } from 'motion/react';
import { api } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../store/auth';
import { toast } from '../../store/ui';
import { useI18n } from '../../i18n';
import { LangSwitch, ThemeToggle } from '../../components/layout/Navbar';
import Logo from '../../components/layout/Logo';
import { date, money, num, REQ_TONE, STATUS_TONE } from '../../lib/format';
import './admin.css';

const TYPES = ['apartment', 'house', 'penthouse', 'loft', 'building'];
const STATUS = ['AVAILABLE', 'RESERVED', 'SOLD'];
const REQ_STATUS = ['NEW', 'CONTACTED', 'SCHEDULED', 'CLOSED', 'CANCELLED'];

/* ───────────────────────── Layout ───────────────────────── */
export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = [
    { to: '/admin', label: 'Resumen', end: true, d: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z' },
    { to: '/admin/propiedades', label: 'Propiedades', end: true, d: 'M4 20V9l8-5 8 5v11h-6v-6h-4v6z' },
    { to: '/admin/propiedades/nueva', label: 'Publicar propiedad', d: 'M12 5v14M5 12h14' },
    { to: '/admin/estilos', label: 'Estilos', d: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3' },
    { to: '/admin/solicitudes', label: 'Solicitudes', d: 'M7 4h10v16H7zM10 8h4M10 12h4M10 16h2' },
    { to: '/admin/usuarios', label: 'Usuarios', d: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20c.8-3.4 3.2-5 6-5s5.2 1.6 6 5M16 5a3 3 0 0 1 0 6M18 15c1.6.6 2.6 2.2 3 5' },
  ];
  return (
    <div className="admin">
      <aside className="admin__side">
        <Link to="/" className="logo">
          <Logo size={34} />
        </Link>
        <span className="badge badge--accent">Administración</span>
        <nav className="admin__nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="admin__link">
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="admin-pill" className="admin__pill" transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }} />}
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
                    <path d={l.d} />
                  </svg>
                  <span>{l.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="admin__me">
          <div className="row gap-8">
            <LangSwitch />
            <ThemeToggle />
          </div>
          <strong>{user.name}</strong>
          <span className="muted">{user.email}</span>
          <div className="row gap-8">
            <Link to="/" className="btn btn--ghost btn--sm">
              Ver sitio
            </Link>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => {
                logout();
                navigate('/');
              }}
            >
              Salir
            </button>
          </div>
        </div>
      </aside>
      <main className="admin__main">
        <Outlet />
      </main>
    </div>
  );
}

function Head({ title, kicker, children }) {
  return (
    <header className="admin__head">
      <div>
        <p className="eyebrow eyebrow--accent">{kicker}</p>
        <h1 className="serif">{title}</h1>
      </div>
      <div className="row gap-8">{children}</div>
    </header>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`toggle ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)}>
      <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 32 }} />
    </button>
  );
}

function NumberInput({ value, onSave, prefix, width = 130 }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  const dirty = Number(v) !== value;
  return (
    <form
      className="num-input"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Math.round(Number(v));
        if (n >= 0) onSave(n);
      }}
    >
      {prefix && <span className="muted">{prefix}</span>}
      <input style={{ width }} inputMode="numeric" value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, ''))} />
      {dirty && <button className="btn btn--primary btn--sm">OK</button>}
    </form>
  );
}

/* ───────────────────────── Resumen ───────────────────────── */
export function Dashboard() {
  const { data: s } = useAsync(() => api.admin.stats(), []);
  if (!s) return <Head title="Resumen" kicker="Panel" />;
  const cards = [
    { label: 'Propiedades publicadas', value: s.properties },
    { label: 'Unidades disponibles', value: s.units },
    { label: 'Solicitudes nuevas', value: s.newRequests, accent: true },
    { label: 'Usuarios', value: s.users },
  ];
  return (
    <>
      <Head title="Resumen" kicker="Panel">
        <Link to="/admin/propiedades/nueva" className="btn btn--primary btn--sm">
          + Publicar propiedad
        </Link>
      </Head>
      <div className="stats-cards">
        {cards.map((c, i) => (
          <motion.div key={c.label} className={`card kpi ${c.accent ? 'kpi--accent' : ''}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <span className="eyebrow">{c.label}</span>
            <strong className="serif">{c.value}</strong>
          </motion.div>
        ))}
      </div>
      <div className="admin__cols">
        <section className="card admin__panel">
          <div className="admin__panel-head">
            <h2 className="serif">Solicitudes recientes</h2>
            <Link to="/admin/solicitudes" className="btn btn--ghost btn--sm">
              Ver todas
            </Link>
          </div>
          {s.recentRequests.length === 0 && <p className="muted">Aún no hay solicitudes. Agenda una visita o pide una cotización desde el sitio.</p>}
          <table className="table">
            <tbody>
              {s.recentRequests.map((r) => (
                <tr key={r.id}>
                  <td className="mono">#{r.number}</td>
                  <td>
                    <strong>{r.user?.name}</strong>
                    <div className="muted table__sub">{r.kind === 'VISIT' ? `Visita · ${r.property}` : `Cotización · ${r.service}`}</div>
                  </td>
                  <td className="muted">{date(r.createdAt)}</td>
                  <td>
                    <span className={`badge badge--${REQ_TONE[r.status]}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card admin__panel">
          <h2 className="serif">Más guardados</h2>
          {s.topFavorites.length === 0 && <p className="muted">Todavía nadie guarda favoritos.</p>}
          <ul className="top-favs">
            {s.topFavorites.map((f) => (
              <li key={f.refId}>
                <span>{f.refId}</span>
                <span className="badge badge--accent">♥ {f.count}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

/* ───────────────────────── Propiedades ───────────────────────── */
export function Properties() {
  const { t } = useI18n();
  const { data, setData } = useAsync(() => api.admin.properties().then((r) => r.properties), []);
  const [q, setQ] = useState('');
  const list = (data || []).filter((p) => `${p.name} ${p.city}`.toLowerCase().includes(q.toLowerCase()));

  const patch = async (p, body, msg) => {
    try {
      const { property } = await api.admin.patchProperty(p.id, body);
      setData((l) => l.map((x) => (x.id === p.id ? property : x)));
      if (msg) toast(msg, 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  const remove = async (p) => {
    if (!window.confirm(`¿Eliminar ${p.name}? Si tiene solicitudes se despublicará en su lugar.`)) return;
    try {
      const r = await api.admin.deleteProperty(p.id);
      if (r.archived) {
        setData((l) => l.map((x) => (x.id === p.id ? { ...x, published: false } : x)));
        toast(r.message, 'accent');
      } else {
        setData((l) => l.filter((x) => x.id !== p.id));
        toast('Propiedad eliminada', 'success');
      }
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <Head title="Propiedades" kicker={`${data?.length ?? 0} propiedades`}>
        <input className="input admin__search" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Link to="/admin/propiedades/nueva" className="btn btn--primary btn--sm">
          + Nueva
        </Link>
      </Head>
      {data?.length === 0 && (
        <div className="card empty-admin">
          <p className="serif">Aún no hay propiedades.</p>
          <p className="muted">Publica la primera con sus fotos, precio, unidades y estilo interior.</p>
          <Link to="/admin/propiedades/nueva" className="btn btn--primary btn--sm">
            Publicar propiedad
          </Link>
        </div>
      )}
      <div className="card table-wrap" hidden={data?.length === 0}>
        <table className="table table--wide">
          <thead>
            <tr>
              <th />
              <th>Propiedad</th>
              <th>Precio (COP)</th>
              <th>Unidades</th>
              <th>Estado</th>
              <th>Publicada</th>
              <th>Destacada</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className={!p.published ? 'is-off' : ''}>
                <td>
                  <img src={p.images[0]} alt="" className="thumb" />
                </td>
                <td>
                  <strong>{p.name}</strong>
                  <div className="muted table__sub">
                    {t(`type.${p.type}`)} · {p.city} · {num(p.area)} m²
                  </div>
                </td>
                <td>
                  <NumberInput value={p.price} prefix="$" onSave={(price) => patch(p, { price }, `Precio de ${p.name}: ${money(price)}`)} />
                </td>
                <td>
                  <NumberInput value={p.units} width={56} onSave={(units) => patch(p, { units }, `Unidades de ${p.name}: ${units}`)} />
                </td>
                <td>
                  <select className={`select status-select tone-${STATUS_TONE[p.status]}`} value={p.status} onChange={(e) => patch(p, { status: e.target.value }, `${p.name}: ${t(`status.${e.target.value}`)}`)}>
                    {STATUS.map((s) => (
                      <option key={s} value={s}>
                        {t(`status.${s}`)}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <Toggle label="Publicada" checked={p.published} onChange={(v) => patch(p, { published: v }, v ? 'Publicada' : 'Despublicada')} />
                </td>
                <td>
                  <Toggle label="Destacada" checked={p.featured} onChange={(v) => patch(p, { featured: v })} />
                </td>
                <td className="table__actions">
                  <Link to={`/admin/propiedades/${p.id}`} className="btn btn--ghost btn--sm">
                    Editar
                  </Link>
                  <button className="btn btn--danger btn--sm" onClick={() => remove(p)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ───────────────────────── Editor de propiedad ───────────────────────── */
const EMPTY = {
  name: '', type: 'apartment', city: '', neighborhood: '', price: 0, area: 80, bedrooms: 2, bathrooms: 2, parking: 1, floors: 1, units: 1,
  status: 'AVAILABLE', delivery: '', styleId: '', featured: false, published: true, images: [],
  description: { es: '', en: '' }, features: { es: [], en: [] },
};

export function PropertyEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'nueva';
  const navigate = useNavigate();
  const { t, l } = useI18n();
  const [form, setForm] = useState(isNew ? EMPTY : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { data: styles } = useAsync(() => api.admin.styles().then((r) => r.styles), []);

  useEffect(() => {
    if (isNew) return setForm(EMPTY);
    api.admin.properties().then(({ properties }) => {
      const p = properties.find((x) => x.id === id);
      if (!p) return navigate('/admin/propiedades');
      setForm(JSON.parse(JSON.stringify(p)));
    });
  }, [id, isNew, navigate]);

  if (!form) return <Head title="Cargando…" kicker="Editor" />;
  const up = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const numF = (k) => (e) => up(k, Number(e.target.value.replace(/[^\d.]/g, '')) || 0);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.images.length) return setError('Agrega al menos una foto');
    setSaving(true);
    const body = {
      ...['type', 'name', 'city', 'neighborhood', 'status', 'featured', 'published', 'images', 'description'].reduce((a, k) => ({ ...a, [k]: form[k] }), {}),
      features: { es: form.features.es.filter(Boolean), en: form.features.en.filter(Boolean) },
      ...['price', 'area', 'bedrooms', 'bathrooms', 'parking', 'floors', 'units'].reduce((a, k) => ({ ...a, [k]: Number(form[k]) || 0 }), {}),
      delivery: form.delivery || null,
      styleId: form.styleId || null,
      ...(form.slug ? { slug: form.slug } : {}),
    };
    try {
      if (isNew) await api.admin.createProperty(body);
      else await api.admin.updateProperty(id, body);
      toast(isNew ? `${form.name} publicada` : 'Cambios guardados', 'success');
      navigate('/admin/propiedades');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save}>
      <Head title={isNew ? 'Publicar propiedad' : form.name} kicker={isNew ? 'Nueva propiedad' : 'Editar propiedad'}>
        <Link to="/admin/propiedades" className="btn btn--ghost btn--sm">
          Cancelar
        </Link>
        <button className="btn btn--primary btn--sm" disabled={saving}>
          {saving ? 'Guardando…' : isNew ? 'Publicar' : 'Guardar cambios'}
        </button>
      </Head>
      {error && <p className="form-error editor__error">{error}</p>}
      <div className="editor">
        <div className="card editor__col">
          <h2 className="serif">Datos</h2>
          <div className="editor__grid">
            <div className="field span-2">
              <label htmlFor="en">Nombre</label>
              <input id="en" className="input" value={form.name} onChange={(e) => up('name', e.target.value)} required placeholder="Torre Olivo" />
            </div>
            <div className="field">
              <label htmlFor="et">Tipo</label>
              <select id="et" className="select" value={form.type} onChange={(e) => up('type', e.target.value)}>
                {TYPES.map((x) => (
                  <option key={x} value={x}>
                    {t(`type.${x}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="es">Estado</label>
              <select id="es" className="select" value={form.status} onChange={(e) => up('status', e.target.value)}>
                {STATUS.map((x) => (
                  <option key={x} value={x}>
                    {t(`status.${x}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="ec">Ciudad</label>
              <input id="ec" className="input" value={form.city} onChange={(e) => up('city', e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="eb">Barrio / sector</label>
              <input id="eb" className="input" value={form.neighborhood} onChange={(e) => up('neighborhood', e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="ep">Precio (COP)</label>
              <input id="ep" className="input" inputMode="numeric" value={form.price} onChange={numF('price')} required />
            </div>
            <div className="field">
              <label htmlFor="ea">Área (m²)</label>
              <input id="ea" className="input" inputMode="decimal" value={form.area} onChange={numF('area')} required />
            </div>
            {[
              ['bedrooms', 'Habitaciones'],
              ['bathrooms', 'Baños'],
              ['parking', 'Parqueaderos'],
              ['floors', 'Pisos'],
              ['units', 'Unidades disponibles'],
            ].map(([k, label]) => (
              <div className="field" key={k}>
                <label htmlFor={`f-${k}`}>{label}</label>
                <input id={`f-${k}`} className="input" inputMode="numeric" value={form[k]} onChange={numF(k)} />
              </div>
            ))}
            <div className="field">
              <label htmlFor="ed">Entrega</label>
              <input id="ed" className="input" type="month" value={form.delivery || ''} onChange={(e) => up('delivery', e.target.value)} />
            </div>
            <div className="field span-2">
              <label htmlFor="est">Estilo interior</label>
              <select id="est" className="select" value={form.styleId || ''} onChange={(e) => up('styleId', e.target.value)}>
                <option value="">Sin estilo</option>
                {(styles || []).map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {l(s.name)}
                  </option>
                ))}
              </select>
            </div>
            <label className="editor__check">
              <Toggle checked={form.published} onChange={(v) => up('published', v)} label="Publicada" /> Publicada
            </label>
            <label className="editor__check">
              <Toggle checked={form.featured} onChange={(v) => up('featured', v)} label="Destacada" /> Destacada en inicio
            </label>
          </div>
        </div>

        <div className="editor__col">
          <div className="card editor__col">
            <h2 className="serif">Fotos</h2>
            <Photos images={form.images} onChange={(images) => up('images', images)} />
          </div>
          <div className="card editor__col">
            <h2 className="serif">Textos</h2>
            {['es', 'en'].map((lng) => (
              <Fragment key={lng}>
                <div className="field">
                  <label htmlFor={`d-${lng}`}>Descripción ({lng.toUpperCase()})</label>
                  <textarea id={`d-${lng}`} className="textarea" rows={4} value={form.description[lng]} onChange={(e) => up('description', { ...form.description, [lng]: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor={`ft-${lng}`}>Lo que incluye ({lng.toUpperCase()}) · una por línea</label>
                  <textarea id={`ft-${lng}`} className="textarea" rows={4} value={form.features[lng].join('\n')} onChange={(e) => up('features', { ...form.features, [lng]: e.target.value.split('\n') })} />
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}

function Photos({ images, onChange }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');
  const upload = async (files) => {
    const list = [...(files || [])].filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    setBusy(true);
    try {
      const urls = [];
      for (const f of list) urls.push((await api.admin.uploadImage(f)).url);
      onChange([...images, ...urls]);
      toast(`${urls.length} foto(s) subida(s)`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const move = (i, d) => {
    const next = [...images];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div className="photos">
      <div className="photos__grid">
        <AnimatePresence initial={false}>
          {images.map((src, i) => (
            <motion.figure key={src} layout className="photos__item" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <img src={src} alt="" />
              {i === 0 && <span className="badge badge--accent photos__cover">Portada</span>}
              <div className="photos__tools">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Mover antes">
                  ←
                </button>
                <button type="button" disabled={i === images.length - 1} onClick={() => move(i, 1)} aria-label="Mover después">
                  →
                </button>
                <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))} aria-label="Quitar">
                  ×
                </button>
              </div>
            </motion.figure>
          ))}
        </AnimatePresence>
        <label
          className="photos__drop"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            upload(e.dataTransfer.files);
          }}
        >
          <input type="file" accept="image/png,image/webp,image/jpeg" multiple hidden onChange={(e) => upload(e.target.files)} disabled={busy} />
          <span className="serif">{busy ? 'Subiendo…' : '+ Fotos'}</span>
          <span className="muted">Arrastra o haz clic</span>
        </label>
      </div>
      <div className="row gap-8">
        <input className="input" placeholder="…o pega la URL de una imagen" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => {
            if (url.trim()) onChange([...images, url.trim()]);
            setUrl('');
          }}
        >
          Agregar
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── Estilos ───────────────────────── */
export function StylesAdmin() {
  const { l } = useI18n();
  const { data, setData } = useAsync(() => api.admin.styles().then((r) => r.styles), []);
  const removeStyle = async (s) => {
    if (!window.confirm(`¿Eliminar el estilo ${l(s.name)}? Si está en uso se despublicará.`)) return;
    try {
      const r = await api.admin.deleteStyle(s.id);
      if (r.archived) {
        setData((list) => list.map((x) => (x.id === s.id ? { ...x, published: false } : x)));
        toast(r.message, 'accent');
      } else {
        setData((list) => list.filter((x) => x.id !== s.id));
        toast('Estilo eliminado', 'success');
      }
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  const patch = async (s, body, msg) => {
    try {
      const { style } = await api.admin.patchStyle(s.id, body);
      setData((list) => list.map((x) => (x.id === s.id ? style : x)));
      if (msg) toast(msg, 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  return (
    <>
      <Head title="Estilos" kicker="Diseño de interiores · precio por m²">
        <Link to="/admin/estilos/nuevo" className="btn btn--primary btn--sm">
          + Nuevo estilo
        </Link>
      </Head>
      {data?.length === 0 && (
        <div className="card empty-admin">
          <p className="serif">Aún no hay estilos.</p>
          <p className="muted">Crea el primero: nombre, paleta, colores para el recorrido 3D, fotos y precio por m².</p>
          <Link to="/admin/estilos/nuevo" className="btn btn--primary btn--sm">
            Crear estilo
          </Link>
        </div>
      )}
      <div className="style-admin">
        {(data || []).map((s) => (
          <article key={s.id} className={`card sa ${!s.published ? 'is-off' : ''}`}>
            <img src={s.images[0]} alt="" />
            <div className="sa__body">
              <div className="row gap-8 sa__top">
                <h3 className="serif">{l(s.name)}</h3>
                <Toggle label="Publicado" checked={s.published} onChange={(v) => patch(s, { published: v }, v ? 'Publicado' : 'Despublicado')} />
              </div>
              <div className="palette">
                {s.palette.map((c) => (
                  <span key={c} style={{ background: c }} />
                ))}
              </div>
              <span className="label">Precio por m²</span>
              <NumberInput value={s.pricePerM2} prefix="$" onSave={(pricePerM2) => patch(s, { pricePerM2 }, `${l(s.name)}: ${money(pricePerM2)} / m²`)} />
              <div className="row gap-8">
                <Link to={`/admin/estilos/${s.id}`} className="btn btn--ghost btn--sm">
                  Editar
                </Link>
                <button className="btn btn--danger btn--sm" onClick={() => removeStyle(s)}>
                  Eliminar
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

/* ───────────────────────── Editor de estilo ───────────────────────── */
const SCENE_LABELS = {
  floor: 'Piso',
  wall: 'Muros',
  sofa: 'Sofá / tapizados',
  accent: 'Acento',
  wood: 'Madera / muebles',
  metal: 'Metal / lámparas',
  rug: 'Tapetes / textiles',
  stone: 'Piedra / mesones',
  plant: 'Plantas',
};
const EMPTY_STYLE = {
  name: { es: '', en: '' },
  tagline: { es: '', en: '' },
  description: { es: '', en: '' },
  materials: { es: [], en: [] },
  palette: ['#F2EEE6', '#D9CDBA', '#B7A68A', '#84CC16', '#1E293B'],
  scene: { floor: '#D8C3A0', wall: '#F3EFE8', sofa: '#C9C4B8', accent: '#84CC16', wood: '#C9A97C', metal: '#2F2F2C', rug: '#E3DACB', stone: '#EDEAE4', plant: '#5E7A4A' },
  images: [],
  pricePerM2: 1500000,
  published: true,
};

export function StyleEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'nuevo';
  const navigate = useNavigate();
  const [form, setForm] = useState(isNew ? EMPTY_STYLE : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) return setForm(EMPTY_STYLE);
    api.admin.styles().then(({ styles }) => {
      const st = styles.find((x) => x.id === id);
      if (!st) return navigate('/admin/estilos');
      setForm(JSON.parse(JSON.stringify(st)));
    });
  }, [id, isNew, navigate]);

  if (!form) return <Head title="Cargando…" kicker="Editor" />;
  const up = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const upL = (k, lng, v) => setForm((f) => ({ ...f, [k]: { ...f[k], [lng]: v } }));

  const save = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.images.length) return setError('Agrega al menos una foto');
    setSaving(true);
    const body = {
      name: form.name,
      tagline: form.tagline,
      description: form.description,
      materials: { es: form.materials.es.filter(Boolean), en: form.materials.en.filter(Boolean) },
      palette: form.palette,
      scene: form.scene,
      images: form.images,
      pricePerM2: Number(form.pricePerM2) || 0,
      published: form.published,
      ...(form.slug ? { slug: form.slug } : {}),
    };
    try {
      if (isNew) await api.admin.createStyle(body);
      else await api.admin.updateStyle(id, body);
      toast(isNew ? 'Estilo creado' : 'Cambios guardados', 'success');
      navigate('/admin/estilos');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save}>
      <Head title={isNew ? 'Nuevo estilo' : form.name.es} kicker={isNew ? 'Diseño de interiores' : 'Editar estilo'}>
        <Link to="/admin/estilos" className="btn btn--ghost btn--sm">
          Cancelar
        </Link>
        <button className="btn btn--primary btn--sm" disabled={saving}>
          {saving ? 'Guardando…' : isNew ? 'Crear estilo' : 'Guardar cambios'}
        </button>
      </Head>
      {error && <p className="form-error editor__error">{error}</p>}
      <div className="editor">
        <div className="card editor__col">
          <h2 className="serif">Textos</h2>
          {['es', 'en'].map((lng) => (
            <div key={lng} className="editor__grid">
              <div className="field">
                <label htmlFor={`sn-${lng}`}>Nombre ({lng.toUpperCase()})</label>
                <input id={`sn-${lng}`} className="input" value={form.name[lng]} onChange={(e) => upL('name', lng, e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor={`st-${lng}`}>Frase corta ({lng.toUpperCase()})</label>
                <input id={`st-${lng}`} className="input" value={form.tagline[lng]} onChange={(e) => upL('tagline', lng, e.target.value)} />
              </div>
              <div className="field span-2">
                <label htmlFor={`sd-${lng}`}>Descripción ({lng.toUpperCase()})</label>
                <textarea id={`sd-${lng}`} className="textarea" rows={3} value={form.description[lng]} onChange={(e) => upL('description', lng, e.target.value)} />
              </div>
              <div className="field span-2">
                <label htmlFor={`sm-${lng}`}>Materiales ({lng.toUpperCase()}) · uno por línea</label>
                <textarea id={`sm-${lng}`} className="textarea" rows={3} value={form.materials[lng].join('\n')} onChange={(e) => upL('materials', lng, e.target.value.split('\n'))} />
              </div>
            </div>
          ))}
          <div className="editor__grid">
            <div className="field">
              <label htmlFor="spm">Precio por m² (COP)</label>
              <input id="spm" className="input" inputMode="numeric" value={form.pricePerM2} onChange={(e) => up('pricePerM2', Number(e.target.value.replace(/\D/g, '')) || 0)} required />
            </div>
            <label className="editor__check">
              <Toggle checked={form.published} onChange={(v) => up('published', v)} label="Publicado" /> Publicado
            </label>
          </div>
        </div>
        <div className="editor__col">
          <div className="card editor__col">
            <h2 className="serif">Paleta</h2>
            <div className="swatches">
              {form.palette.map((c, i) => (
                <label key={i} className="swatch">
                  <input type="color" value={c} onChange={(e) => up('palette', form.palette.map((x, j) => (j === i ? e.target.value.toUpperCase() : x)))} />
                  <span className="mono">{c}</span>
                  {form.palette.length > 1 && (
                    <button type="button" onClick={() => up('palette', form.palette.filter((_, j) => j !== i))} aria-label="Quitar color">
                      ×
                    </button>
                  )}
                </label>
              ))}
              {form.palette.length < 8 && (
                <button type="button" className="swatch swatch--add" onClick={() => up('palette', [...form.palette, '#CCCCCC'])}>
                  + Color
                </button>
              )}
            </div>
          </div>
          <div className="card editor__col">
            <h2 className="serif">Colores del recorrido 3D</h2>
            <p className="muted">Así se pinta el apartamento de la página «Planos 3D» cuando el visitante elige este estilo.</p>
            <div className="scene-colors">
              {Object.keys(SCENE_LABELS).map((k) => (
                <label key={k} className="swatch">
                  <input type="color" value={form.scene[k]} onChange={(e) => up('scene', { ...form.scene, [k]: e.target.value.toUpperCase() })} />
                  <span>
                    {SCENE_LABELS[k]}
                    <small className="mono">{form.scene[k]}</small>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="card editor__col">
            <h2 className="serif">Fotos</h2>
            <Photos images={form.images} onChange={(images) => up('images', images)} />
          </div>
        </div>
      </div>
    </form>
  );
}

/* ───────────────────────── Solicitudes ───────────────────────── */
export function Requests() {
  const { t } = useI18n();
  const [status, setStatus] = useState('');
  const [kind, setKind] = useState('');
  const [open, setOpen] = useState(null);
  const { data, loading, setData } = useAsync(() => api.admin.requests({ status, kind }).then((r) => r.requests), [status, kind]);
  const change = async (r, s) => {
    try {
      const { request } = await api.admin.setRequestStatus(r.id, s);
      setData((l) => l.map((x) => (x.id === r.id ? request : x)));
      toast(`Solicitud #${r.number}: ${t(`req.${s}`)}`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  return (
    <>
      <Head title="Solicitudes" kicker={`${data?.length ?? 0} solicitudes`}>
        <select className="select admin__search" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">Visitas y cotizaciones</option>
          <option value="VISIT">Solo visitas</option>
          <option value="QUOTE">Solo cotizaciones</option>
        </select>
        <select className="select admin__search" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {REQ_STATUS.map((s) => (
            <option key={s} value={s}>
              {t(`req.${s}`)}
            </option>
          ))}
        </select>
      </Head>
      {!loading && data?.length === 0 && <p className="muted">No hay solicitudes con estos filtros.</p>}
      <div className="card table-wrap">
        <table className="table">
          <tbody>
            {data?.map((r) => (
              <Fragment key={r.id}>
                <tr>
                  <td>
                    <button className="mono" onClick={() => setOpen(open === r.id ? null : r.id)}>
                      #{r.number} {open === r.id ? '▲' : '▼'}
                    </button>
                  </td>
                  <td>
                    <span className="badge">{r.kind === 'VISIT' ? 'Visita' : 'Cotización'}</span>
                  </td>
                  <td>
                    <strong>{r.user?.name}</strong>
                    <div className="muted table__sub">{r.user?.email}</div>
                  </td>
                  <td>{r.kind === 'VISIT' ? `${r.property} · ${r.date} ${r.time}` : `${t(`service.${r.service}`)} · ${r.area} m²`}</td>
                  <td className="muted">{date(r.createdAt)}</td>
                  <td>
                    <select className={`select status-select tone-${REQ_TONE[r.status]}`} value={r.status} onChange={(e) => change(r, e.target.value)}>
                      {REQ_STATUS.map((s) => (
                        <option key={s} value={s}>
                          {t(`req.${s}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
                {open === r.id && (
                  <tr className="detail-row">
                    <td colSpan={6}>
                      <div className="req-detail">
                        <span>Tel: {r.phone}</span>
                        {r.city && <span>Ciudad: {r.city}</span>}
                        {r.style && <span>Estilo: {r.style}</span>}
                        {r.estimate && <span>Estimado: {money(r.estimate)}</span>}
                        {r.budget && <span>Presupuesto: {money(r.budget)}</span>}
                        {r.message && <p className="muted">“{r.message}”</p>}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ───────────────────────── Usuarios ───────────────────────── */
export function Users() {
  const me = useAuth((s) => s.user);
  const { data, setData } = useAsync(() => api.admin.users().then((r) => r.users), []);
  const toggle = async (u) => {
    try {
      const role = u.role === 'ADMIN' ? 'USER' : 'ADMIN';
      await api.admin.setUserRole(u.id, role);
      setData((l) => l.map((x) => (x.id === u.id ? { ...x, role } : x)));
      toast(`${u.name} ahora es ${role === 'ADMIN' ? 'administrador' : 'cliente'}`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  return (
    <>
      <Head title="Usuarios" kicker={`${data?.length ?? 0} cuentas`} />
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Solicitudes</th>
              <th>Favoritos</th>
              <th>Registro</th>
              <th>Rol</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.name}</strong>
                </td>
                <td className="muted">{u.email}</td>
                <td>{u.requests}</td>
                <td>{u.favorites}</td>
                <td className="muted">{date(u.createdAt)}</td>
                <td>
                  <button className={`badge ${u.role === 'ADMIN' ? 'badge--accent' : ''}`} onClick={() => toggle(u)} disabled={u.id === me.id} title={u.id === me.id ? 'No puedes cambiar tu propio rol' : 'Cambiar rol'}>
                    {u.role === 'ADMIN' ? 'Admin' : 'Cliente'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

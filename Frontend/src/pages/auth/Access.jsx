import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, m as motion } from 'motion/react';
import { useAuth } from '../../store/auth';
import { toast } from '../../store/ui';
import { api } from '../../services';
import { ArrowLeft } from 'lucide-react';
import Logo from '../../components/layout/Logo';
import { LangSwitch, ThemeToggle } from '../../components/layout/Navbar';
import { useI18n } from '../../i18n';
import './access.css';

const SLIDES = [
  { src: '/img/house-dusk.webp', es: 'Vivienda unifamiliar · luz de tarde', en: 'Single-family home · evening light' },
  { src: '/img/japandi-1.webp', es: 'Interiorismo japandi · roble y lino', en: 'Japandi interiors · oak and linen' },
  { src: '/img/build-glass.webp', es: 'Torre residencial · palmas y cielo de Cali', en: 'Residential tower · palms and Cali sky' },
  { src: '/img/living-tropical.webp', es: 'Sala tropical · madera y jardín', en: 'Tropical living room · timber and garden' },
];
const TABS = ['signin', 'signup'];

export function Access() {
  const [params, setParams] = useSearchParams();
  const tab = ['signin', 'signup', 'recover'].includes(params.get('tab')) ? params.get('tab') : 'signin';
  const setTab = (t) => setParams(t === 'signin' ? {} : { tab: t }, { replace: true });
  const { t, l } = useI18n();
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % SLIDES.length), 6500);
    return () => clearInterval(id);
  }, []);

  const heading = { signin: t('auth.welcome'), signup: t('auth.join'), recover: t('auth.recover') }[tab];

  return (
    <main className="access">
      <section className="access__form">
        <header className="access__top">
          <Link to="/" aria-label="HANGAR">
            <Logo size={34} />
          </Link>
          <Link to="/" className="access__home">
            <ArrowLeft size={15} strokeWidth={1.6} /> {t('auth.toSite')}
          </Link>
        </header>

        <div className="access__body">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            <span className="eyebrow">{t('auth.area')}</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.h1 key={heading} className="serif access__title" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
                {heading}
                <i>.</i>
              </motion.h1>
            </AnimatePresence>
            <p className="access__lead">{t('auth.side')}</p>
          </motion.div>

          {tab !== 'recover' ? (
            <div className="atabs" role="tablist">
              {TABS.map((k) => (
                <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
                  {t(k === 'signin' ? 'auth.signin' : 'auth.signup')}
                  {tab === k && <motion.span layoutId="atab-line" className="atabs__line" transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }} />}
                </button>
              ))}
            </div>
          ) : (
            <button className="access__back" onClick={() => setTab('signin')}>
              <ArrowLeft size={14} strokeWidth={1.6} /> {t('auth.back')}
            </button>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
              {tab === 'signin' && <SignIn onForgot={() => setTab('recover')} />}
              {tab === 'signup' && <SignUp />}
              {tab === 'recover' && <Recover />}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="access__foot">
          <LangSwitch />
          <ThemeToggle />
          <span className="mono">© {new Date().getFullYear()} Hangar Studio</span>
        </footer>
      </section>

      <aside className="access__visual" aria-hidden="true">
        <AnimatePresence initial={false}>
          <motion.img
            key={SLIDES[i].src}
            src={SLIDES[i].src}
            alt=""
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 1.4 }, scale: { duration: 8, ease: 'linear' } }}
          />
        </AnimatePresence>
        <div className="access__grid" />
        <div className="access__caption">
          <span className="access__count mono">
            {String(i + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={i} className="serif" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }}>
              {l(SLIDES[i])}
            </motion.p>
          </AnimatePresence>
          <div className="access__bars">
            {SLIDES.map((s, k) => (
              <span key={s.src} className={k === i ? 'on' : ''} />
            ))}
          </div>
        </div>
      </aside>
    </main>
  );
}

function useAfterAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  return (user) => navigate(location.state?.from || (user.role === 'ADMIN' ? '/admin' : '/cuenta'), { replace: true });
}

function Field({ label, id, ...props }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="input" {...props} />
    </div>
  );
}

function Password({ label, id, ...props }) {
  const [show, setShow] = useState(false);
  const { t } = useI18n();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="pw">
        <input id={id} className="input" type={show ? 'text' : 'password'} {...props} />
        <button type="button" onClick={() => setShow((v) => !v)}>
          {show ? t('auth.hide') : t('auth.show')}
        </button>
      </div>
    </div>
  );
}

function Strength({ value }) {
  let s = 0;
  if (value.length >= 8) s++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) s++;
  if (/\d/.test(value)) s++;
  if (/[^A-Za-z0-9]/.test(value)) s++;
  return (
    <div className="strength" aria-label={`${s}/4`}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={i < s ? `on s${s}` : ''} />
      ))}
    </div>
  );
}

function SignIn({ onForgot }) {
  const { t } = useI18n();
  const login = useAuth((s) => s.login);
  const after = useAfterAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form);
      toast(t('auth.hello', { name: user.name.split(' ')[0] }), 'success');
      after(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <form className="aform" onSubmit={submit}>
      <Field id="em" label={t('auth.email')} type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      <Password id="pw" label={t('auth.password')} autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
      <button type="button" className="aform__link" onClick={onForgot}>
        {t('auth.forgot')}
      </button>
      {error && <p className="form-error">{error}</p>}
      <button className="btn btn--primary btn--block" disabled={loading}>
        {loading ? t('common.loading') : t('auth.signin')} <span className="arrow">→</span>
      </button>
    </form>
  );
}

function SignUp() {
  const { t } = useI18n();
  const register = useAuth((s) => s.register);
  const after = useAfterAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError(t('auth.mismatch'));
    setLoading(true);
    try {
      const user = await register({ name: form.name, email: form.email, password: form.password });
      toast(t('auth.created'), 'success');
      after(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <form className="aform" onSubmit={submit}>
      <Field id="nm" label={t('auth.name')} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <Field id="em2" label={t('auth.email')} type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      <Password id="pw2" label={t('auth.password')} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
      <Strength value={form.password} />
      <Password id="pw3" label={t('auth.confirm')} autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
      <p className="aform__hint">{t('auth.hint')}</p>
      {error && <p className="form-error">{error}</p>}
      <button className="btn btn--primary btn--block" disabled={loading}>
        {loading ? t('common.loading') : t('auth.signup')} <span className="arrow">→</span>
      </button>
    </form>
  );
}

/* Recuperación: correo → código de 6 dígitos → nueva contraseña */
function Recover() {
  const { t } = useI18n();
  const setSession = useAuth((s) => s.setSession);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [pw, setPw] = useState({ a: '', b: '' });
  const [devCode, setDevCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cooldown) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const run = async (fn) => {
    setError('');
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const send = (e) => {
    e?.preventDefault();
    run(async () => {
      const r = await api.auth.forgotPassword({ email });
      setDevCode(r.devCode || '');
      setCode('');
      setCooldown(45);
      setStep(1);
    });
  };

  return (
    <div className="aform">
      <div className="steps" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={i <= step ? 'on' : ''} />
        ))}
      </div>
      {step === 0 && (
        <form className="aform" onSubmit={send}>
          <p className="muted">{t('auth.rec.1')}</p>
          <Field id="re" label={t('auth.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn--primary btn--block" disabled={loading || !email}>
            {loading ? t('common.loading') : t('auth.rec.send')}
          </button>
        </form>
      )}
      {step === 1 && (
        <form
          className="aform"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const r = await api.auth.verifyCode({ email, code });
              setToken(r.resetToken);
              setStep(2);
            });
          }}
        >
          <p className="muted">
            {t('auth.rec.2')} <strong>{email}</strong>
          </p>
          {devCode && (
            <p className="devcode mono">
              {t('auth.rec.devcode')}: <strong>{devCode}</strong>
            </p>
          )}
          <CodeInput value={code} onChange={setCode} />
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn--primary btn--block" disabled={loading || code.length !== 6}>
            {loading ? t('common.loading') : t('auth.rec.validate')}
          </button>
          <button type="button" className="aform__link" disabled={cooldown > 0 || loading} onClick={() => send()}>
            {cooldown > 0 ? t('auth.rec.resendIn', { s: cooldown }) : t('auth.rec.resend')}
          </button>
        </form>
      )}
      {step === 2 && (
        <form
          className="aform"
          onSubmit={(e) => {
            e.preventDefault();
            if (pw.a !== pw.b) return setError(t('auth.mismatch'));
            run(async () => {
              const r = await api.auth.resetPassword({ resetToken: token, password: pw.a });
              if (r.token) setSession({ token: r.token, user: r.user });
              toast(t('auth.rec.done'), 'success');
              navigate('/cuenta');
            });
          }}
        >
          <p className="muted">{t('auth.rec.3')}</p>
          <Password id="np" label={t('auth.rec.new')} autoComplete="new-password" value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} required />
          <Strength value={pw.a} />
          <Password id="nc" label={t('auth.confirm')} autoComplete="new-password" value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} required />
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn--primary btn--block" disabled={loading}>
            {loading ? t('common.loading') : t('auth.rec.save')}
          </button>
        </form>
      )}
      <Link to="/" className="sr-only">
        Inicio
      </Link>
    </div>
  );
}

/** Un solo input real (pegar, autocompletar one-time-code) sobre 6 casillas visuales */
function CodeInput({ value, onChange }) {
  const [focused, setFocused] = useState(false);
  const ref = useRef(null);
  return (
    <div className="code" onClick={() => ref.current?.focus()}>
      <input
        ref={ref}
        className="code__input"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={value}
        aria-label="Código de verificación"
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus
      />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={`code__cell ${value[i] ? 'is-filled' : ''} ${focused && i === Math.min(value.length, 5) ? 'is-active' : ''}`} aria-hidden="true">
          {value[i] || ''}
        </div>
      ))}
    </div>
  );
}

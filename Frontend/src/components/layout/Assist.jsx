import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, Check, Sparkles, UserRound, X } from 'lucide-react';
import { api } from '../../services';
import { useAuth } from '../../store/auth';
import { useI18n } from '../../i18n';
import { CONTACT } from '../../content/site';
import { LogoMark } from './Logo';
import './assist.css';

/*
 * Atención: botón de WhatsApp + asistente con respuestas automáticas.
 * Si el asistente no resuelve, el visitante deja sus datos y el estudio recibe
 * un aviso por correo (y por WhatsApp si está configurado en el backend).
 */

const T = {
  es: {
    title: 'Asistente HANGAR',
    status: 'Responde al instante',
    hello: '¡Hola! Soy el asistente de HANGAR. ¿En qué te ayudo?',
    chips: ['¿Qué servicios ofrecen?', '¿Cómo cotizo mi proyecto?', 'Quiero agendar una visita', '¿Dónde están ubicados?'],
    placeholder: 'Escribe tu pregunta…',
    human: 'Hablar con una persona',
    name: 'Tu nombre',
    contact: 'WhatsApp o correo',
    message: '¿En qué te ayudamos?',
    send: 'Enviar',
    sending: 'Enviando…',
    back: 'Volver al chat',
    done: 'Listo. Le avisamos al equipo y te contactaremos muy pronto.',
    error: 'No pudimos enviar tu mensaje. Escríbenos por WhatsApp.',
    offline: 'No tengo conexión con el servidor ahora. Escríbenos por WhatsApp y te respondemos.',
    wa: 'Escríbenos por WhatsApp',
    waText: 'Hola HANGAR, quiero información sobre un proyecto.',
    open: 'Abrir asistente',
    close: 'Cerrar asistente',
  },
  en: {
    title: 'HANGAR assistant',
    status: 'Replies instantly',
    hello: "Hi! I'm the HANGAR assistant. How can I help?",
    chips: ['What services do you offer?', 'How do I get a quote?', 'I want to book a visit', 'Where are you located?'],
    placeholder: 'Type your question…',
    human: 'Talk to a person',
    name: 'Your name',
    contact: 'WhatsApp or email',
    message: 'How can we help?',
    send: 'Send',
    sending: 'Sending…',
    back: 'Back to chat',
    done: "Done. We've notified the team and will contact you very soon.",
    error: "We couldn't send your message. Message us on WhatsApp.",
    offline: "I can't reach the server right now. Message us on WhatsApp and we'll reply.",
    wa: 'Message us on WhatsApp',
    waText: "Hi HANGAR, I'd like information about a project.",
    open: 'Open assistant',
    close: 'Close assistant',
  },
};

function WhatsAppIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3Zm0 23.4c-2.1 0-4.1-.6-5.9-1.6l-.4-.2-3.8 1.2 1.2-3.7-.3-.4c-1.1-1.7-1.7-3.8-1.7-5.9C5.1 9.9 10 5.1 16 5.1s10.9 4.8 10.9 10.7S22 26.4 16 26.4Zm6-8c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.7s1.2 3.1 1.4 3.4c.2.2 2.3 3.5 5.6 4.9.8.3 1.4.5 1.9.7.8.2 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4Z"
      />
    </svg>
  );
}

export default function Assist() {
  const { pathname } = useLocation();
  const { lang } = useI18n();
  const user = useAuth((s) => s.user);
  const t = T[lang === 'en' ? 'en' : 'es'];
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [offerHuman, setOfferHuman] = useState(false);
  const [view, setView] = useState('chat'); // chat | form | done
  const [form, setForm] = useState({ name: '', contact: '', message: '' });
  const [formError, setFormError] = useState('');
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, busy, offerHuman]);
  useEffect(() => {
    if (!open) return;
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);

  if (pathname.startsWith('/admin')) return null;
  const wa = `${CONTACT.whatsapp}?text=${encodeURIComponent(t.waText)}`;

  const ask = async (text) => {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...msgs, { role: 'user', content: q }];
    setMsgs(next);
    setInput('');
    setBusy(true);
    setOfferHuman(false);
    try {
      const r = await api.assist.chat({ lang, messages: next.slice(-12) });
      setMsgs((m) => [...m, { role: 'assistant', content: r.reply }]);
      setOfferHuman(Boolean(r.suggestHuman));
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', content: t.offline }]);
      setOfferHuman(true);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const toHuman = () => {
    const lastUser = [...msgs].reverse().find((m) => m.role === 'user')?.content || '';
    setForm({ name: user?.name || form.name, contact: user?.email || form.contact, message: form.message || lastUser });
    setFormError('');
    setView('form');
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    setBusy(true);
    try {
      await api.assist.handoff({ ...form, transcript: msgs.slice(-12) });
      setView('done');
    } catch (err) {
      setFormError(err.message || t.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={`assist ${open ? 'is-open' : ''}`}>
        <a className="assist__fab assist__fab--wa" href={wa} target="_blank" rel="noreferrer" aria-label={t.wa} title={t.wa}>
          <WhatsAppIcon />
        </a>
        <button className="assist__fab assist__fab--ai" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="assist-panel" aria-label={open ? t.close : t.open} title={open ? t.close : t.title}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={open ? 'x' : 's'} initial={{ rotate: -45, opacity: 0, scale: 0.6 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 45, opacity: 0, scale: 0.6 }} transition={{ duration: 0.18 }} style={{ display: 'grid' }}>
              {open ? <X size={22} strokeWidth={1.8} /> : <Sparkles size={22} strokeWidth={1.8} />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.section
            id="assist-panel"
            className="assist__panel"
            role="dialog"
            aria-label={t.title}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            data-lenis-prevent
          >
            <header className="assist__head">
              <span className="assist__avatar">
                <LogoMark size={26} />
              </span>
              <div>
                <strong>{t.title}</strong>
                <span className="assist__status">
                  <i /> {t.status}
                </span>
              </div>
              <button className="assist__close" onClick={() => setOpen(false)} aria-label={t.close}>
                <X size={18} />
              </button>
            </header>

            {view === 'chat' && (
              <>
                <div className="assist__list" ref={listRef} aria-live="polite">
                  <p className="assist__msg assist__msg--bot">{t.hello}</p>
                  {msgs.length === 0 && (
                    <div className="assist__chips">
                      {t.chips.map((c) => (
                        <button key={c} onClick={() => ask(c)}>
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                  {msgs.map((m, i) => (
                    <p key={i} className={`assist__msg ${m.role === 'user' ? 'assist__msg--me' : 'assist__msg--bot'}`}>
                      {m.content}
                    </p>
                  ))}
                  {busy && (
                    <p className="assist__msg assist__msg--bot assist__typing" aria-label="…">
                      <i />
                      <i />
                      <i />
                    </p>
                  )}
                  {offerHuman && !busy && (
                    <button className="assist__human" onClick={toHuman}>
                      <UserRound size={15} /> {t.human}
                    </button>
                  )}
                </div>
                <form
                  className="assist__input"
                  onSubmit={(e) => {
                    e.preventDefault();
                    ask(input);
                  }}
                >
                  <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.placeholder} maxLength={600} aria-label={t.placeholder} />
                  <button type="submit" disabled={!input.trim() || busy} aria-label={t.send}>
                    <ArrowUp size={18} strokeWidth={2} />
                  </button>
                </form>
                {msgs.length > 0 && !offerHuman && (
                  <button className="assist__link" onClick={toHuman}>
                    {t.human}
                  </button>
                )}
              </>
            )}

            {view === 'form' && (
              <form className="assist__form" onSubmit={submit}>
                <label>
                  {t.name}
                  <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} autoComplete="name" />
                </label>
                <label>
                  {t.contact}
                  <input className="input" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} required minLength={5} autoComplete="email" />
                </label>
                <label>
                  {t.message}
                  <textarea className="textarea" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required minLength={3} maxLength={800} />
                </label>
                {formError && <p className="form-error">{formError}</p>}
                <button className="btn btn--primary btn--block" disabled={busy}>
                  {busy ? t.sending : t.send}
                </button>
                <button type="button" className="assist__link" onClick={() => setView('chat')}>
                  {t.back}
                </button>
              </form>
            )}

            {view === 'done' && (
              <div className="assist__done">
                <span className="assist__check">
                  <Check size={22} />
                </span>
                <p>{t.done}</p>
                <a className="btn btn--ghost btn--sm" href={wa} target="_blank" rel="noreferrer">
                  <WhatsAppIcon size={16} /> WhatsApp
                </a>
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}

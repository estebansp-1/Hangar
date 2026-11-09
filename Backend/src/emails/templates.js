import { env } from '../config/env.js';

/*
 * Plantillas de correo HANGAR — Arquitectura · Interiores · Inmobiliaria.
 * - Ancho completo (tablas al 100 %), contenido en una columna fluida.
 * - Estilos inline + tablas para Gmail, Outlook y Apple Mail.
 * - Identidad de la web: arena y verde oliva, titulares con serif.
 * - Bilingües: español / inglés según el idioma del usuario.
 */

const C = {
  bg: '#F4EFE6',
  paper: '#FBF8F2',
  line: '#E2DACB',
  text: '#1F1E1A',
  muted: '#6E6A5F',
  olive: '#4F5B32',
  oliveSoft: '#E4E6D4',
  dark: '#12130F',
};

const SERIF = "'Instrument Serif', Georgia, 'Times New Roman', serif";
const SANS = "'Manrope', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace";

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const first = (name = '') => esc(name.split(' ')[0]);

export const money = (n, lang = 'es') =>
  new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const T = {
  es: {
    brand: 'Arquitectura · Interiores · Inmobiliaria',
    projects: 'Proyectos',
    styles: 'Estilos',
    account: 'Mi cuenta',
    footer: 'Recibes este correo porque tienes una cuenta en HANGAR. Es un mensaje automático, por favor no respondas a esta dirección.',
  },
  en: {
    brand: 'Architecture · Interiors · Real estate',
    projects: 'Projects',
    styles: 'Styles',
    account: 'My account',
    footer: 'You are receiving this email because you have a HANGAR account. This is an automated message, please do not reply.',
  },
};

const button = (href, label) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 8px;">
    <tr><td style="border-radius:999px;background:${C.olive};">
      <a href="${href}" target="_blank" style="display:inline-block;padding:16px 32px;font-family:${SANS};font-size:14px;font-weight:700;letter-spacing:.04em;color:#F4EFE6;text-decoration:none;border-radius:999px;">${esc(label)} &rarr;</a>
    </td></tr>
  </table>`;

function layout({ lang = 'es', preheader, eyebrow, title, body, note }) {
  const t = T[lang] || T.es;
  const year = new Date().getFullYear();
  const plain = title.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${esc(plain)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
  <style>
    body{margin:0;padding:0;background:${C.bg};}
    a{color:${C.olive};}
    @media (max-width:620px){ .px{padding-left:22px!important;padding-right:22px!important;} .h1{font-size:40px!important;line-height:42px!important;} .code{width:44px!important;height:58px!important;line-height:58px!important;font-size:28px!important;} }
  </style>
</head>
<body style="margin:0;padding:0;background:${C.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:${C.bg};">
    <tr><td class="px" style="padding:30px 56px;border-bottom:1px solid ${C.line};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="font-family:${SERIF};font-size:30px;color:${C.text};letter-spacing:.02em;">Hangar<span style="color:${C.olive};">.</span></td>
        <td align="right" style="font-family:${MONO};font-size:11px;letter-spacing:.18em;color:${C.muted};text-transform:uppercase;">${t.brand}</td>
      </tr></table>
    </td></tr>

    <tr><td class="px" style="padding:64px 56px 20px;">
      <div style="font-family:${MONO};font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:${C.olive};margin-bottom:18px;">${esc(eyebrow)}</div>
      <h1 class="h1" style="margin:0;font-family:${SERIF};font-weight:400;font-size:60px;line-height:60px;letter-spacing:-.01em;color:${C.text};">${title}</h1>
    </td></tr>

    <tr><td class="px" style="padding:12px 56px 56px;font-family:${SANS};font-size:16px;line-height:27px;color:${C.muted};">
      ${body}
    </td></tr>

    ${note ? `<tr><td class="px" style="padding:24px 56px;background:${C.paper};border-top:1px solid ${C.line};border-bottom:1px solid ${C.line};font-family:${SANS};font-size:13px;line-height:21px;color:${C.muted};">${note}</td></tr>` : ''}

    <tr><td class="px" style="padding:36px 56px 48px;background:${C.dark};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="font-family:${SANS};font-size:12px;line-height:20px;color:#A39E90;">
          <a href="${env.clientUrl}/proyectos" style="color:#EDE7DB;text-decoration:none;font-weight:700;">${t.projects}</a> &nbsp;·&nbsp;
          <a href="${env.clientUrl}/estilos" style="color:#EDE7DB;text-decoration:none;font-weight:700;">${t.styles}</a> &nbsp;·&nbsp;
          <a href="${env.clientUrl}/cuenta" style="color:#EDE7DB;text-decoration:none;font-weight:700;">${t.account}</a><br><br>
          © ${year} HANGAR. ${t.footer}
        </td>
      </tr></table>
    </td></tr>
  </table>
</body>
</html>`;
}

const pick = (lang, es, en) => (lang === 'en' ? en : es);

export function welcomeEmail({ name, lang = 'es' }) {
  return {
    subject: pick(lang, 'Bienvenido a HANGAR', 'Welcome to HANGAR'),
    html: layout({
      lang,
      preheader: pick(lang, 'Tu cuenta está lista: guarda proyectos y agenda visitas.', 'Your account is ready: save projects and book visits.'),
      eyebrow: pick(lang, 'Cuenta creada', 'Account created'),
      title: pick(lang, `Hola, ${first(name)}.<br><i style="color:${C.olive};">Empecemos a diseñar.</i>`, `Hi, ${first(name)}.<br><i style="color:${C.olive};">Let's start designing.</i>`),
      body: pick(
        lang,
        `<p style="margin:0 0 16px;">Ya puedes guardar propiedades y estilos en favoritos, agendar visitas y pedir cotizaciones de diseño o construcción.</p><p style="margin:0;">Cuando quieras, recorre nuestros proyectos en 3D.</p>${button(`${env.clientUrl}/proyectos`, 'Ver proyectos')}`,
        `<p style="margin:0 0 16px;">You can now save properties and styles, book visits and request design or construction quotes.</p><p style="margin:0;">Whenever you like, walk through our projects in 3D.</p>${button(`${env.clientUrl}/proyectos`, 'See projects')}`,
      ),
    }),
    text: pick(lang, `Hola ${name}, tu cuenta en HANGAR está lista.`, `Hi ${name}, your HANGAR account is ready.`),
  };
}

export function resetCodeEmail({ name, code, minutes, lang = 'es' }) {
  const digits = code
    .split('')
    .map(
      (d) =>
        `<td style="padding:0 4px;"><div class="code" style="width:54px;height:70px;line-height:70px;text-align:center;background:${C.paper};border:1px solid ${C.line};border-radius:14px;font-family:${MONO};font-size:34px;font-weight:500;color:${C.olive};">${d}</div></td>`,
    )
    .join('');
  return {
    subject: pick(lang, `${code} es tu código de verificación`, `${code} is your verification code`),
    html: layout({
      lang,
      preheader: pick(lang, `Tu código es ${code}. Vence en ${minutes} minutos.`, `Your code is ${code}. It expires in ${minutes} minutes.`),
      eyebrow: pick(lang, 'Recuperar contraseña', 'Password recovery'),
      title: pick(lang, `Tu código de<br><i style="color:${C.olive};">verificación</i>`, `Your verification<br><i style="color:${C.olive};">code</i>`),
      body: `
        <p style="margin:0 0 28px;">${pick(lang, `Hola ${first(name)}, recibimos una solicitud para restablecer tu contraseña. Ingresa este código en la página de acceso:`, `Hi ${first(name)}, we received a request to reset your password. Enter this code on the sign-in page:`)}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;"><tr>${digits}</tr></table>
        <p style="margin:0;">${pick(lang, `Vence en <strong style="color:${C.text};">${minutes} minutos</strong> y solo se puede usar una vez.`, `It expires in <strong style="color:${C.text};">${minutes} minutes</strong> and can only be used once.`)}</p>
        ${button(`${env.clientUrl}/acceso?tab=recover`, pick(lang, 'Ir a recuperar contraseña', 'Recover my password'))}`,
      note: pick(
        lang,
        `<strong style="color:${C.text};">¿No fuiste tú?</strong> Ignora este correo: tu contraseña no cambiará. Nunca compartas este código.`,
        `<strong style="color:${C.text};">Wasn't you?</strong> Ignore this email: your password won't change. Never share this code.`,
      ),
    }),
    text: pick(lang, `Tu código de HANGAR es ${code}. Vence en ${minutes} minutos.`, `Your HANGAR code is ${code}. It expires in ${minutes} minutes.`),
  };
}

export function passwordChangedEmail({ name, when, ip, lang = 'es' }) {
  const row = (k, v, last) =>
    `<tr><td style="padding:16px 22px;${last ? '' : `border-bottom:1px solid ${C.line};`}font-family:${MONO};font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:${C.muted};">${k}</td><td align="right" style="padding:16px 22px;${last ? '' : `border-bottom:1px solid ${C.line};`}color:${C.text};">${esc(v)}</td></tr>`;
  return {
    subject: pick(lang, 'Tu contraseña de HANGAR fue actualizada', 'Your HANGAR password was updated'),
    html: layout({
      lang,
      preheader: pick(lang, 'Confirmamos el cambio de contraseña de tu cuenta.', 'We confirm your password was changed.'),
      eyebrow: pick(lang, 'Seguridad de la cuenta', 'Account security'),
      title: pick(lang, `Contraseña<br><i style="color:${C.olive};">actualizada</i>`, `Password<br><i style="color:${C.olive};">updated</i>`),
      body: `
        <p style="margin:0 0 24px;">${pick(lang, `Hola ${first(name)}, la contraseña de tu cuenta se cambió correctamente.`, `Hi ${first(name)}, your account password was changed successfully.`)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${C.line};border-radius:16px;background:${C.paper};">
          ${row(pick(lang, 'Fecha', 'Date'), when)}${row(pick(lang, 'Origen', 'Origin'), ip || '—', true)}
        </table>
        ${button(`${env.clientUrl}/acceso`, pick(lang, 'Iniciar sesión', 'Sign in'))}`,
      note: pick(
        lang,
        `<strong style="color:${C.text};">¿No reconoces este cambio?</strong> Restablece tu contraseña de inmediato desde <a href="${env.clientUrl}/acceso?tab=recover">${env.clientUrl}/acceso</a>.`,
        `<strong style="color:${C.text};">Don't recognise this change?</strong> Reset your password right away at <a href="${env.clientUrl}/acceso?tab=recover">${env.clientUrl}/acceso</a>.`,
      ),
    }),
    text: pick(lang, `Hola ${name}, tu contraseña se cambió el ${when}.`, `Hi ${name}, your password was changed on ${when}.`),
  };
}

const SERVICE = { interior: { es: 'Diseño de interiores', en: 'Interior design' }, house: { es: 'Casa a la medida', en: 'Custom house' }, building: { es: 'Edificio', en: 'Building' } };

export function requestReceivedEmail({ name, request: r, lang = 'es' }) {
  const isVisit = r.kind === 'VISIT';
  const rows = [
    isVisit ? [pick(lang, 'Propiedad', 'Property'), r.property] : [pick(lang, 'Servicio', 'Service'), SERVICE[r.service]?.[lang] || r.service],
    isVisit ? [pick(lang, 'Fecha', 'Date'), `${r.date} · ${r.time}`] : [pick(lang, 'Área', 'Area'), `${r.area} m²`],
    !isVisit && r.style ? [pick(lang, 'Estilo', 'Style'), r.style] : null,
    !isVisit && r.estimate ? [pick(lang, 'Estimado', 'Estimate'), money(r.estimate, lang)] : null,
    !isVisit ? [pick(lang, 'Ciudad', 'City'), r.city] : null,
  ].filter(Boolean);
  const table = rows
    .map(
      ([k, v], i) =>
        `<tr><td style="padding:14px 20px;${i < rows.length - 1 ? `border-bottom:1px solid ${C.line};` : ''}font-family:${MONO};font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:${C.muted};">${k}</td><td align="right" style="padding:14px 20px;${i < rows.length - 1 ? `border-bottom:1px solid ${C.line};` : ''}color:${C.text};font-weight:600;">${esc(v)}</td></tr>`,
    )
    .join('');
  return {
    subject: isVisit ? pick(lang, `Visita solicitada · #${r.number}`, `Visit requested · #${r.number}`) : pick(lang, `Cotización recibida · #${r.number}`, `Quote received · #${r.number}`),
    html: layout({
      lang,
      preheader: pick(lang, 'Un asesor te contactará en menos de 24 horas.', 'An advisor will contact you within 24 hours.'),
      eyebrow: pick(lang, `Solicitud #${r.number}`, `Request #${r.number}`),
      title: isVisit
        ? pick(lang, `¡Gracias, ${first(name)}!<br><i style="color:${C.olive};">Te esperamos.</i>`, `Thank you, ${first(name)}!<br><i style="color:${C.olive};">See you soon.</i>`)
        : pick(lang, `¡Gracias, ${first(name)}!<br><i style="color:${C.olive};">Diseñemos juntos.</i>`, `Thank you, ${first(name)}!<br><i style="color:${C.olive};">Let's design together.</i>`),
      body: `
        <p style="margin:0 0 24px;">${pick(lang, 'Recibimos tu solicitud. Un asesor te contactará en menos de 24 horas para confirmar los detalles.', 'We received your request. An advisor will contact you within 24 hours to confirm the details.')}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${C.line};border-radius:16px;background:${C.paper};">${table}</table>
        ${button(`${env.clientUrl}/cuenta`, pick(lang, 'Ver mis solicitudes', 'See my requests'))}`,
    }),
    text: pick(lang, `Recibimos tu solicitud #${r.number}.`, `We received your request #${r.number}.`),
  };
}

/** Aviso interno: un visitante pidió hablar con una persona desde el asistente */
export function supportHandoffEmail({ name, contact, message, transcript = [] }) {
  const rows = transcript
    .slice(-10)
    .map((m) => `<p style="margin:0 0 8px;"><strong style="color:${m.role === 'user' ? C.text : C.olive};">${m.role === 'user' ? 'Cliente' : 'Asistente'}:</strong> ${esc(m.content)}</p>`)
    .join('');
  return {
    subject: `HANGAR · ${name} necesita ayuda`,
    html: layout({
      lang: 'es',
      preheader: `${name} (${contact}) escribió desde el asistente de la página.`,
      eyebrow: 'Asistente de la página',
      title: `${esc(name)}<br><i style="color:${C.olive};">quiere hablar contigo.</i>`,
      body: `<p style="margin:0 0 6px;"><strong style="color:${C.text};">Contacto:</strong> ${esc(contact)}</p>
        <p style="margin:0 0 20px;"><strong style="color:${C.text};">Mensaje:</strong> ${esc(message)}</p>
        ${rows ? `<div style="padding:18px 20px;border:1px solid ${C.line};border-radius:14px;background:${C.paper};font-size:14px;line-height:22px;">${rows}</div>` : ''}`,
    }),
    text: `${name} (${contact}) pide ayuda desde la página: ${message}`,
  };
}

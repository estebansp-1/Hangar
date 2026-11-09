import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporterPromise;

/**
 * Crea el transporte SMTP. Si no hay SMTP_HOST configurado usa una cuenta
 * temporal de Ethereal (https://ethereal.email) y muestra en consola el enlace
 * para previsualizar cada correo enviado.
 */
async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      if (env.smtp.host) {
        return nodemailer.createTransport({
          host: env.smtp.host,
          port: env.smtp.port,
          secure: env.smtp.secure,
          auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
        });
      }
      const test = await nodemailer.createTestAccount();
      console.log('✉️  SMTP no configurado: usando Ethereal (correos de prueba).');
      return nodemailer.createTransport({ host: 'smtp.ethereal.email', port: 587, auth: { user: test.user, pass: test.pass } });
    })();
  }
  return transporterPromise;
}

/** "Nombre <correo>" → { name, email } */
const parseFrom = (from) => {
  const m = from.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].trim(), email: m[2].trim() } : { email: from.trim() };
};

/** Envío por la API HTTP de Brevo (puerto 443): funciona aunque el host bloquee SMTP */
async function sendWithBrevo({ to, subject, html, text }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.brevoKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: parseFrom(env.mailFrom), to: [{ email: to }], subject, htmlContent: html, textContent: text }),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function sendMail({ to, subject, html, text }) {
  try {
    if (env.brevoKey) return await sendWithBrevo({ to, subject, html, text });
    const transporter = await getTransporter();
    const info = await transporter.sendMail({ from: env.mailFrom, to, subject, html, text });
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.log(`✉️  [${subject}] → ${to}\n   Vista previa: ${preview}`);
    return info;
  } catch (err) {
    // El envío de correo nunca debe tumbar la petición principal
    console.error('Error enviando correo:', err.message);
    return null;
  }
}

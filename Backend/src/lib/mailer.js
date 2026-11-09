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

export async function sendMail({ to, subject, html, text }) {
  try {
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

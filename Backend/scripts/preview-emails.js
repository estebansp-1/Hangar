// Genera las plantillas en /email-previews (español e inglés) para revisarlas en el navegador
import fs from 'node:fs';
import path from 'node:path';
import { welcomeEmail, resetCodeEmail, passwordChangedEmail, requestReceivedEmail } from '../src/emails/templates.js';

const out = path.resolve('email-previews');
fs.mkdirSync(out, { recursive: true });
const visit = { kind: 'VISIT', number: 1042, property: 'torre-olivo', date: '2026-11-20', time: '10:00' };
const quote = { kind: 'QUOTE', number: 1043, service: 'interior', style: 'nordico', area: 108, estimate: 156600000, city: 'Medellín' };

for (const lang of ['es', 'en']) {
  const files = {
    bienvenida: welcomeEmail({ name: 'Juan Esteban', lang }),
    'codigo-recuperacion': resetCodeEmail({ name: 'Juan Esteban', code: '482913', minutes: 15, lang }),
    'contrasena-actualizada': passwordChangedEmail({ name: 'Juan Esteban', when: new Date().toLocaleString(lang === 'en' ? 'en-US' : 'es-CO'), ip: '181.49.xx.xx', lang }),
    'visita-solicitada': requestReceivedEmail({ name: 'Juan Esteban', request: visit, lang }),
    'cotizacion-recibida': requestReceivedEmail({ name: 'Juan Esteban', request: quote, lang }),
  };
  for (const [name, mail] of Object.entries(files)) fs.writeFileSync(path.join(out, `${name}.${lang}.html`), mail.html);
}
console.log('Plantillas generadas en', out);

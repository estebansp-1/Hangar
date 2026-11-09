import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { asyncHandler } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { sendMail } from '../lib/mailer.js';
import { supportHandoffEmail } from '../emails/templates.js';
import { env } from '../config/env.js';

/*
 * Asistente de la página (botón flotante).
 *  - Con ANTHROPIC_API_KEY: responde Claude con la información real del estudio (sin inventar precios).
 *  - Sin clave: responde con preguntas frecuentes por palabras clave (gratis).
 *  - "Hablar con una persona": avisa al estudio por correo (Brevo) y, si está configurado, por WhatsApp (CallMeBot).
 */

const router = Router();
const chatLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false });
const handoffLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });

const SITE = () => ({
  email: env.supportEmail,
  phone: env.supportPhoneLabel,
  url: env.clientUrl.split(',')[0],
});

/* ───────── Preguntas frecuentes (modo sin IA) ───────── */
const FAQ = [
  {
    k: /^(hola|buenas|buenos|hey|hi|hello)\b/,
    es: '¡Hola! Soy el asistente de HANGAR. Pregúntame por servicios, cotizaciones, visitas o estilos.',
    en: "Hi! I'm the HANGAR assistant. Ask me about services, quotes, visits or styles.",
  },
  {
    k: /precio|cu[aá]nto|cuesta|valor|cotiz|presupuesto|price|cost|quote|budget/,
    es: 'Cada proyecto se cotiza según el área, el estilo y el lote. En Servicios → "Cotizar" dejas los datos y te enviamos un estimado en 24 horas.',
    en: 'Every project is quoted by area, style and lot. In Services → "Quote" leave your details and we send an estimate within 24 hours.',
  },
  {
    k: /visita|agendar|cita|conocer|ver el|visit|book|appointment/,
    es: 'Para agendar una visita entra al proyecto que te interesa y usa "Agendar visita". Necesitas una cuenta (es gratis).',
    en: 'To book a visit open the project you like and use "Book a visit". You need a free account.',
  },
  {
    k: /tiempo|demora|cu[aá]nto tarda|plazo|entrega|how long|timeline|deliver/,
    es: 'Depende del proyecto: un interiorismo toma semanas y una casa varios meses. Te damos un cronograma con la cotización.',
    en: 'It depends on the project: interiors take weeks and a house several months. You get a schedule with the quote.',
  },
  {
    k: /cuenta|registr|contrase|clave|login|ingresar|password|account|sign/,
    es: 'Puedes crear tu cuenta en "Acceder". Si olvidaste la contraseña, usa "¿Olvidaste tu contraseña?" y te llega un código a tu correo.',
    en: 'Create an account from "Sign in". If you forgot your password, use "Forgot password?" and we email you a code.',
  },
  {
    k: /contact|whatsapp|tel[eé]fono|llamar|correo|email|phone|call/,
    es: () => `Puedes escribirnos al WhatsApp ${SITE().phone} o al correo ${SITE().email}.`,
    en: () => `Message us on WhatsApp ${SITE().phone} or email ${SITE().email}.`,
  },
  {
    k: /d[oó]nde|ubica|ciudad|cali|direcci|where|location|city/,
    es: 'Estamos en Cali, Colombia, y trabajamos en Cali y el Valle del Cauca.',
    en: 'We are based in Cali, Colombia, and work across Cali and the Valle del Cauca.',
  },
  {
    k: /estilo|japandi|n[oó]rdic|minimal|industrial|mediterr|paleta|color|style|palette/,
    es: 'En la página Estilos tienes paletas de color, los materiales con que construimos y las estructuras en 3D.',
    en: 'The Styles page shows colour palettes, the materials we build with and the structures in 3D.',
  },
  {
    k: /qu[eé] (hacen|ofrecen)|servicio|dise[nñ]o de interior|interiorismo|construyen|casas a la medida|edificios|services|what do you do/,
    es: 'Hacemos tres cosas: diseño de interiores por estilo, casas a la medida (del lote a la entrega) y edificios residenciales. Puedes verlos en la sección Servicios.',
    en: 'We do three things: interior design by style, custom homes (from lot to keys) and residential buildings. See the Services section.',
  },
];
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function faqAnswer(text, lang) {
  const t = norm(text);
  const hit = FAQ.find((f) => f.k.test(t) || f.k.test(text.toLowerCase()));
  if (!hit) {
    return {
      reply: lang === 'en' ? "I don't have that answer. Want a person from our team to contact you?" : 'No tengo esa respuesta. ¿Quieres que una persona del equipo te contacte?',
      suggestHuman: true,
    };
  }
  const a = hit[lang] ?? hit.es;
  return { reply: typeof a === 'function' ? a() : a, suggestHuman: false };
}

/* ───────── Claude (modo IA, opcional) ───────── */
const claude = env.anthropicKey ? new Anthropic({ apiKey: env.anthropicKey }) : null;
const HUMAN_TAG = '[HUMANO]';
const systemPrompt = () => `Eres el asistente de la página web de HANGAR, un estudio de arquitectura, diseño de interiores e inmobiliaria en Cali, Colombia.
Responde en el idioma del visitante, con calidez y en máximo 3 frases cortas. Sin markdown ni listas.

Lo que sabes del estudio (no inventes nada fuera de esto):
- Servicios: diseño de interiores por estilo, casas a la medida (del lote a la entrega: arquitectura, licencias, estructura y obra) y edificios residenciales.
- Proceso: Plantear, Diseñar, Construir, Habitar.
- Cotizaciones: en la página Servicios, botón "Cotizar"; se responde con un estimado en 24 horas. Nunca des precios ni cifras.
- Visitas: desde la página de cada proyecto, "Agendar visita"; requiere cuenta gratuita.
- Página Estilos: paletas de color, materiales de construcción y estructuras en 3D (casa, apartamentos, edificio, finca).
- Planos 3D: recorrido por un apartamento modelo.
- Contacto: WhatsApp ${SITE().phone}, correo ${SITE().email}. Sitio: ${SITE().url}
- Ubicación: Cali y el Valle del Cauca.

Si la pregunta no se puede resolver con esta información, si piden algo personalizado (precios, fechas, negociaciones) o si el visitante quiere hablar con alguien, responde brevemente y termina tu respuesta con la marca ${HUMAN_TAG} para que la página le ofrezca contactar a una persona.`;

async function claudeAnswer(messages, lang) {
  const response = await claude.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 2000,
    // respuestas de chat cortas: esfuerzo bajo (más rápido y económico)
    output_config: { effort: 'low' },
    // si el modelo declina por sus filtros de seguridad, la API reintenta con otro modelo
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: systemPrompt(),
    messages,
  });
  if (response.stop_reason === 'refusal') return faqAnswer(messages.at(-1).content, lang);
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  if (!text) return faqAnswer(messages.at(-1).content, lang);
  const suggestHuman = text.includes(HUMAN_TAG);
  return { reply: text.replace(HUMAN_TAG, '').trim(), suggestHuman };
}

const chatSchema = z.object({
  lang: z.enum(['es', 'en']).default('es'),
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(1000) }))
    .min(1)
    .max(20),
});

router.post(
  '/chat',
  chatLimiter,
  validate(chatSchema),
  asyncHandler(async (req, res) => {
    const { lang } = req.body;
    // la conversación debe empezar con el visitante y terminar con su último mensaje
    let messages = req.body.messages.slice(-12);
    while (messages.length && messages[0].role !== 'user') messages = messages.slice(1);
    const last = messages.at(-1);
    if (!last || last.role !== 'user') return res.json({ reply: '', suggestHuman: false, source: 'faq' });
    if (claude) {
      try {
        return res.json({ ...(await claudeAnswer(messages, lang)), source: 'ai' });
      } catch (err) {
        if (err instanceof Anthropic.RateLimitError) console.error('Asistente IA: límite de peticiones');
        else if (err instanceof Anthropic.AuthenticationError) console.error('Asistente IA: ANTHROPIC_API_KEY inválida');
        else if (err instanceof Anthropic.APIError) console.error(`Asistente IA: error ${err.status}`, err.message);
        else console.error('Asistente IA:', err.message);
      }
    }
    res.json({ ...faqAnswer(last.content, lang), source: 'faq' });
  }),
);

/* ───────── Pasar a una persona ───────── */
const handoffSchema = z.object({
  name: z.string().trim().min(2).max(80),
  contact: z.string().trim().min(5, 'Escribe tu WhatsApp o tu correo').max(120),
  message: z.string().trim().min(3).max(800),
  transcript: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(1000) }))
    .max(20)
    .optional()
    .default([]),
});

async function notifyWhatsApp(text) {
  if (!env.callmebotKey || !env.supportPhone) return;
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(env.supportPhone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(env.callmebotKey)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`CallMeBot ${r.status}`);
}

router.post(
  '/handoff',
  handoffLimiter,
  validate(handoffSchema),
  asyncHandler(async (req, res) => {
    const { name, contact, message, transcript } = req.body;
    const mail = supportHandoffEmail({ name, contact, message, transcript });
    await sendMail({ to: env.supportEmail, ...mail });
    try {
      await notifyWhatsApp(`HANGAR · ${name} (${contact}) pide ayuda desde la página: ${message}`.slice(0, 900));
    } catch (err) {
      console.error('Aviso por WhatsApp:', err.message);
    }
    res.status(201).json({ ok: true });
  }),
);

export default router;

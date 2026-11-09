import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { asyncHandler, badRequest, conflict, unauthorized } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { publicUser, requireAuth, signToken } from '../middleware/auth.js';
import { sendMail } from '../lib/mailer.js';
import { passwordChangedEmail, resetCodeEmail, welcomeEmail } from '../emails/templates.js';

const router = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false });
const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

const password = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(/[A-Za-z]/, 'La contraseña debe incluir letras')
  .regex(/\d/, 'La contraseña debe incluir al menos un número');
const email = z.string().trim().toLowerCase().email('Correo inválido');

const lang = z.enum(['es', 'en']).optional().default('es');
const registerSchema = z.object({ name: z.string().trim().min(2, 'Ingresa tu nombre'), email, password, lang });
const loginSchema = z.object({ email, password: z.string().min(1, 'Ingresa tu contraseña') });
const forgotSchema = z.object({ email });
const verifySchema = z.object({ email, code: z.string().regex(/^\d{6}$/, 'El código tiene 6 dígitos') });
const resetSchema = z.object({ resetToken: z.string().min(10), password });

const hashCode = (code) => crypto.createHash('sha256').update(`${code}:${env.jwtSecret}`).digest('hex');

// POST /api/auth/register
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password, lang } = req.body;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw conflict('Ya existe una cuenta con ese correo');
    const user = await prisma.user.create({ data: { name, email, lang, passwordHash: await bcrypt.hash(password, 10) } });
    sendMail({ to: email, ...welcomeEmail({ name, lang }) });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  }),
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw unauthorized('Correo o contraseña incorrectos');
    res.json({ token: signToken(user), user: publicUser(user) });
  }),
);

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

// PATCH /api/auth/me  (nombre / teléfono)
router.patch(
  '/me',
  requireAuth,
  validate(z.object({ name: z.string().trim().min(2).optional(), phone: z.string().trim().max(30).optional(), lang: z.enum(['es', 'en']).optional() })),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({ where: { id: req.user.id }, data: req.body });
    res.json({ user: publicUser(user) });
  }),
);

/*
 * Recuperación de contraseña en 3 pasos:
 *  1. POST /forgot-password  { email }          → envía un código de 6 dígitos al correo
 *  2. POST /verify-code      { email, code }    → valida el código y devuelve un resetToken (JWT de 10 min)
 *  3. POST /reset-password   { resetToken, password } → cambia la contraseña y envía correo de confirmación
 */
router.post(
  '/forgot-password',
  resetLimiter,
  validate(forgotSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    // Respuesta idéntica exista o no el correo, para no revelar cuentas registradas
    const response = { message: 'Si el correo está registrado, te enviamos un código de verificación.' };
    if (!user) return res.json(response);

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    await prisma.$transaction([
      prisma.passwordReset.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
      prisma.passwordReset.create({
        data: { userId: user.id, codeHash: hashCode(code), expiresAt: new Date(Date.now() + env.resetTtlMinutes * 60_000) },
      }),
    ]);
    await sendMail({ to: user.email, ...resetCodeEmail({ name: user.name, code, minutes: env.resetTtlMinutes, lang: user.lang }) });
    if (!env.isProd) response.devCode = code; // solo en desarrollo, para pruebas
    res.json(response);
  }),
);

router.post(
  '/verify-code',
  resetLimiter,
  validate(verifySchema),
  asyncHandler(async (req, res) => {
    const { email, code } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw badRequest('Código inválido o expirado');

    const reset = await prisma.passwordReset.findFirst({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!reset) throw badRequest('Código inválido o expirado. Solicita uno nuevo.');
    if (reset.attempts >= env.resetMaxAttempts) throw badRequest('Demasiados intentos. Solicita un código nuevo.');

    const ok = crypto.timingSafeEqual(Buffer.from(reset.codeHash), Buffer.from(hashCode(code)));
    if (!ok) {
      await prisma.passwordReset.update({ where: { id: reset.id }, data: { attempts: { increment: 1 } } });
      const left = env.resetMaxAttempts - reset.attempts - 1;
      throw badRequest(left > 0 ? `Código incorrecto. Te quedan ${left} intentos.` : 'Demasiados intentos. Solicita un código nuevo.');
    }

    await prisma.passwordReset.update({ where: { id: reset.id }, data: { verifiedAt: new Date() } });
    const resetToken = jwt.sign({ sub: user.id, rid: reset.id, typ: 'reset' }, env.jwtSecret, { expiresIn: '10m' });
    res.json({ resetToken });
  }),
);

router.post(
  '/reset-password',
  resetLimiter,
  validate(resetSchema),
  asyncHandler(async (req, res) => {
    let payload;
    try {
      payload = jwt.verify(req.body.resetToken, env.jwtSecret);
    } catch {
      throw badRequest('El enlace de recuperación expiró. Vuelve a empezar.');
    }
    if (payload.typ !== 'reset') throw badRequest('Token inválido');

    const reset = await prisma.passwordReset.findUnique({ where: { id: payload.rid } });
    if (!reset || reset.usedAt || !reset.verifiedAt || reset.userId !== payload.sub) throw badRequest('Este código ya fue usado.');

    const user = await prisma.user.update({
      where: { id: payload.sub },
      data: { passwordHash: await bcrypt.hash(req.body.password, 10) },
    });
    await prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } });

    sendMail({
      to: user.email,
      ...passwordChangedEmail({ name: user.name, when: new Date().toLocaleString(user.lang === 'en' ? 'en-US' : 'es-CO', { timeZone: 'America/Bogota' }), ip: req.ip, lang: user.lang }),
    });
    res.json({ message: 'Contraseña actualizada. Ya puedes iniciar sesión.', token: signToken(user), user: publicUser(user) });
  }),
);

export default router;

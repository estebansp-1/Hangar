import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, badRequest, notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { sendMail } from '../lib/mailer.js';
import { requestReceivedEmail } from '../emails/templates.js';
import { nextRequestNumber } from '../services/catalog.js';

const router = Router();
router.use(requireAuth);

// ── Favoritos ───────────────────────────────────────
router.get(
  '/favorites',
  asyncHandler(async (req, res) => {
    const favs = await prisma.favorite.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
    res.json({ favorites: favs.map(({ kind, refId, createdAt }) => ({ kind, refId, createdAt })) });
  }),
);

router.post(
  '/favorites/toggle',
  validate(z.object({ kind: z.enum(['property', 'style']), refId: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const key = { userId_kind_refId: { userId: req.user.id, ...req.body } };
    const found = await prisma.favorite.findUnique({ where: key });
    if (found) await prisma.favorite.delete({ where: key });
    else await prisma.favorite.create({ data: { userId: req.user.id, ...req.body } });
    res.json({ active: !found });
  }),
);

// ── Solicitudes: visitas a propiedades y cotizaciones de proyectos ──
const phone = z.string().trim().min(7, 'Teléfono inválido');
const visitSchema = z.object({
  kind: z.literal('VISIT'),
  property: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elige una fecha'),
  time: z.string().min(3, 'Elige una hora'),
  phone,
  message: z.string().trim().max(800).optional().default(''),
});
const quoteSchema = z.object({
  kind: z.literal('QUOTE'),
  service: z.enum(['interior', 'house', 'building']),
  style: z.string().optional().nullable(),
  area: z.number().positive('Indica el área en m²').max(100000),
  budget: z.number().int().positive().optional().nullable(),
  city: z.string().trim().min(2, 'Indica la ciudad'),
  phone,
  message: z.string().trim().max(800).optional().default(''),
});

router.get(
  '/requests',
  asyncHandler(async (req, res) => {
    const list = await prisma.request.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
    res.json({ requests: list });
  }),
);

router.post(
  '/requests',
  validate(z.discriminatedUnion('kind', [visitSchema, quoteSchema])),
  asyncHandler(async (req, res) => {
    const data = { ...req.body };
    if (data.kind === 'VISIT') {
      const p = await prisma.property.findUnique({ where: { slug: data.property } });
      if (!p || !p.published) throw notFound('Propiedad no encontrada');
      if (p.status === 'SOLD') throw badRequest('Esta propiedad ya fue vendida');
      if (new Date(`${data.date}T23:59:59`) < new Date()) throw badRequest('La fecha debe ser futura');
    } else if (data.style) {
      const s = await prisma.style.findUnique({ where: { slug: data.style } });
      if (!s) throw notFound('Estilo no encontrado');
      if (data.service === 'interior') data.estimate = Math.round(s.pricePerM2 * data.area);
    }
    const request = await prisma.$transaction(async (tx) => tx.request.create({ data: { ...data, number: await nextRequestNumber(tx), userId: req.user.id } }));
    sendMail({ to: req.user.email, ...requestReceivedEmail({ name: req.user.name, request, lang: req.user.lang }) });
    res.status(201).json({ request });
  }),
);

router.post(
  '/requests/:id/cancel',
  asyncHandler(async (req, res) => {
    const r = await prisma.request.findUnique({ where: { id: req.params.id } });
    if (!r || r.userId !== req.user.id) throw notFound('Solicitud no encontrada');
    if (['CLOSED', 'CANCELLED'].includes(r.status)) throw badRequest('Esta solicitud ya está cerrada');
    res.json({ request: await prisma.request.update({ where: { id: r.id }, data: { status: 'CANCELLED' } }) });
  }),
);

export default router;

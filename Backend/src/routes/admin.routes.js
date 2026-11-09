import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, badRequest, notFound } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { publicUser, requireAdmin, requireAuth } from '../middleware/auth.js';
import { propertyData, serializeProperty, serializeStyle, slugify, styleData } from '../services/catalog.js';
import { uploadImage, storeImage } from '../lib/uploads.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const i18n = z.object({ es: z.string(), en: z.string() });
const i18nList = z.object({ es: z.array(z.string()), en: z.array(z.string()) });
const TYPES = ['apartment', 'house', 'penthouse', 'loft', 'building'];
const STATUS = ['AVAILABLE', 'RESERVED', 'SOLD'];

const propertySchema = z.object({
  slug: z.string().trim().optional(),
  type: z.enum(TYPES),
  name: z.string().trim().min(2),
  city: z.string().trim().min(2),
  neighborhood: z.string().trim().min(2),
  price: z.number().int().positive('El precio debe ser mayor a 0'),
  area: z.number().positive(),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().int().min(0),
  parking: z.number().int().min(0),
  floors: z.number().int().min(1),
  units: z.number().int().min(0),
  status: z.enum(STATUS),
  delivery: z.string().nullable().optional(),
  styleId: z.string().nullable().optional(),
  featured: z.boolean(),
  published: z.boolean(),
  images: z.array(z.string()).min(1, 'Agrega al menos una foto'),
  description: i18n,
  features: i18nList,
});

// ── Dashboard ───────────────────────────────────────
router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [users, properties, units, newRequests, totalRequests, recent, favorites] = await Promise.all([
      prisma.user.count(),
      prisma.property.count({ where: { published: true } }),
      prisma.property.aggregate({ _sum: { units: true }, where: { published: true, status: 'AVAILABLE' } }),
      prisma.request.count({ where: { status: 'NEW' } }),
      prisma.request.count(),
      prisma.request.findMany({ orderBy: { createdAt: 'desc' }, take: 6, include: { user: true } }),
      prisma.favorite.groupBy({ by: ['refId'], _count: { refId: true }, orderBy: { _count: { refId: 'desc' } }, take: 5 }),
    ]);
    res.json({
      users,
      properties,
      units: units._sum.units || 0,
      newRequests,
      totalRequests,
      topFavorites: favorites.map((f) => ({ refId: f.refId, count: f._count.refId })),
      recentRequests: recent.map((r) => ({ ...r, user: publicUser(r.user) })),
    });
  }),
);

// ── Propiedades ─────────────────────────────────────
router.get(
  '/properties',
  asyncHandler(async (_req, res) => {
    const list = await prisma.property.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ properties: list.map(serializeProperty) });
  }),
);

router.post(
  '/properties',
  validate(propertySchema),
  asyncHandler(async (req, res) => {
    const p = await prisma.property.create({ data: propertyData(req.body) });
    res.status(201).json({ property: serializeProperty(p) });
  }),
);

router.put(
  '/properties/:id',
  validate(propertySchema),
  asyncHandler(async (req, res) => {
    const p = await prisma.property.update({ where: { id: req.params.id }, data: propertyData(req.body) });
    res.json({ property: serializeProperty(p) });
  }),
);

// Cambios rápidos desde la tabla: precio, unidades, estado, publicado, destacado
router.patch(
  '/properties/:id',
  validate(
    z.object({
      price: z.number().int().positive().optional(),
      units: z.number().int().min(0).optional(),
      status: z.enum(STATUS).optional(),
      published: z.boolean().optional(),
      featured: z.boolean().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const p = await prisma.property.update({ where: { id: req.params.id }, data: req.body });
    res.json({ property: serializeProperty(p) });
  }),
);

router.delete(
  '/properties/:id',
  asyncHandler(async (req, res) => {
    const p = await prisma.property.findUnique({ where: { id: req.params.id } });
    if (!p) throw notFound('Propiedad no encontrada');
    const used = await prisma.request.count({ where: { property: p.slug } });
    if (used > 0) {
      await prisma.property.update({ where: { id: p.id }, data: { published: false } });
      return res.json({ archived: true, message: 'La propiedad tiene solicitudes: se despublicó en lugar de eliminarse.' });
    }
    await prisma.property.delete({ where: { id: p.id } });
    await prisma.favorite.deleteMany({ where: { kind: 'property', refId: p.slug } });
    res.json({ deleted: true });
  }),
);

// ── Estilos ─────────────────────────────────────────
router.get(
  '/styles',
  asyncHandler(async (_req, res) => {
    const list = await prisma.style.findMany({ orderBy: { position: 'asc' } });
    res.json({ styles: list.map(serializeStyle) });
  }),
);

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color hex inválido');
const SCENE_KEYS = ['floor', 'wall', 'sofa', 'accent', 'wood', 'metal', 'rug', 'stone', 'plant'];
const styleSchema = z.object({
  slug: z.string().trim().optional(),
  name: z.object({ es: z.string().trim().min(2, 'Nombre en español requerido'), en: z.string().trim().min(2, 'Nombre en inglés requerido') }),
  tagline: i18n,
  description: i18n,
  materials: i18nList,
  palette: z.array(hex).min(1).max(8),
  scene: z.object(Object.fromEntries(SCENE_KEYS.map((k) => [k, hex]))),
  images: z.array(z.string()).min(1, 'Agrega al menos una foto'),
  pricePerM2: z.number().positive('El precio por m² debe ser mayor a 0'),
  position: z.number().int().optional(),
  published: z.boolean(),
});

router.post(
  '/styles',
  validate(styleSchema),
  asyncHandler(async (req, res) => {
    const slug = req.body.slug || slugify(req.body.name.es);
    const position = req.body.position ?? (await prisma.style.count()) + 1;
    const s = await prisma.style.create({ data: styleData({ ...req.body, slug, position }) });
    res.status(201).json({ style: serializeStyle(s) });
  }),
);

router.put(
  '/styles/:id',
  validate(styleSchema),
  asyncHandler(async (req, res) => {
    const s = await prisma.style.update({ where: { id: req.params.id }, data: styleData(req.body) });
    res.json({ style: serializeStyle(s) });
  }),
);

router.delete(
  '/styles/:id',
  asyncHandler(async (req, res) => {
    const s = await prisma.style.findUnique({ where: { id: req.params.id } });
    if (!s) throw notFound('Estilo no encontrado');
    const used = (await prisma.property.count({ where: { styleId: s.slug } })) + (await prisma.request.count({ where: { style: s.slug } }));
    if (used > 0) {
      await prisma.style.update({ where: { id: s.id }, data: { published: false } });
      return res.json({ archived: true, message: 'El estilo está en uso: se despublicó en lugar de eliminarse.' });
    }
    await prisma.style.delete({ where: { id: s.id } });
    await prisma.favorite.deleteMany({ where: { kind: 'style', refId: s.slug } });
    res.json({ deleted: true });
  }),
);

router.patch(
  '/styles/:id',
  validate(
    z.object({
      pricePerM2: z.number().int().positive().optional(),
      published: z.boolean().optional(),
      images: z.array(z.string()).min(1).optional(),
      tagline: i18n.optional(),
      description: i18n.optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const s = await prisma.style.update({ where: { id: req.params.id }, data: styleData(req.body) });
    res.json({ style: serializeStyle(s) });
  }),
);

// ── Solicitudes ─────────────────────────────────────
const REQ_STATUS = ['NEW', 'CONTACTED', 'SCHEDULED', 'CLOSED', 'CANCELLED'];

router.get(
  '/requests',
  asyncHandler(async (req, res) => {
    const where = {};
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.kind) where.kind = String(req.query.kind);
    const list = await prisma.request.findMany({ where, orderBy: { createdAt: 'desc' }, include: { user: true } });
    res.json({ requests: list.map((r) => ({ ...r, user: publicUser(r.user) })) });
  }),
);

router.patch(
  '/requests/:id',
  validate(z.object({ status: z.enum(REQ_STATUS) })),
  asyncHandler(async (req, res) => {
    const r = await prisma.request.update({ where: { id: req.params.id }, data: { status: req.body.status }, include: { user: true } });
    res.json({ request: { ...r, user: publicUser(r.user) } });
  }),
);

// ── Fotos ───────────────────────────────────────────
router.post(
  '/uploads',
  uploadImage.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('Adjunta una imagen en el campo "image"');
    res.status(201).json({ url: await storeImage(req, req.file) });
  }),
);

// ── Usuarios ────────────────────────────────────────
router.get(
  '/users',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { requests: true, favorites: true } } } });
    res.json({ users: users.map((u) => ({ ...publicUser(u), requests: u._count.requests, favorites: u._count.favorites })) });
  }),
);

router.patch(
  '/users/:id',
  validate(z.object({ role: z.enum(['USER', 'ADMIN']) })),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user.id) throw badRequest('No puedes cambiar tu propio rol');
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { role: req.body.role } });
    res.json({ user: publicUser(user) });
  }),
);

export default router;

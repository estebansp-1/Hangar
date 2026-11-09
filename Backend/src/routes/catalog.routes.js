import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, notFound } from '../lib/errors.js';
import { serializeProperty, serializeStyle } from '../services/catalog.js';

const router = Router();

// GET /api/properties?type=house,penthouse&city=Bogotá&q=torre&sort=price-asc&featured=true&maxPrice=…&minBedrooms=…
router.get(
  '/properties',
  asyncHandler(async (req, res) => {
    const { type, city, q, sort, featured, maxPrice, minBedrooms } = req.query;
    const where = { published: true };
    if (type) where.type = { in: String(type).split(',') };
    if (city) where.city = String(city);
    if (featured === 'true') where.featured = true;
    if (maxPrice) where.price = { lte: Number(maxPrice) };
    if (minBedrooms) where.bedrooms = { gte: Number(minBedrooms) };
    if (q) where.OR = [{ name: { contains: String(q) } }, { city: { contains: String(q) } }, { neighborhood: { contains: String(q) } }];
    const orderBy =
      sort === 'price-asc' ? { price: 'asc' } : sort === 'price-desc' ? { price: 'desc' } : sort === 'area' ? { area: 'desc' } : [{ featured: 'desc' }, { createdAt: 'asc' }];
    const list = await prisma.property.findMany({ where, orderBy });
    res.json({ properties: list.map(serializeProperty) });
  }),
);

router.get(
  '/properties/meta',
  asyncHandler(async (_req, res) => {
    const list = await prisma.property.findMany({ where: { published: true }, select: { city: true, type: true } });
    res.json({ cities: [...new Set(list.map((p) => p.city))], types: [...new Set(list.map((p) => p.type))] });
  }),
);

router.get(
  '/properties/:slug',
  asyncHandler(async (req, res) => {
    const p = await prisma.property.findUnique({ where: { slug: req.params.slug } });
    if (!p || !p.published) throw notFound('Propiedad no encontrada');
    res.json({ property: serializeProperty(p) });
  }),
);

router.get(
  '/styles',
  asyncHandler(async (_req, res) => {
    const list = await prisma.style.findMany({ where: { published: true }, orderBy: { position: 'asc' } });
    res.json({ styles: list.map(serializeStyle) });
  }),
);

router.get(
  '/styles/:slug',
  asyncHandler(async (req, res) => {
    const s = await prisma.style.findUnique({ where: { slug: req.params.slug } });
    if (!s || !s.published) throw notFound('Estilo no encontrado');
    res.json({ style: serializeStyle(s) });
  }),
);

export default router;

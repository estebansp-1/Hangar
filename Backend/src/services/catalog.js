import { prisma } from '../lib/prisma.js';

const j = (s, fallback = null) => {
  if (s == null) return fallback;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
};

export const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const serializeProperty = (p) => ({
  ...p,
  images: j(p.images, []),
  description: j(p.description, { es: '', en: '' }),
  features: j(p.features, { es: [], en: [] }),
});

export const serializeStyle = (s) => ({
  ...s,
  name: j(s.name, {}),
  tagline: j(s.tagline, {}),
  description: j(s.description, {}),
  materials: j(s.materials, { es: [], en: [] }),
  palette: j(s.palette, []),
  scene: j(s.scene, {}),
  images: j(s.images, []),
});

/** Objeto de la API → columnas de BD (los campos estructurados se guardan como JSON) */
export const propertyData = (p) => {
  const { id: _id, createdAt: _c, updatedAt: _u, images, description, features, ...rest } = p;
  return {
    ...rest,
    ...(rest.name && !rest.slug ? { slug: slugify(rest.name) } : {}),
    ...(images !== undefined && { images: JSON.stringify(images) }),
    ...(description !== undefined && { description: JSON.stringify(description) }),
    ...(features !== undefined && { features: JSON.stringify(features) }),
  };
};

export const styleData = (s) => {
  const { id: _id, ...rest } = s;
  const out = { ...rest };
  for (const k of ['name', 'tagline', 'description', 'materials', 'palette', 'scene', 'images']) if (rest[k] !== undefined) out[k] = JSON.stringify(rest[k]);
  return out;
};

export async function nextRequestNumber(tx = prisma) {
  const last = await tx.request.findFirst({ orderBy: { number: 'desc' }, select: { number: true } });
  return (last?.number ?? 1000) + 1;
}

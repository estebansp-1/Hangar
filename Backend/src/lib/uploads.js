import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { badRequest } from './errors.js';

/*
 * Fotos subidas desde el panel admin.
 *  - Con CLOUDINARY_URL (producción): se suben a Cloudinary y se guarda su URL segura.
 *    Los hosts gratuitos borran el disco en cada reinicio, así que no se guardan localmente.
 *  - Sin CLOUDINARY_URL (desarrollo): se guardan en Backend/uploads y se sirven en /uploads.
 */

export const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const TYPES = { 'image/png': '.png', 'image/webp': '.webp', 'image/jpeg': '.jpg' };

// cloudinary://API_KEY:API_SECRET@CLOUD_NAME
const cloud = (() => {
  const raw = process.env.CLOUDINARY_URL;
  if (!raw) return null;
  const m = raw.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (!m) throw new Error('CLOUDINARY_URL no tiene el formato cloudinary://API_KEY:API_SECRET@CLOUD_NAME');
  return { key: m[1], secret: m[2], name: m[3] };
})();
export const usesCloudinary = Boolean(cloud);
if (!cloud) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/** PNG/WebP/JPG, máx. 5 MB */
export const uploadImage = multer({
  storage: cloud
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${TYPES[file.mimetype]}`),
      }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => (TYPES[file.mimetype] ? cb(null, true) : cb(badRequest('Formato no permitido: usa PNG, WebP o JPG'))),
});

/** Sube a Cloudinary con firma (API REST, sin SDK) */
async function toCloudinary(file) {
  const params = { folder: 'hangar', timestamp: Math.floor(Date.now() / 1000) };
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  const signature = crypto.createHash('sha1').update(toSign + cloud.secret).digest('hex');
  const form = new FormData();
  form.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname || 'foto');
  Object.entries(params).forEach(([k, v]) => form.append(k, String(v)));
  form.append('api_key', cloud.key);
  form.append('signature', signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud.name}/image/upload`, { method: 'POST', body: form });
  const data = await res.json();
  if (!res.ok) throw badRequest(`No se pudo subir la foto: ${data?.error?.message || res.status}`);
  // f_auto,q_auto: Cloudinary entrega WebP/AVIF y la calidad justa según el navegador
  return data.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
}

/** Devuelve la URL pública de la foto recién subida */
export async function storeImage(req, file) {
  if (cloud) return toCloudinary(file);
  return `${req.protocol}://${req.get('host')}/uploads/${path.basename(file.filename)}`;
}

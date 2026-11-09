import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { badRequest } from './errors.js';

export const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const TYPES = { 'image/png': '.png', 'image/webp': '.webp', 'image/jpeg': '.jpg' };

/** Fotos de producto: PNG/WebP/JPG, máx. 5 MB, nombre aleatorio para evitar colisiones */
export const uploadImage = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${TYPES[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => (TYPES[file.mimetype] ? cb(null, true) : cb(badRequest('Formato no permitido: usa PNG, WebP o JPG'))),
});

export const publicUploadUrl = (req, filename) => `${req.protocol}://${req.get('host')}/uploads/${path.basename(filename)}`;

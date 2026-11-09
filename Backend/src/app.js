import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { env } from './config/env.js';
import { UPLOAD_DIR, usesCloudinary } from './lib/uploads.js';
import authRoutes from './routes/auth.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import meRoutes from './routes/me.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

export const app = express();

app.set('trust proxy', 1);
// cross-origin para que el frontend (otro puerto/dominio) pueda mostrar las fotos subidas
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.clientUrl.split(','), credentials: true }));
app.use(express.json({ limit: '1mb' }));
if (!env.isProd) app.use(morgan('dev'));

if (!usesCloudinary) app.use('/uploads', express.static(path.resolve(UPLOAD_DIR), { maxAge: '30d', immutable: true }));
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'hangar-api', domain: 'arquitectura-interiores-inmobiliaria', time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);
app.use('/api/me', meRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

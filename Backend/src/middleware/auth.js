import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { forbidden, unauthorized } from '../lib/errors.js';

export const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role, typ: 'access' }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, lang: u.lang, createdAt: u.createdAt });

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw unauthorized();
    const payload = jwt.verify(token, env.jwtSecret);
    if (payload.typ !== 'access') throw unauthorized('Token inválido');
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw unauthorized('Usuario no encontrado');
    req.user = user;
    next();
  } catch (err) {
    next(err.status ? err : unauthorized('Sesión inválida o expirada'));
  }
}

export const requireAdmin = (req, _res, next) => (req.user?.role === 'ADMIN' ? next() : next(forbidden()));

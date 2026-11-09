import { badRequest } from '../lib/errors.js';

/** Valida req.body (o query/params) con un esquema zod y reemplaza por el valor parseado */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(badRequest(details[0]?.message || 'Datos inválidos', details));
  }
  req[source] = result.data;
  next();
};

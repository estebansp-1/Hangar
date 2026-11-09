export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (msg, details) => new HttpError(400, msg, details);
export const unauthorized = (msg = 'No autenticado') => new HttpError(401, msg);
export const forbidden = (msg = 'No tienes permisos para esta acción') => new HttpError(403, msg);
export const notFound = (msg = 'Recurso no encontrado') => new HttpError(404, msg);
export const conflict = (msg) => new HttpError(409, msg);

/** Envuelve handlers async para que los errores lleguen al middleware de errores */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

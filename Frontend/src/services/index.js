import { httpApi, setTokenGetter } from './http';

/** Punto único de acceso a datos: la API de Backend/ (VITE_API_URL) */
export const api = httpApi;

export const bindToken = (getter) => setTokenGetter(getter);

export { ApiError } from './http';

// Cliente de la API (Backend/). URL en VITE_API_URL
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

let getToken = () => null;
export const setTokenGetter = (fn) => (getToken = fn);

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body, query } = {}) {
  const url = new URL(BASE + path);
  if (query) Object.entries(query).forEach(([k, v]) => v !== undefined && v !== '' && v !== null && url.searchParams.set(k, v));
  const token = getToken();
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'Algo salió mal', data.details);
  return data;
}

async function upload(path, file) {
  const token = getToken();
  const body = new FormData();
  body.append('image', file);
  const res = await fetch(BASE + path, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body }).catch(() => {
    throw new ApiError(0, 'No se pudo conectar con el servidor');
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'No se pudo subir la imagen');
  return data;
}

export const httpApi = {
  auth: {
    register: (body) => request('/auth/register', { method: 'POST', body }),
    login: (body) => request('/auth/login', { method: 'POST', body }),
    me: () => request('/auth/me'),
    updateMe: (body) => request('/auth/me', { method: 'PATCH', body }),
    forgotPassword: (body) => request('/auth/forgot-password', { method: 'POST', body }),
    verifyCode: (body) => request('/auth/verify-code', { method: 'POST', body }),
    resetPassword: (body) => request('/auth/reset-password', { method: 'POST', body }),
  },
  properties: {
    list: (query) => request('/properties', { query }),
    meta: () => request('/properties/meta'),
    get: (slug) => request(`/properties/${slug}`),
  },
  assist: {
    chat: (body) => request('/assist/chat', { method: 'POST', body }),
    handoff: (body) => request('/assist/handoff', { method: 'POST', body }),
  },
  styles: {
    list: () => request('/styles'),
    get: (slug) => request(`/styles/${slug}`),
  },
  me: {
    favorites: () => request('/me/favorites'),
    toggleFavorite: (body) => request('/me/favorites/toggle', { method: 'POST', body }),
    requests: () => request('/me/requests'),
    createRequest: (body) => request('/me/requests', { method: 'POST', body }),
    cancelRequest: (id) => request(`/me/requests/${id}/cancel`, { method: 'POST' }),
  },
  admin: {
    stats: () => request('/admin/stats'),
    properties: () => request('/admin/properties'),
    createProperty: (body) => request('/admin/properties', { method: 'POST', body }),
    updateProperty: (id, body) => request(`/admin/properties/${id}`, { method: 'PUT', body }),
    patchProperty: (id, body) => request(`/admin/properties/${id}`, { method: 'PATCH', body }),
    deleteProperty: (id) => request(`/admin/properties/${id}`, { method: 'DELETE' }),
    styles: () => request('/admin/styles'),
    patchStyle: (id, body) => request(`/admin/styles/${id}`, { method: 'PATCH', body }),
    createStyle: (body) => request('/admin/styles', { method: 'POST', body }),
    updateStyle: (id, body) => request(`/admin/styles/${id}`, { method: 'PUT', body }),
    deleteStyle: (id) => request(`/admin/styles/${id}`, { method: 'DELETE' }),
    requests: (query) => request('/admin/requests', { query }),
    setRequestStatus: (id, status) => request(`/admin/requests/${id}`, { method: 'PATCH', body: { status } }),
    users: () => request('/admin/users'),
    setUserRole: (id, role) => request(`/admin/users/${id}`, { method: 'PATCH', body: { role } }),
    uploadImage: (file) => upload('/admin/uploads', file),
  },
};

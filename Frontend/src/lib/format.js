import { usePrefs } from '../i18n';

const loc = () => (usePrefs.getState().lang === 'en' ? 'en-US' : 'es-CO');

/** $1.250.000.000 · en millones si es muy grande ($1.250 M) cuando compact=true */
export const money = (n, compact = false) => {
  if (compact && n >= 1e9) {
    const v = n / 1e6;
    return `$${new Intl.NumberFormat(loc(), { maximumFractionDigits: 0 }).format(v)} M`;
  }
  return new Intl.NumberFormat(loc(), { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);
};
export const num = (n) => new Intl.NumberFormat(loc()).format(n || 0);
export const date = (d) => new Date(d).toLocaleDateString(loc(), { day: '2-digit', month: 'short', year: 'numeric' });

export const STATUS_TONE = { AVAILABLE: 'ok', RESERVED: 'warn', SOLD: 'danger' };
export const REQ_TONE = { NEW: 'accent', CONTACTED: 'info', SCHEDULED: 'ok', CLOSED: 'muted', CANCELLED: 'danger' };

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, bindToken } from '../services';
import { usePrefs } from '../i18n';

export const useAuth = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      async login(credentials) {
        const { token, user } = await api.auth.login(credentials);
        set({ token, user });
        useFavorites.getState().load();
        return user;
      },
      async register(data) {
        const { token, user } = await api.auth.register({ ...data, lang: usePrefs.getState().lang });
        set({ token, user });
        useFavorites.getState().load();
        return user;
      },
      setSession: ({ token, user }) => {
        set({ token, user });
        useFavorites.getState().load();
      },
      setUser: (user) => set({ user }),
      async refresh() {
        if (!get().token) return;
        try {
          const { user } = await api.auth.me();
          set({ user });
          useFavorites.getState().load();
        } catch (e) {
          if (e.status === 401) set({ token: null, user: null });
        }
      },
      logout: () => {
        set({ token: null, user: null });
        useFavorites.setState({ keys: [] });
      },
    }),
    { name: 'hangar-auth-v2' },
  ),
);

bindToken(() => useAuth.getState().token);

/** Favoritos del usuario como claves "kind:refId" */
export const useFavorites = create((set, get) => ({
  keys: [],
  async load() {
    if (!useAuth.getState().token) return set({ keys: [] });
    try {
      const { favorites } = await api.me.favorites();
      set({ keys: favorites.map((f) => `${f.kind}:${f.refId}`) });
    } catch {
      set({ keys: [] });
    }
  },
  has: (kind, refId) => get().keys.includes(`${kind}:${refId}`),
  async toggle(kind, refId) {
    const key = `${kind}:${refId}`;
    const had = get().keys.includes(key);
    set({ keys: had ? get().keys.filter((k) => k !== key) : [key, ...get().keys] }); // optimista
    try {
      await api.me.toggleFavorite({ kind, refId });
      return !had;
    } catch (e) {
      set({ keys: had ? [key, ...get().keys] : get().keys.filter((k) => k !== key) });
      throw e;
    }
  },
}));

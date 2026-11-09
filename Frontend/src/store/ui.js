import { create } from 'zustand';

let id = 0;
export const useToasts = create((set, get) => ({
  toasts: [],
  push(message, tone = 'default', ms = 3800) {
    const t = { id: ++id, message, tone };
    set({ toasts: [...get().toasts, t] });
    setTimeout(() => get().dismiss(t.id), ms);
  },
  dismiss: (tid) => set({ toasts: get().toasts.filter((t) => t.id !== tid) }),
}));

export const toast = (msg, tone, ms) => useToasts.getState().push(msg, tone, ms);


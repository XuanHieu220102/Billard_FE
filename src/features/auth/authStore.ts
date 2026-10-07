import { create } from 'zustand';

interface AuthState {
  token: string | null;
  shopId: string | null;
  shopName: string | null;
  login: (token: string, shopId: string, shopName: string) => void;
  logout: () => void;
}

const STORAGE_KEY = 'billiard_auth';

function loadInitialState(): Pick<AuthState, 'token' | 'shopId' | 'shopName'> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: null, shopId: null, shopName: null };
    return JSON.parse(raw);
  } catch {
    return { token: null, shopId: null, shopName: null };
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...loadInitialState(),
  login: (token, shopId, shopName) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, shopId, shopName }));
    set({ token, shopId, shopName });
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ token: null, shopId: null, shopName: null });
  },
}));

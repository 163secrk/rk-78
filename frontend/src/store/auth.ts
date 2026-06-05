import { create } from 'zustand';
import { UserInfo, UserRole, LoginResponse } from '../types';
import { authApi } from '../services/api';

interface AuthState {
  user: UserInfo | null;
  token: string | null;
  login: (role: UserRole, username: string, password: string, storeId?: number) => Promise<LoginResponse>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    const saved = localStorage.getItem('pharmacy_user');
    return saved ? JSON.parse(saved) : null;
  })(),
  token: localStorage.getItem('pharmacy_token'),
  
  login: async (role, username, password, storeId) => {
    const result = await authApi.login({ username, password, role, storeId });
    localStorage.setItem('pharmacy_token', result.token);
    localStorage.setItem('pharmacy_user', JSON.stringify(result.user));
    set({ user: result.user, token: result.token });
    return result;
  },
  
  logout: () => {
    localStorage.removeItem('pharmacy_token');
    localStorage.removeItem('pharmacy_user');
    set({ user: null, token: null });
  },
}));

import { create } from 'zustand';
import { UserInfo, UserRole } from '../types';

interface AuthState {
  user: UserInfo | null;
  login: (role: UserRole, username: string, storeId?: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    const saved = localStorage.getItem('pharmacy_user');
    return saved ? JSON.parse(saved) : null;
  })(),
  
  login: (role, username, storeId) => {
    const user: UserInfo = { role, username, storeId };
    localStorage.setItem('pharmacy_user', JSON.stringify(user));
    set({ user });
  },
  
  logout: () => {
    localStorage.removeItem('pharmacy_user');
    set({ user: null });
  },
}));

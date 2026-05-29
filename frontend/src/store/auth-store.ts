import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { api, setAuthToken, getAuthToken } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import type { User, Address } from '@/lib/api-service';
import { toast } from 'sonner';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  loginWithFacebook: () => Promise<boolean>;
  register: (name: string, email: string, password: string, phone: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  addAddress: (address: Omit<Address, 'id'>) => void;
  updateAddress: (id: string, address: Partial<Address>) => void;
  deleteAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallback;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      token: getAuthToken(),

      login: async (email: string, password: string) => {
        try {
          const { data } = await api.post('/auth/login', { email, password });
          setAuthToken(data.token);
          set({ user: data.user, isAuthenticated: true, token: data.token });
          connectSocket(data.token);
          return true;
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Đăng nhập thất bại'));
          return false;
        }
      },

      loginWithGoogle: async () => {
        return get().login('nguyenvana@gmail.com', '123456');
      },

      loginWithFacebook: async () => {
        return get().login('nguyenvana@gmail.com', '123456');
      },

      register: async (name: string, email: string, password: string, phone: string) => {
        try {
          const { data } = await api.post('/auth/register', { name, email, password, phone });
          setAuthToken(data.token);
          set({ user: data.user, isAuthenticated: true, token: data.token });
          connectSocket(data.token);
          return true;
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Đăng ký thất bại'));
          return false;
        }
      },

      logout: () => {
        disconnectSocket();
        setAuthToken(null);
        set({ user: null, isAuthenticated: false, token: null });
      },

      updateProfile: (data) => {
        const { user } = get();
        if (user) {
          const nextUser = { ...user, ...data };
          set({ user: nextUser });
          api.put('/users/me', data).catch(() => {
            // Keep optimistic UI update even if request fails.
          });
        }
      },

      changePassword: async (oldPassword: string, newPassword: string) => {
        try {
          await api.post('/users/change-password', { oldPassword, newPassword });
          return true;
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Đổi mật khẩu thất bại'));
          return false;
        }
      },

      addAddress: (address) => {
        const { user } = get();
        if (user) {
          const newAddress: Address = { ...address, id: `addr-${Date.now()}` };
          set({ user: { ...user, addresses: [...(user.addresses ?? []), newAddress] } });
          api.post('/users/addresses', address).catch(() => {
            // Keep local optimistic update.
          });
        }
      },

      updateAddress: (id, address) => {
        const { user } = get();
        if (user) {
          set({
            user: {
              ...user,
              addresses: (user.addresses ?? []).map(a => a.id === id ? { ...a, ...address } : a),
            },
          });
        }
      },

      deleteAddress: (id) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, addresses: (user.addresses ?? []).filter(a => a.id !== id) } });
          api.delete(`/users/addresses/${id}`).catch(() => {
            // Keep local optimistic update.
          });
        }
      },

      setDefaultAddress: (id) => {
        const { user } = get();
        if (user) {
          set({
            user: {
              ...user,
              addresses: (user.addresses ?? []).map(a => ({ ...a, isDefault: a.id === id })),
            },
          });
          api.patch(`/users/addresses/${id}/default`).catch(() => {
            // Keep local optimistic update.
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        if (state.token) {
          setAuthToken(state.token);
          return;
        }

        setAuthToken(null);
        if (state.isAuthenticated) {
          state.logout();
        }
      },
    }
  )
);

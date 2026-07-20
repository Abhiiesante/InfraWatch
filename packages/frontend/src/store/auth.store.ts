import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'INSPECTOR' | 'OPERATOR';
  tenantId: number;
}

export interface AuthOrganization {
  id: number;
  name: string;
  domain?: string;
  plan: string;
}

interface AuthState {
  user: AuthUser | null;
  organization: AuthOrganization | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setAuth: (user: AuthUser, org: AuthOrganization, accessToken: string, refreshToken: string) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      organization: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      setAuth: (user, org, accessToken, refreshToken) => {
        set({
          user,
          organization,
          accessToken,
          refreshToken,
          error: null,
        });
      },

      setAccessToken: (token) => {
        set({ accessToken: token });
      },

      logout: () => {
        set({
          user: null,
          organization: null,
          accessToken: null,
          refreshToken: null,
          error: null,
        });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setError: (error) => {
        set({ error });
      },

      isAuthenticated: () => {
        const state = get();
        return !!state.accessToken && !!state.user;
      },
    }),
    {
      name: 'infrawatch-auth',
    }
  )
);

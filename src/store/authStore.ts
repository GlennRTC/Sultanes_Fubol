import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Profile, AuthUser } from '../types/index';

interface AuthState {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
  updateTokens: (delta: number) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,   // true on mount — resolves via onAuthStateChange (D-10)
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },
  updateTokens: (delta) => set((state) => ({
    profile: state.profile
      ? { ...state.profile, tokens: state.profile.tokens + delta }
      : null,
  })),
}));

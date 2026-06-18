import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Profile, AuthUser } from '../types/index';

interface AuthState {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;        // auth session resolving (clears as soon as session is known)
  profileLoading: boolean; // profile row fetch in-flight (separate from auth)
  setUser: (user: AuthUser | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  setProfileLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
  updateTokens: (delta: number) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,          // true on mount — clears as soon as auth state is known
  profileLoading: false,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setProfileLoading: (profileLoading) => set({ profileLoading }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },
  updateTokens: (delta) => set((state) => ({
    profile: state.profile
      ? { ...state.profile, tokens: Math.max(0, state.profile.tokens + delta) }
      : null,
  })),
}));

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';
import { demoProfiles, isDemoAuthEnabled } from './demoProfiles';
import { STAFF_ROLES } from '../config/roles';

export interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

type AuthResult = { error: string | null };

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  /** Sign in or sign up with a Google account (Supabase OAuth). New users start as members. */
  signInWithGoogle: () => Promise<AuthResult>;
  signUp: (input: SignUpInput) => Promise<AuthResult & { needsConfirmation: boolean }>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  /** Dev-only: impersonate a role without a Supabase account. No-op in production builds. */
  loginDemoUser: (role: UserRole) => void;
  logout: () => Promise<void>;
  /** Re-reads the signed-in user's profile (after editing it). */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_ROLE_KEY = 'rv_demo_role';

function readDemoRole(): UserRole | null {
  if (!isDemoAuthEnabled()) return null;
  try {
    const role = localStorage.getItem(DEMO_ROLE_KEY) as UserRole | null;
    return role && role in demoProfiles ? role : null;
  } catch {
    return null;
  }
}

/** Where a signed-in user lands by default, based on their role. */
export function homePathForRole(role: UserRole): string {
  if (role === 'trainer') return '/trainer/dashboard';
  if (STAFF_ROLES.includes(role)) return '/admin/dashboard';
  return '/portal/dashboard';
}

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) {
    console.error('Failed to load profile', error.message);
    return null;
  }
  return (data as UserProfile | null) ?? null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [demoRole, setDemoRole] = useState<UserRole | null>(readDemoRole);
  const [loading, setLoading] = useState(true);
  // Guards against out-of-order profile responses when the session changes quickly.
  const latestUserId = useRef<string | null>(null);

  const applySession = useCallback(async (next: Session | null) => {
    setSession(next);
    const userId = next?.user.id ?? null;
    latestUserId.current = userId;
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const loaded = await fetchProfile(userId);
    if (latestUserId.current !== userId) return;
    setProfile(loaded);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) applySession(data.session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'INITIAL_SESSION') return; // handled by getSession above
      // Defer: awaiting Supabase calls inside this callback can deadlock the auth client.
      setTimeout(() => {
        if (active) applySession(next);
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const signInWithGoogle = async (): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login` },
    });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async ({ email, password, fullName, phone }: SignUpInput) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    let errorMsg = error?.message ?? null;
    if (errorMsg) {
      const lower = errorMsg.toLowerCase();
      if (lower.includes('profiles_phone_key')) {
        errorMsg = 'This phone number is already registered to an account. Please sign in or use another number.';
      } else if (lower.includes('database error saving new user') || lower.includes('duplicate key')) {
        errorMsg = 'An account with this email or phone number already exists. Please sign in.';
      }
    }

    return { error: errorMsg, needsConfirmation: !error && !data.session };
  };

  const resetPassword = async (email: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  };

  const updatePassword = async (password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error?.message ?? null };
  };

  const refreshProfile = async () => {
    const userId = latestUserId.current;
    if (!userId) return;
    const loaded = await fetchProfile(userId);
    if (latestUserId.current === userId && loaded) setProfile(loaded);
  };

  const loginDemoUser = (role: UserRole) => {
    if (!isDemoAuthEnabled()) return;
    try {
      localStorage.setItem(DEMO_ROLE_KEY, role);
    } catch {
      // ignore storage failures; the demo role still applies for this tab
    }
    setDemoRole(role);
  };

  const logout = async () => {
    try {
      localStorage.removeItem(DEMO_ROLE_KEY);
    } catch {
      // ignore
    }
    setDemoRole(null);
    await supabase.auth.signOut();
    latestUserId.current = null;
    setSession(null);
    setProfile(null);
  };

  const effectiveProfile = profile ?? (demoRole && isDemoAuthEnabled() ? demoProfiles[demoRole] : null);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        profile: effectiveProfile,
        session,
        loading,
        signIn,
        signInWithGoogle,
        signUp,
        resetPassword,
        updatePassword,
        loginDemoUser,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

/** Like useAuth, but returns null outside an AuthProvider (public components rendered on their own). */
export const useOptionalAuth = () => useContext(AuthContext) ?? null;

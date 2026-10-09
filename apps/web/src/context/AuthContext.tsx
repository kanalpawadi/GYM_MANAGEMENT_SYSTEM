import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  loginDemoUser: (role: UserRole) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock profiles for quick role switching and testing
const mockDemoProfiles: Record<UserRole, UserProfile> = {
  member: {
    id: 'demo-member-id',
    full_name: 'Rahul Sharma',
    email: 'member@rvfitnessgym.in',
    phone: '9876543210',
    role: 'member',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    emergency_contact: { name: 'Sunita Sharma', phone: '9876500000', relation: 'Mother' },
    health_notes: 'Mild lower back sensitivity. Prefer high volume over 1RM loading.',
    created_at: new Date().toISOString(),
  },
  trainer: {
    id: 'demo-trainer-id',
    full_name: 'Vikram Sharma',
    email: 'trainer@rvfitnessgym.in',
    phone: '9876543211',
    role: 'trainer',
    avatar_url: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?auto=format&fit=crop&w=200&q=80',
    created_at: new Date().toISOString(),
  },
  receptionist: {
    id: 'demo-receptionist-id',
    full_name: 'Pooja Verma',
    email: 'reception@rvfitnessgym.in',
    phone: '9876543212',
    role: 'receptionist',
    created_at: new Date().toISOString(),
  },
  manager: {
    id: 'demo-manager-id',
    full_name: 'Karan Kapoor',
    email: 'manager@rvfitnessgym.in',
    phone: '9876543213',
    role: 'manager',
    created_at: new Date().toISOString(),
  },
  owner: {
    id: 'demo-owner-id',
    full_name: 'Rajesh Verma (Owner)',
    email: 'owner@rvfitnessgym.in',
    phone: '9876543214',
    role: 'owner',
    created_at: new Date().toISOString(),
  },
  visitor: {
    id: 'demo-visitor-id',
    full_name: 'Guest Visitor',
    email: 'visitor@rvfitnessgym.in',
    role: 'visitor',
    created_at: new Date().toISOString(),
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    // Restore demo user from localStorage if saved
    const savedRole = localStorage.getItem('rv_demo_role') as UserRole;
    return savedRole ? mockDemoProfiles[savedRole] : mockDemoProfiles.member;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listen for real Supabase auth state changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loginDemoUser = (role: UserRole) => {
    localStorage.setItem('rv_demo_role', role);
    setProfile(mockDemoProfiles[role]);
  };

  const logout = async () => {
    localStorage.removeItem('rv_demo_role');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, loginDemoUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

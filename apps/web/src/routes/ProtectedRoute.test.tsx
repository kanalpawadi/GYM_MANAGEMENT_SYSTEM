import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { failNextRpc, makeProfile, resetSupabaseMock, signInAs, signInWithoutProfile } from '../test/supabaseMock';
import { App } from '../App';

vi.mock('../lib/supabase', async () => ({ supabase: (await import('../test/supabaseMock')).supabaseMock }));

const Where = ({ label }: { label: string }) => {
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
  return (
    <p>
      {label} at {location.pathname}
      {from ? ` from ${from}` : ''}
    </p>
  );
};

function renderGuarded(route: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/login" element={<Where label="login page" />} />
          <Route path="/" element={<Where label="home page" />} />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['receptionist', 'manager', 'owner']}>
                <Where label="admin area" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/*"
            element={
              <ProtectedRoute allowedRoles={['trainer', 'manager', 'owner']}>
                <Where label="trainer area" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/*"
            element={
              <ProtectedRoute allowedRoles={['member', 'trainer', 'receptionist', 'manager', 'owner']}>
                <Where label="member portal" />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

beforeEach(() => {
  resetSupabaseMock();
  localStorage.clear();
});

afterEach(() => vi.unstubAllEnvs());

describe('ProtectedRoute', () => {
  it.each(['/admin/dashboard', '/portal/dashboard', '/trainer/dashboard'])(
    'redirects an unauthenticated visitor from %s to /login',
    async (route) => {
      renderGuarded(route);
      expect(await screen.findByText(`login page at /login from ${route}`)).toBeInTheDocument();
    },
  );

  it('does not trust a leftover demo role in localStorage', async () => {
    vi.stubEnv('DEV', false);
    localStorage.setItem('rv_demo_role', 'owner');
    renderGuarded('/admin/dashboard');
    expect(await screen.findByText(/login page at \/login/)).toBeInTheDocument();
  });

  it('shows a loading state while the session is being restored', async () => {
    renderGuarded('/admin/dashboard');
    expect(screen.getByText(/loading portal/i)).toBeInTheDocument();
    expect(await screen.findByText(/login page at \/login/)).toBeInTheDocument();
  });

  it('lets an owner into the admin area', async () => {
    signInAs(makeProfile('owner'));
    renderGuarded('/admin/dashboard');
    expect(await screen.findByText('admin area at /admin/dashboard')).toBeInTheDocument();
  });

  it('lets a receptionist into the admin area but not the trainer panel', async () => {
    signInAs(makeProfile('receptionist'));
    renderGuarded('/trainer/dashboard');
    expect(await screen.findByText('admin area at /admin/dashboard')).toBeInTheDocument();
  });

  it('sends a member who opens /admin to their own portal', async () => {
    signInAs(makeProfile('member'));
    renderGuarded('/admin/members');
    expect(await screen.findByText('member portal at /portal/dashboard')).toBeInTheDocument();
  });

  it('sends a trainer who opens /admin to the trainer panel', async () => {
    signInAs(makeProfile('trainer'));
    renderGuarded('/admin/dashboard');
    expect(await screen.findByText('trainer area at /trainer/dashboard')).toBeInTheDocument();
  });

  it('sends a visitor-role account home', async () => {
    signInAs(makeProfile('visitor'));
    renderGuarded('/portal/dashboard');
    expect(await screen.findByText('home page at /')).toBeInTheDocument();
  });

  it('creates a missing profile as a member (first Google sign-in)', async () => {
    signInWithoutProfile();
    renderGuarded('/portal/dashboard');
    expect(await screen.findByText('member portal at /portal/dashboard')).toBeInTheDocument();
  });

  it('treats a session without a profile row as signed out when it cannot be created', async () => {
    signInWithoutProfile();
    failNextRpc('ensure_my_profile', 'Another RV Fitness account already uses orphan@example.com.');
    renderGuarded('/portal/dashboard');
    expect(await screen.findByText(/login page at \/login/)).toBeInTheDocument();
  });
});

describe('App routing', () => {
  it('redirects an unauthenticated visitor to /admin to the login page', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ data: [] }) } as Response);
    window.history.pushState({}, '', '/admin');
    render(<App />);
    expect(await screen.findByRole('heading', { name: /portal login/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });
});

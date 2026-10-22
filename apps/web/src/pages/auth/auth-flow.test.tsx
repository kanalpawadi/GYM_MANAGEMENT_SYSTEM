import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { addUser, failNextRpc, makeProfile, resetSupabaseMock, signInAs, signInWithoutProfile, supabaseMock } from '../../test/supabaseMock';
import { Login } from './Login';
import { Signup } from './Signup';
import { ForgotPassword } from './ForgotPassword';
import { ResetPassword } from './ResetPassword';

vi.mock('../../lib/supabase', async () => ({ supabase: (await import('../../test/supabaseMock')).supabaseMock }));

const Landing = () => {
  const { profile, logout } = useAuth();
  return (
    <div>
      <p>
        landed on {useLocation().pathname} as {profile?.role ?? 'nobody'}
      </p>
      <button onClick={logout}>Log out</button>
    </div>
  );
};

const splitRoute = (route: string) => {
  const url = new URL(route, 'http://test.local');
  return { pathname: url.pathname, search: url.search, hash: url.hash };
};

function renderAuth(route: string, initialState?: unknown) {
  return render(
    <HelmetProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[{ ...splitRoute(route), state: initialState }]}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<Landing />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </HelmetProvider>,
  );
}

async function fillLogin(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/email address/i), email);
  await user.type(screen.getByLabelText(/^password/i), password);
  await user.click(screen.getByRole('button', { name: /sign in to portal/i }));
  return user;
}

beforeEach(() => {
  resetSupabaseMock();
  localStorage.clear();
});

afterEach(() => vi.unstubAllEnvs());

describe('Login', () => {
  it('explains a Google error sent back to /login and clears it from the address', async () => {
    renderAuth('/login?error=server_error&error_description=Database+error+saving+new+user');
    expect(await screen.findByRole('alert')).toHaveTextContent(/run the latest database update \(migration 08\)/i);
  });

  it('explains a wrong Google client secret from the URL hash', async () => {
    renderAuth('/login#error=server_error&error_description=Unable+to+exchange+external+code');
    expect(await screen.findByRole('alert')).toHaveTextContent(/Client ID or Secret in Supabase is wrong/i);
  });

  it('first Google sign-in without a profile row creates a member profile and asks them to register', async () => {
    signInWithoutProfile('google-uid');
    renderAuth('/login');
    expect(await screen.findByText('landed on /register as member')).toBeInTheDocument();
    expect(supabaseMock.rpc).toHaveBeenCalledWith('ensure_my_profile');
  });

  it('shows why a Google account could not get a profile', async () => {
    signInWithoutProfile('google-uid');
    failNextRpc('ensure_my_profile', 'Another RV Fitness account already uses orphan@example.com. Please sign in with your email and password.');
    renderAuth('/login');
    expect(await screen.findByText(/already uses orphan@example.com/)).toBeInTheDocument();
  });

  it('asks for migration 08 when the repair function is missing', async () => {
    signInWithoutProfile('google-uid');
    failNextRpc('ensure_my_profile', 'Could not find the function public.ensure_my_profile without parameters in the schema cache');
    renderAuth('/login');
    expect(await screen.findByText(/needs its latest update \(migration 08\)/)).toBeInTheDocument();
  });

  it('signs in with Supabase and routes a member to the portal', async () => {
    addUser(makeProfile('member', { email: 'asha@example.com' }), 's3cret-pass');
    renderAuth('/login');
    await fillLogin('asha@example.com', 's3cret-pass');

    expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'asha@example.com', password: 's3cret-pass' });
    expect(await screen.findByText('landed on /portal/dashboard as member')).toBeInTheDocument();
  });

  it.each([
    ['super_admin', '/admin/dashboard'],
    ['owner', '/admin/dashboard'],
    ['receptionist', '/admin/dashboard'],
    ['trainer', '/trainer/dashboard'],
  ] as const)('routes a %s to %s using the role from the profiles table', async (role, path) => {
    addUser(makeProfile(role), 'pw-12345678');
    renderAuth('/login');
    await fillLogin(`${role}@example.com`, 'pw-12345678');
    expect(await screen.findByText(`landed on ${path} as ${role}`)).toBeInTheDocument();
  });

  it('returns the user to the page they originally requested', async () => {
    addUser(makeProfile('owner'), 'pw-12345678');
    renderAuth('/login', { from: { pathname: '/admin/members' } });
    await fillLogin('owner@example.com', 'pw-12345678');
    expect(await screen.findByText('landed on /admin/members as owner')).toBeInTheDocument();
  });

  it('shows the Supabase error for wrong credentials and stays on the login page', async () => {
    addUser(makeProfile('member'), 'right-password');
    renderAuth('/login');
    await fillLogin('member@example.com', 'wrong-password');
    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /portal login/i })).toBeInTheDocument();
  });

  it('redirects an already signed-in user away from the login page', async () => {
    signInAs(makeProfile('manager'));
    renderAuth('/login');
    expect(await screen.findByText('landed on /admin/dashboard as manager')).toBeInTheDocument();
  });

  it('hides the demo role switcher in production builds', async () => {
    vi.stubEnv('DEV', false);
    renderAuth('/login');
    await screen.findByRole('button', { name: /sign in to portal/i });
    expect(screen.queryByText(/dev role demo selector/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /super admin/i })).not.toBeInTheDocument();
  });

  it('keeps the demo role switcher available in local development', async () => {
    renderAuth('/login');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /super admin/i }));
    expect(await screen.findByText('landed on /admin/dashboard as super_admin')).toBeInTheDocument();
  });

  it('logs out through Supabase and clears the profile', async () => {
    signInAs(makeProfile('member'));
    renderAuth('/portal/dashboard');
    const user = userEvent.setup();
    await screen.findByText('landed on /portal/dashboard as member');
    await user.click(screen.getByRole('button', { name: /log out/i }));
    expect(supabaseMock.auth.signOut).toHaveBeenCalled();
    expect(await screen.findByText('landed on /portal/dashboard as nobody')).toBeInTheDocument();
  });
});

describe('Signup', () => {
  async function fillSignup(overrides: Partial<Record<'name' | 'email' | 'phone' | 'password', string>> = {}) {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/full name/i), overrides.name ?? 'Asha Patil');
    await user.type(screen.getByLabelText(/email address/i), overrides.email ?? 'asha@example.com');
    await user.type(screen.getByLabelText(/phone number/i), overrides.phone ?? '9822012345');
    await user.type(screen.getByLabelText(/create password/i), overrides.password ?? 'strong-pass-1');
    await user.click(screen.getByRole('button', { name: /create account/i }));
  }

  it('creates the Supabase account with name and phone metadata and asks to confirm email', async () => {
    renderAuth('/signup');
    await fillSignup();

    expect(supabaseMock.auth.signUp).toHaveBeenCalledWith({
      email: 'asha@example.com',
      password: 'strong-pass-1',
      options: expect.objectContaining({ data: { full_name: 'Asha Patil', phone: '9822012345' } }),
    });
    // The role is never sent from the browser; the DB trigger assigns 'member'.
    expect(JSON.stringify(supabaseMock.auth.signUp.mock.calls[0][0])).not.toMatch(/role/);
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
  });

  it('rejects an invalid phone number before calling Supabase', async () => {
    renderAuth('/signup');
    await fillSignup({ phone: '12345' });
    expect(await screen.findByText(/valid 10-digit indian mobile/i)).toBeInTheDocument();
    expect(supabaseMock.auth.signUp).not.toHaveBeenCalled();
  });

  it('shows the Supabase error when sign-up fails', async () => {
    supabaseMock.auth.signUp.mockResolvedValueOnce({ data: { session: null, user: null }, error: { message: 'User already registered' } });
    renderAuth('/signup');
    await fillSignup();
    expect(await screen.findByText('User already registered')).toBeInTheDocument();
  });
});

describe('Forgot / reset password', () => {
  it('sends a Supabase reset email that links back to /reset-password', async () => {
    renderAuth('/forgot-password');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/registered email/i), 'asha@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(supabaseMock.auth.resetPasswordForEmail).toHaveBeenCalledWith('asha@example.com', {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    expect(await screen.findByText(/reset link sent/i)).toBeInTheDocument();
  });

  it('shows an error if the reset email cannot be sent', async () => {
    supabaseMock.auth.resetPasswordForEmail.mockResolvedValueOnce({ data: null, error: { message: 'Rate limit exceeded' } });
    renderAuth('/forgot-password');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/registered email/i), 'asha@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(await screen.findByText('Rate limit exceeded')).toBeInTheDocument();
  });

  it('updates the password from the recovery link session', async () => {
    signInAs(makeProfile('member'));
    renderAuth('/reset-password');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/new password/i), 'brand-new-pass');
    await user.type(screen.getByLabelText(/confirm password/i), 'brand-new-pass');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith({ password: 'brand-new-pass' });
    expect(await screen.findByText('landed on /portal/dashboard as member')).toBeInTheDocument();
  });

  it('explains an expired link when there is no recovery session', async () => {
    renderAuth('/reset-password');
    expect(await screen.findByText(/invalid or has expired/i)).toBeInTheDocument();
  });
});

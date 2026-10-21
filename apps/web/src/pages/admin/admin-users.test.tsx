import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../../routes/ProtectedRoute';
import { ADMIN_ROLES, CONTENT_EDITOR_ROLES } from '../../config/roles';
import { AdminLayout } from './AdminLayout';
import { AdminUsers } from './AdminUsers';
import { makeProfile, resetSupabaseMock, seed, signInAs, table, failNextWrite } from '../../test/supabaseMock';
import { CurrentPath, renderPortal } from '../../test/renderPortal';

vi.mock('../../lib/supabase', async () => ({ supabase: (await import('../../test/supabaseMock')).supabaseMock }));

const trainer = makeProfile('trainer', { id: 'trainer-1', full_name: 'Coach Arjun' });
const member = makeProfile('member', { id: 'member-1', full_name: 'Asha Patil' });
const otherOwner = makeProfile('owner', { id: 'owner-2', full_name: 'Other Owner', email: 'other@example.com' });

function renderAdmin(route: string) {
  return renderPortal(
    <>
      <CurrentPath />
      <Routes>
        <Route path="/admin/dashboard" element={<AdminLayout><p>dashboard</p></AdminLayout>} />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={ADMIN_ROLES}>
              <AdminLayout><AdminUsers /></AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/content"
          element={
            <ProtectedRoute allowedRoles={CONTENT_EDITOR_ROLES}>
              <p>website editor</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>,
    { route },
  );
}

beforeEach(() => {
  resetSupabaseMock();
  localStorage.clear();
  seed('profiles', [trainer, member, otherOwner]);
});
afterEach(() => vi.unstubAllEnvs());

describe('Admin navigation by role', () => {
  it('shows Users & Roles and Website Editor to the super admin', async () => {
    signInAs(makeProfile('super_admin'));
    renderAdmin('/admin/dashboard');
    expect(await screen.findByRole('link', { name: /users & roles/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /website editor/i })).toBeInTheDocument();
    expect(screen.getByText(/super admin terminal/i)).toBeInTheDocument();
  });

  it('shows Users & Roles but not Website Editor to the gym owner', async () => {
    signInAs(makeProfile('owner'));
    renderAdmin('/admin/dashboard');
    expect(await screen.findByRole('link', { name: /users & roles/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /website editor/i })).not.toBeInTheDocument();
  });

  it('hides both from a receptionist and blocks the URLs', async () => {
    signInAs(makeProfile('receptionist'));
    renderAdmin('/admin/users');
    expect(await screen.findByText('dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent('/admin/dashboard');
    expect(screen.queryByRole('link', { name: /users & roles/i })).not.toBeInTheDocument();
  });

  it('sends a gym owner away from the website editor URL', async () => {
    signInAs(makeProfile('owner'));
    renderAdmin('/admin/content');
    expect(await screen.findByText('dashboard')).toBeInTheDocument();
    expect(screen.queryByText('website editor')).not.toBeInTheDocument();
  });

  it('opens a change-password dialog from the admin sidebar', async () => {
    signInAs(makeProfile('owner'));
    renderAdmin('/admin/dashboard');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /change password/i }));
    expect(await screen.findByLabelText(/^new password/i)).toBeInTheDocument();
  });
});

describe('Users & Roles screen', () => {
  it('lets the super admin make someone a gym owner', async () => {
    signInAs(makeProfile('super_admin'));
    renderAdmin('/admin/users');
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('Role for Asha Patil'), 'owner');
    expect(await screen.findByText('Asha Patil is now Gym Owner.')).toBeInTheDocument();
    expect(table('profiles').find((p) => p.id === 'member-1')?.role).toBe('owner');
  });

  it('does not let the owner change another owner or offer owner access', async () => {
    signInAs(makeProfile('owner'));
    renderAdmin('/admin/users');
    await screen.findByLabelText('Role for Asha Patil');
    expect(screen.queryByLabelText('Role for Other Owner')).not.toBeInTheDocument();
    const options = within(screen.getByLabelText('Role for Asha Patil')).getAllByRole('option').map((o) => o.getAttribute('value'));
    expect(options).not.toContain('owner');
    expect(options).not.toContain('super_admin');
  });

  it('does not let anyone change their own role', async () => {
    const me = makeProfile('super_admin');
    signInAs(me);
    renderAdmin('/admin/users');
    await screen.findByLabelText('Role for Asha Patil');
    expect(screen.queryByLabelText(`Role for ${me.full_name}`)).not.toBeInTheDocument();
  });

  it('assigns a trainer to a member', async () => {
    signInAs(makeProfile('owner'));
    renderAdmin('/admin/users');
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('Trainer for Asha Patil'), 'trainer-1');
    expect(await screen.findByText('Asha Patil is now coached by Coach Arjun.')).toBeInTheDocument();
    expect(table('profiles').find((p) => p.id === 'member-1')?.assigned_trainer_id).toBe('trainer-1');
  });

  it('shows the database error when a change is refused', async () => {
    signInAs(makeProfile('owner'));
    renderAdmin('/admin/users');
    failNextWrite('profiles', 'Only the super admin can grant or remove owner access');
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('Role for Asha Patil'), 'trainer');
    expect(await screen.findByText('Only the super admin can grant or remove owner access')).toBeInTheDocument();
    expect(table('profiles').find((p) => p.id === 'member-1')?.role).toBe('member');
  });

  it('filters users by search text', async () => {
    signInAs(makeProfile('super_admin'));
    renderAdmin('/admin/users');
    const user = userEvent.setup();
    await screen.findByLabelText('Role for Asha Patil');
    await user.type(screen.getByLabelText('Search users'), 'arjun');
    expect(screen.queryByLabelText('Role for Asha Patil')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Role for Coach Arjun')).toBeInTheDocument();
  });
});

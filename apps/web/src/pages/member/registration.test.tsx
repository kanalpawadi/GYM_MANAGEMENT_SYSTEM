import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { Registration } from './Registration';
import { AdminRequests } from '../admin/AdminRequests';
import { Login } from '../auth/Login';
import { needsRegistration } from '../../config/roles';
import { addUser, makeProfile, seed, signInAs, supabaseMock, table } from '../../test/supabaseMock';
import { CurrentPath, renderPortal } from '../../test/renderPortal';

const newcomer = makeProfile('member', { id: 'neha', full_name: 'Neha G', email: 'neha@gmail.com', approval_status: 'incomplete' });

function renderRegistration() {
  return renderPortal(
    <>
      <Routes>
        <Route path="/register" element={<Registration />} />
        <Route path="*" element={<p>somewhere else</p>} />
      </Routes>
      <CurrentPath />
    </>,
    { route: '/register' },
  );
}

describe('needsRegistration', () => {
  it('applies only to members who are not approved', () => {
    expect(needsRegistration({ role: 'member', approval_status: 'incomplete' })).toBe(true);
    expect(needsRegistration({ role: 'member', approval_status: 'pending' })).toBe(true);
    expect(needsRegistration({ role: 'member', approval_status: 'approved' })).toBe(false);
    expect(needsRegistration({ role: 'trainer', approval_status: 'incomplete' })).toBe(false);
    // Database before migration 09 has no status: nobody is locked out.
    expect(needsRegistration({ role: 'member' })).toBe(false);
  });
});

describe('First sign-in registration', () => {
  it('a new member fills the form, sends it and then waits for approval', async () => {
    signInAs(newcomer);
    renderRegistration();
    const user = userEvent.setup();

    expect(await screen.findByRole('heading', { name: /member registration/i })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/contact number/i), '9822011111');
    await user.type(screen.getByLabelText(/^date of birth$/i), '01021999');
    await user.click(screen.getByRole('button', { name: /submit for approval/i }));

    expect(await screen.findByRole('heading', { name: /waiting for approval/i })).toBeInTheDocument();
    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      'submit_registration',
      expect.objectContaining({ p_full_name: 'Neha G', p_phone: '9822011111', p_dob: '1999-02-01' }),
    );
    expect(table('profiles').find((p) => p.id === 'neha')).toMatchObject({ approval_status: 'pending' });
  });

  it('needs a mobile number and date of birth', async () => {
    signInAs(newcomer);
    renderRegistration();
    const user = userEvent.setup();
    const form = await screen.findByRole('form', { name: /profile details/i });
    form.setAttribute('novalidate', '');
    await user.click(screen.getByRole('button', { name: /submit for approval/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/mobile number/i);
    expect(supabaseMock.rpc).not.toHaveBeenCalledWith('submit_registration', expect.anything());
  });

  it("shows the owner's note when the details were sent back", async () => {
    signInAs({ ...newcomer, approval_status: 'rejected', approval_note: 'Please add your correct DOB' });
    renderRegistration();
    expect(await screen.findByText(/Please add your correct DOB/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit for approval/i })).toBeInTheDocument();
  });

  it('opens the dashboard once the owner approves', async () => {
    signInAs({ ...newcomer, approval_status: 'pending' });
    renderRegistration();
    const user = userEvent.setup();
    expect(await screen.findByRole('heading', { name: /waiting for approval/i })).toBeInTheDocument();

    table('profiles').find((p) => p.id === 'neha')!.approval_status = 'approved';
    await user.click(screen.getByRole('button', { name: /check status/i }));
    expect(await screen.findByText('somewhere else')).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent('/portal/dashboard');
  });

  it('a new member who signs in lands on the registration page, not the dashboard', async () => {
    addUser(newcomer, 'pw-12345678');
    renderPortal(
      <>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<p>other</p>} />
        </Routes>
        <CurrentPath />
      </>,
      { route: '/login' },
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email address/i), 'neha@gmail.com');
    await user.type(screen.getByLabelText(/^password/i), 'pw-12345678');
    await user.click(screen.getByRole('button', { name: /sign in to portal/i }));
    expect(await screen.findByText('other')).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent('/register');
  });
});

describe('Owner approves new members', () => {
  const waiting = makeProfile('member', {
    id: 'neha',
    full_name: 'Neha Gaikwad',
    phone: '9822011111',
    dob: '1999-02-01',
    blood_group: 'B+',
    approval_status: 'pending',
    registration_submitted_at: '2026-10-22T10:00:00Z',
  });
  const page = () => renderPortal(<Routes><Route path="*" element={<AdminRequests />} /></Routes>);

  it('the owner sees the details and approves', async () => {
    seed('profiles', [waiting]);
    signInAs(makeProfile('owner'));
    page();
    const user = userEvent.setup();

    const card = await screen.findByLabelText(/registration from neha gaikwad/i);
    expect(card).toHaveTextContent('B+');
    await user.click(within(card).getByRole('button', { name: /approve member/i }));

    expect(await screen.findByText(/Neha Gaikwad is approved/)).toBeInTheDocument();
    expect(table('profiles').find((p) => p.id === 'neha')).toMatchObject({ approval_status: 'approved' });
    expect(screen.getByText(/no new members waiting/i)).toBeInTheDocument();
  });

  it('asking for changes needs a note', async () => {
    seed('profiles', [waiting]);
    signInAs(makeProfile('owner'));
    page();
    const user = userEvent.setup();

    const card = await screen.findByLabelText(/registration from neha gaikwad/i);
    await user.click(within(card).getByRole('button', { name: /ask to fix details/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/write a note/i);

    await user.type(within(card).getByLabelText(/note for neha gaikwad/i), 'Wrong date of birth');
    await user.click(within(card).getByRole('button', { name: /ask to fix details/i }));
    expect(await screen.findByText(/asked to fix their details/)).toBeInTheDocument();
    expect(table('profiles').find((p) => p.id === 'neha')).toMatchObject({ approval_status: 'rejected', approval_note: 'Wrong date of birth' });
  });

  it('receptionists and trainers do not see registrations', async () => {
    seed('profiles', [waiting]);
    signInAs(makeProfile('receptionist'));
    page();
    expect(await screen.findByRole('heading', { name: /plan renewals/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/new member registrations/i)).not.toBeInTheDocument();
  });
});

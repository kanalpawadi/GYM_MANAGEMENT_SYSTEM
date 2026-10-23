import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { MemberDetail } from './MemberDetail';
import { AdminMembers } from '../admin/AdminMembers';
import { InvoicePage } from '../InvoicePage';
import { payerName } from '../../services/gym';
import { makeProfile, removedFiles, seed, signInAs, supabaseMock, table, uploads } from '../../test/supabaseMock';
import { renderPortal } from '../../test/renderPortal';

const asha = makeProfile('member', { id: 'asha', full_name: 'Asha Patil', member_code: 'RVF-0007', approval_status: 'approved' });

function renderMemberPage() {
  return renderPortal(
    <Routes>
      <Route path="/admin/members/:memberId" element={<MemberDetail backTo="/admin/members" />} />
      <Route path="/admin/members" element={<AdminMembers />} />
    </Routes>,
    { route: '/admin/members/asha' },
  );
}

function seedHistory() {
  seed('profiles', [asha]);
  seed('memberships', [{ id: 'ms1', member_id: 'asha', plan_title: 'Monthly', start_date: '2026-10-01', end_date: '2026-10-31', status: 'active' }]);
  seed('payments', [
    { id: 'p1', member_id: 'asha', plan_title: 'Monthly', total_amount: 1500, status: 'paid', payment_mode: 'cash', gst_invoice_no: 'RVF-2026-00001', created_at: '2026-10-01T10:00:00Z' },
  ]);
  seed('attendance', [{ id: 'a1', member_id: 'asha', check_in: '2026-10-02T06:00:00Z', method: 'qr' }]);
  seed('messages', [{ id: 'm1', sender_id: 'asha', recipient_id: 'coach', body: 'hi', created_at: '2026-10-02T06:00:00Z' }]);
  uploads().push(
    { bucket: 'avatars', path: 'asha/me.jpg', file: null },
    { bucket: 'progress-photos', path: 'asha/front.jpg', file: null },
    { bucket: 'attendance-selfies', path: 'asha/1.jpg', file: null },
    { bucket: 'avatars', path: 'ravi/me.jpg', file: null },
  );
}

describe('Deleting a member', () => {
  it('the owner deletes a member after typing their name; photos and data go, payments stay', async () => {
    seedHistory();
    signInAs(makeProfile('owner'));
    renderMemberPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /^delete member$/i }));
    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: /delete permanently/i });
    expect(confirm).toBeDisabled();

    await user.type(within(dialog).getByLabelText(/type the member's name/i), 'asha patil');
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    // Back on the members list with a confirmation.
    expect(await screen.findByRole('status')).toHaveTextContent(/Asha Patil was deleted\. 1 payment record was kept/);
    expect(supabaseMock.rpc).toHaveBeenCalledWith('delete_member', { p_member: 'asha' });

    expect(removedFiles()).toEqual(
      expect.arrayContaining([
        { bucket: 'avatars', path: 'asha/me.jpg' },
        { bucket: 'progress-photos', path: 'asha/front.jpg' },
        { bucket: 'attendance-selfies', path: 'asha/1.jpg' },
      ]),
    );
    expect(removedFiles()).not.toContainEqual({ bucket: 'avatars', path: 'ravi/me.jpg' });

    expect(table('profiles').find((p) => p.id === 'asha')).toBeUndefined();
    expect(table('memberships')).toHaveLength(0);
    expect(table('attendance')).toHaveLength(0);
    expect(table('messages')).toHaveLength(0);
    expect(table('payments')[0]).toMatchObject({ member_id: null, deleted_member_label: 'Deleted member · RVF-0007', gst_invoice_no: 'RVF-2026-00001' });
  });

  it('the wrong name keeps the delete button disabled', async () => {
    seedHistory();
    signInAs(makeProfile('super_admin'));
    renderMemberPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /^delete member$/i }));
    await user.type(screen.getByLabelText(/type the member's name/i), 'Asha');
    expect(screen.getByRole('button', { name: /delete permanently/i })).toBeDisabled();
    expect(supabaseMock.rpc).not.toHaveBeenCalledWith('delete_member', expect.anything());
  });

  it.each(['manager', 'receptionist', 'trainer'] as const)('a %s does not get the delete option', async (role) => {
    seedHistory();
    signInAs(makeProfile(role));
    renderMemberPage();
    await screen.findByRole('heading', { name: /asha patil/i });
    expect(screen.queryByRole('button', { name: /^delete member$/i })).not.toBeInTheDocument();
  });

  it('staff cannot be deleted from this page', async () => {
    seed('profiles', [makeProfile('trainer', { id: 'asha', full_name: 'Coach Asha' })]);
    signInAs(makeProfile('owner'));
    renderMemberPage();
    await screen.findByRole('heading', { name: /coach asha/i });
    expect(screen.queryByRole('button', { name: /^delete member$/i })).not.toBeInTheDocument();
  });

  it('a kept invoice shows "Deleted member" and the plan period', async () => {
    seed('payments', [
      {
        id: 'p9', member_id: null, member: null, deleted_member_label: 'Deleted member · RVF-0007', plan_title: 'Monthly', amount: 1500, tax_amount: 0,
        total_amount: 1500, discount_amount: 0, status: 'paid', payment_mode: 'cash', gst_invoice_no: 'RVF-2026-00009', paid_at: '2026-10-01T10:00:00Z',
        created_at: '2026-10-01T10:00:00Z', membership: null, period_start: '2026-10-01', period_end: '2026-10-31',
      },
    ]);
    signInAs(makeProfile('owner'));
    renderPortal(<Routes><Route path="/invoice/:paymentId" element={<InvoicePage />} /></Routes>, { route: '/invoice/p9' });
    expect(await screen.findByText('Deleted member · RVF-0007')).toBeInTheDocument();
    expect(screen.getByText(/1 Oct 2026 – 31 Oct 2026/)).toBeInTheDocument();
  });

  it('payerName falls back to the deleted label', () => {
    expect(payerName({ member: { full_name: 'Asha', phone: '', email: '', member_code: '' } as any, deleted_member_label: null })).toBe('Asha');
    expect(payerName({ member: null, deleted_member_label: 'Deleted member · RVF-1' })).toBe('Deleted member · RVF-1');
    expect(payerName({ member: null, deleted_member_label: null })).toBe('Member');
  });
});

import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { MemberDetail } from './MemberDetail';
import { makeProfile, seed, signInAs, supabaseMock, table } from '../../test/supabaseMock';
import { renderPortal } from '../../test/renderPortal';

const aayush = makeProfile('member', { id: 'aayush', full_name: 'Aayush Pujari', approval_status: 'approved' });
const bill = (id: string, invoice: string, title: string) => ({
  id, member_id: 'aayush', plan_title: title, amount: 2500, total_amount: 2500, amount_paid: 2500, status: 'paid', payment_mode: 'cash', gst_invoice_no: invoice, created_at: '2026-10-27T10:00:00Z',
});

async function openPayments() {
  seed('profiles', [aayush]);
  seed('payments', [bill('p14', 'RVF-2026-00014', 'Custom plan'), bill('p6', 'RVF-2026-00006', 'Three Months')]);
  seed('payment_receipts', [
    { id: 'r14', receipt_no: 'RCPT-2026-00014', payment_id: 'p14', member_id: 'aayush', amount: 2500, payment_mode: 'cash', received_at: '2026-10-27T07:55:00Z', payment: { plan_title: 'Custom plan' } },
  ]);
  renderPortal(<Routes><Route path="/admin/members/:memberId" element={<MemberDetail backTo="/admin/members" />} /></Routes>, { route: '/admin/members/aayush' });
  const user = userEvent.setup();
  await user.click(await screen.findByRole('tab', { name: /payments/i }));
  return user;
}

describe('Deleting a duplicate payment entry', () => {
  it('the owner deletes one entry with a reason; totals and receipts update', async () => {
    signInAs(makeProfile('owner'));
    const user = await openPayments();
    expect(await screen.findByLabelText(/payment totals/i)).toHaveTextContent(/Total paid₹5,000/);

    await user.click(screen.getByRole('button', { name: 'Delete payment RVF-2026-00014' }));
    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: /delete payment/i });
    expect(confirm).toBeDisabled(); // no reason yet

    await user.click(within(dialog).getByRole('button', { name: 'Same amount entered twice' }));
    expect(within(dialog).getByLabelText(/reason for deleting/i)).toHaveValue('Same amount entered twice');
    await user.click(confirm);

    expect(await screen.findByText(/Custom plan of ₹2,500 deleted\. Reason: Same amount entered twice/)).toBeInTheDocument();
    expect(supabaseMock.rpc).toHaveBeenCalledWith('cancel_payment', { p_payment: 'p14', p_reason: 'Same amount entered twice' });
    expect(screen.getByLabelText(/payment totals/i)).toHaveTextContent(/Total paid₹2,500/);
    expect(screen.getByText('Reason: Same amount entered twice')).toBeInTheDocument();
    expect(within(screen.getByLabelText(/money received/i)).getByText(/Deleted: Same amount entered twice/)).toBeInTheDocument();
    expect(table('payments').find((p) => p.id === 'p6')!.status).toBe('paid');
    expect(screen.queryByRole('button', { name: 'Delete payment RVF-2026-00014' })).not.toBeInTheDocument();
  });

  it('a typed reason works too', async () => {
    signInAs(makeProfile('super_admin'));
    const user = await openPayments();
    await user.click(await screen.findByRole('button', { name: 'Delete payment RVF-2026-00006' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/reason for deleting/i), 'Wrong member selected');
    await user.click(within(dialog).getByRole('button', { name: /delete payment/i }));
    expect(await screen.findByText(/Three Months of ₹2,500 deleted. Reason: Wrong member selected/)).toBeInTheDocument();
    expect(screen.getByText('Reason: Wrong member selected')).toBeInTheDocument();
  });

  it.each(['manager', 'receptionist', 'trainer'] as const)('a %s gets no delete button', async (role) => {
    signInAs(makeProfile(role));
    await openPayments();
    await screen.findByLabelText(/payment totals/i);
    expect(screen.queryByRole('button', { name: /delete payment/i })).not.toBeInTheDocument();
  });
});

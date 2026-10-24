import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { MemberDetail } from './MemberDetail';
import { ReceiptPage } from '../ReceiptPage';
import { PaymentHistory } from '../member/PaymentHistory';
import { paymentTotals } from '../../services/gym';
import { makeProfile, seed, signInAs, supabaseMock, table } from '../../test/supabaseMock';
import { renderPortal } from '../../test/renderPortal';

const aayush = makeProfile('member', { id: 'aayush', full_name: 'Aayush Pujari', member_code: 'RVF-0021', approval_status: 'approved' });
const dueBill = { id: 'b1', member_id: 'aayush', plan_title: 'Monthly', amount: 1500, total_amount: 1500, amount_paid: 0, discount_amount: 0, tax_amount: 0, status: 'pending', payment_mode: 'cash', gst_invoice_no: null, created_at: '2026-10-24T10:00:00Z' };

async function openPaymentsTab() {
  seed('profiles', [aayush]);
  renderPortal(
    <Routes>
      <Route path="/admin/members/:memberId" element={<MemberDetail backTo="/admin/members" />} />
    </Routes>,
    { route: '/admin/members/aayush' },
  );
  const user = userEvent.setup();
  await user.click(await screen.findByRole('tab', { name: /payments/i }));
  return user;
}

describe('Recording money received', () => {
  it('front desk takes a part payment with a note; totals show paid and remaining', async () => {
    seed('payments', [dueBill]);
    signInAs(makeProfile('receptionist'));
    const user = await openPaymentsTab();

    const totals = await screen.findByLabelText(/payment totals/i);
    expect(totals).toHaveTextContent(/Total billed₹1,500/);
    expect(totals).toHaveTextContent(/Remaining₹1,500/);

    await user.click(screen.getByRole('button', { name: /record payment received/i }));
    const dialog = screen.getByRole('dialog');
    const amount = within(dialog).getByLabelText(/amount received/i);
    expect(amount).toHaveValue(1500); // defaults to what is left
    await user.clear(amount);
    await user.type(amount, '1000');
    await user.click(within(dialog).getByText('UPI'));
    await user.type(within(dialog).getByLabelText(/^note$/i), 'Paid by brother');
    await user.click(within(dialog).getByRole('button', { name: /save & make receipt/i }));

    expect(await screen.findByText(/₹1,000 received from Aayush Pujari \(UPI\)\. Receipt RCPT-2026-\d+\. ₹500 still due/)).toBeInTheDocument();
    expect(supabaseMock.rpc).toHaveBeenCalledWith('record_payment', expect.objectContaining({ p_payment: 'b1', p_amount: 1000, p_mode: 'upi', p_note: 'Paid by brother' }));
    expect(screen.getByLabelText(/payment totals/i)).toHaveTextContent(/Total paid₹1,000/);
    expect(screen.getByLabelText(/payment totals/i)).toHaveTextContent(/Remaining₹500/);
    expect(screen.getByText(/part paid · ₹500 left/i)).toBeInTheDocument();
    expect(within(screen.getByLabelText(/money received/i)).getByText(/Paid by brother/)).toBeInTheDocument();
  });

  it('refuses more than what is left on the bill', async () => {
    seed('payments', [{ ...dueBill, amount_paid: 1000 }]);
    signInAs(makeProfile('owner'));
    const user = await openPaymentsTab();
    await user.click(await screen.findByRole('button', { name: /record payment received/i }));
    const dialog = screen.getByRole('dialog');
    const amount = within(dialog).getByLabelText(/amount received/i);
    await user.clear(amount);
    await user.type(amount, '800');
    await user.click(within(dialog).getByRole('button', { name: /save & make receipt/i }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/only ₹500 is left/i);
    expect(supabaseMock.rpc).not.toHaveBeenCalledWith('record_payment', expect.anything());
  });

  it('records other money (personal training) as its own paid bill', async () => {
    signInAs(makeProfile('owner'));
    const user = await openPaymentsTab();
    await user.click(await screen.findByRole('button', { name: /record payment received/i }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/what for/i), 'Personal training');
    await user.type(within(dialog).getByLabelText(/amount received/i), '2000');
    await user.click(within(dialog).getByRole('button', { name: /save & make receipt/i }));
    expect(await screen.findByText(/₹2,000 received from Aayush Pujari \(CASH\)/)).toBeInTheDocument();
    expect(supabaseMock.rpc).toHaveBeenCalledWith('record_payment', expect.objectContaining({ p_payment: null, p_member: 'aayush', p_title: 'Personal training', p_amount: 2000 }));
    expect(table('payments')[0]).toMatchObject({ plan_title: 'Personal training', status: 'paid' });
  });

  it('trainers see the totals but cannot record money', async () => {
    seed('payments', [dueBill]);
    signInAs(makeProfile('trainer'));
    await openPaymentsTab();
    expect(await screen.findByLabelText(/payment totals/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /record payment received/i })).not.toBeInTheDocument();
  });
});

describe('Receipt page', () => {
  it('shows the amount, note, who received it and what is still due', async () => {
    seed('payment_receipts', [
      {
        id: 'r1', receipt_no: 'RCPT-2026-00007', payment_id: 'b1', member_id: 'aayush', amount: 1000, payment_mode: 'upi', note: 'Paid by brother',
        received_by: 'desk', received_at: '2026-10-24T11:00:00Z',
        payment: { id: 'b1', plan_title: 'Monthly', total_amount: 1500, amount_paid: 1000, status: 'pending', gst_invoice_no: null, deleted_member_label: null },
        member: { full_name: 'Aayush Pujari', member_code: 'RVF-0021', phone: '9423512899', email: 'a@x.in' },
        staff: { full_name: 'Front Desk' },
      },
    ]);
    signInAs(makeProfile('owner'));
    renderPortal(<Routes><Route path="/receipt/:receiptId" element={<ReceiptPage />} /></Routes>, { route: '/receipt/r1' });
    const receipt = await screen.findByLabelText('Receipt');
    expect(receipt).toHaveTextContent('RCPT-2026-00007');
    expect(receipt).toHaveTextContent('Aayush Pujari');
    expect(receipt).toHaveTextContent(/Amount received₹1,000/);
    expect(within(screen.getByLabelText(/bill status/i)).getByText('₹500')).toBeInTheDocument();
    expect(receipt).toHaveTextContent('Note: Paid by brother');
    expect(receipt).toHaveTextContent('Received by: Front Desk');
    expect(screen.getByRole('button', { name: /download html/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print \/ save as pdf/i })).toBeInTheDocument();
  });
});

describe('Member sees their totals', () => {
  it('payments page shows billed, paid and remaining and the receipts', async () => {
    seed('payments', [{ ...dueBill, amount_paid: 1000 }, { ...dueBill, id: 'b0', status: 'paid', amount_paid: 1500, created_at: '2026-09-24T10:00:00Z' }]);
    seed('payment_receipts', [{ id: 'r1', receipt_no: 'RCPT-2026-00007', payment_id: 'b1', member_id: 'aayush', amount: 1000, payment_mode: 'upi', received_at: '2026-10-24T11:00:00Z', payment: { plan_title: 'Monthly' } }]);
    signInAs(aayush);
    renderPortal(<Routes><Route path="*" element={<PaymentHistory />} /></Routes>);
    const totals = await screen.findByLabelText(/payment totals/i);
    expect(totals).toHaveTextContent(/Total billed₹3,000/);
    expect(totals).toHaveTextContent(/Total paid₹2,500/);
    expect(totals).toHaveTextContent(/Remaining₹500/);
    expect(screen.getByRole('link', { name: /receipt RCPT-2026-00007/i })).toHaveAttribute('href', '/receipt/r1');
  });

  it('paymentTotals ignores failed bills', () => {
    expect(paymentTotals([
      { status: 'paid', total_amount: 1500, amount_paid: 0 },
      { status: 'pending', total_amount: 1500, amount_paid: 400 },
      { status: 'failed', total_amount: 999, amount_paid: 0 },
    ])).toEqual({ billed: 3000, paid: 1900, remaining: 1100 });
  });
});

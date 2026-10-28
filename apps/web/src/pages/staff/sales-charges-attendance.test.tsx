import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { MemberDetail } from './MemberDetail';
import { MemberAttendance } from '../member/MemberAttendance';
import { SupplementLog } from '../../components/supplements/SupplementLog';
import { makeProfile, seed, signInAs, supabaseMock, table } from '../../test/supabaseMock';
import { renderPortal } from '../../test/renderPortal';

const aayush = makeProfile('member', { id: 'aayush', full_name: 'Aayush Pujari', member_code: 'RVF-0021', approval_status: 'approved' });

afterEach(() => vi.restoreAllMocks());

async function openTab(name: RegExp) {
  seed('profiles', [aayush]);
  renderPortal(
    <Routes>
      <Route path="/admin/members/:memberId" element={<MemberDetail backTo="/admin/members" />} />
    </Routes>,
    { route: '/admin/members/aayush' },
  );
  const user = userEvent.setup();
  await user.click(await screen.findByRole('tab', { name }));
  return user;
}

async function fillSale(user: ReturnType<typeof userEvent.setup>, price: string) {
  await user.type(await screen.findByLabelText(/^supplement$/i), 'Whey protein');
  await user.type(screen.getByLabelText(/^brand$/i), 'MuscleBlaze');
  await user.click(screen.getByLabelText(/i bought this/i));
  await user.type(screen.getByLabelText(/^price/i), price);
}

describe('Supplement sold at the gym', () => {
  it('front desk sells a supplement paid by UPI: paid bill and receipt in Payments', async () => {
    signInAs(makeProfile('receptionist'));
    const user = await openTab(/supplements/i);
    await fillSale(user, '2499');
    expect(screen.getByText('The gym')).toBeInTheDocument();
    await user.click(screen.getByText('Paid UPI'));
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(await screen.findByText(/Sold for ₹2,499, paid by UPI\. Receipt RCPT-2026-\d+\./)).toBeInTheDocument();
    expect(supabaseMock.rpc).toHaveBeenCalledWith('sell_supplement', expect.objectContaining({ p_member: 'aayush', p_supplement: 'Whey protein', p_price: 2499, p_payment: 'upi', p_brand: 'MuscleBlaze' }));
    expect(await screen.findByRole('link', { name: /gym sale · view bill/i })).toBeInTheDocument();
    expect(table('payments')[0]).toMatchObject({ plan_title: 'Supplement: Whey protein (MuscleBlaze)', status: 'paid' });
  });

  it('pay later adds an amount due in Payments', async () => {
    signInAs(makeProfile('owner'));
    const user = await openTab(/supplements/i);
    await fillSale(user, '899');
    await user.click(screen.getByText('Pay later'));
    await user.click(screen.getByRole('button', { name: /^save$/i }));
    expect(await screen.findByText(/₹899 added as due in Payments/)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /payments/i }));
    expect(await screen.findByLabelText(/payment totals/i)).toHaveTextContent(/Remaining₹899/);
  });

  it('bought somewhere else is just a note (no gym bill)', async () => {
    signInAs(makeProfile('receptionist'));
    const user = await openTab(/supplements/i);
    await fillSale(user, '1500');
    await user.click(screen.getByText('Somewhere else'));
    await user.type(screen.getByLabelText(/^shop$/i), 'Amazon');
    await user.click(screen.getByRole('button', { name: /^save$/i }));
    expect(await screen.findByRole('listitem', { name: /whey protein on/i })).toHaveTextContent(/at Amazon/);
    expect(supabaseMock.rpc).not.toHaveBeenCalledWith('sell_supplement', expect.anything());
    expect(table('payments')).toHaveLength(0);
  });

  it('members and trainers do not get the payment option', async () => {
    signInAs(aayush);
    renderPortal(<Routes><Route path="*" element={<SupplementLog memberId="aayush" memberName="Aayush Pujari" />} /></Routes>);
    const user = userEvent.setup();
    await user.click(await screen.findByLabelText(/i bought this/i));
    expect(screen.queryByText('The gym')).not.toBeInTheDocument();
    expect(screen.queryByText('Pay later')).not.toBeInTheDocument();
  });
});

describe('Add amount due', () => {
  it('staff add an amount the member pays later; totals include it', async () => {
    signInAs(makeProfile('receptionist'));
    const user = await openTab(/payments/i);
    await user.click(await screen.findByRole('button', { name: /add amount due/i }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/what for/i), 'Locker (Nov)');
    await user.type(within(dialog).getByLabelText(/amount due/i), '300');
    await user.click(within(dialog).getByRole('button', { name: /add amount due/i }));

    expect(await screen.findByText(/₹300 added as due for Aayush Pujari \(Locker \(Nov\)\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/payment totals/i)).toHaveTextContent(/Remaining₹300/);
    expect(supabaseMock.rpc).toHaveBeenCalledWith('add_charge', { p_member: 'aayush', p_amount: 300, p_title: 'Locker (Nov)', p_note: null });
  });

  it('trainers cannot add an amount due', async () => {
    signInAs(makeProfile('trainer'));
    await openTab(/payments/i);
    await screen.findByLabelText(/payment totals/i);
    expect(screen.queryByRole('button', { name: /add amount due/i })).not.toBeInTheDocument();
  });
});

describe('Attendance calendar (no date limits)', () => {
  it('the member calendar loads the full history and can go back past 2023', async () => {
    seed('attendance', [
      { id: 'old', member_id: 'aayush', check_in: '2023-03-15T06:30:00.000Z', method: 'manual' },
      { id: 'older', member_id: 'aayush', check_in: '2019-06-01T06:30:00.000Z', method: 'manual' },
    ]);
    signInAs(aayush);
    renderPortal(<Routes><Route path="*" element={<MemberAttendance />} /></Routes>);
    const user = userEvent.setup();

    const calendar = await screen.findByLabelText(/attendance calendar/i);
    const year = within(calendar).getByLabelText('Year');
    await user.selectOptions(year, '2023');
    await user.selectOptions(within(calendar).getByLabelText('Month'), '2'); // March
    expect(await within(calendar).findByLabelText('Checked in on 2023-03-15')).toBeInTheDocument();

    await user.selectOptions(within(calendar).getByLabelText('Month'), '0');
    const prev = within(calendar).getByRole('button', { name: /previous month/i });
    expect(prev).toBeEnabled();
    await user.click(prev);
    expect(within(calendar).getByLabelText('Year')).toHaveValue('2022');

    await user.selectOptions(within(calendar).getByLabelText('Year'), '2019');
    await user.selectOptions(within(calendar).getByLabelText('Month'), '5');
    expect(await within(calendar).findByLabelText('Checked in on 2019-06-01')).toBeInTheDocument();
  });

  it('a trainer taps a past day to add a visit, and taps it again to remove it', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    signInAs(makeProfile('trainer'));
    const user = await openTab(/attendance/i);
    const calendar = await screen.findByLabelText(/attendance calendar/i);
    await user.selectOptions(within(calendar).getByLabelText('Year'), '2023');
    await user.selectOptions(within(calendar).getByLabelText('Month'), '2');

    await user.click(within(calendar).getByRole('button', { name: 'Add a visit on 2023-03-15' }));
    expect(await screen.findByText(/Visit added on 15 Mar 2023/)).toBeInTheDocument();
    expect(supabaseMock.rpc).toHaveBeenCalledWith('add_attendance_day', { p_member: 'aayush', p_day: '2023-03-15' });

    await user.click(await within(calendar).findByRole('button', { name: /checked in on 2023-03-15, tap to remove/i }));
    expect(await screen.findByText(/Visit on 15 Mar 2023 removed/)).toBeInTheDocument();
    expect(table('attendance')).toHaveLength(0);
  });

  it('members cannot add visits on their own calendar', async () => {
    signInAs(aayush);
    renderPortal(<Routes><Route path="*" element={<MemberAttendance />} /></Routes>);
    const calendar = await screen.findByLabelText(/attendance calendar/i);
    expect(within(calendar).queryByRole('button', { name: /add a visit/i })).not.toBeInTheDocument();
  });
});

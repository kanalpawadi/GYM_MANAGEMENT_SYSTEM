import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { AdminCalendar } from './AdminCalendar';
import { localDay } from '../../services/gym';
import { dayTotals, emptyDay, monthRange } from '../../services/calendar';
import { makeProfile, seed, signInAs } from '../../test/supabaseMock';
import { renderPortal } from '../../test/renderPortal';

const now = new Date();
const y = now.getFullYear();
const m = now.getMonth();
const todayNum = now.getDate();
const otherNum = todayNum === 1 ? 2 : 1;
const at = (day: number, hour: number) => new Date(y, m, day, hour, 15).toISOString();
const key = (day: number) => localDay(new Date(y, m, day, 12));

const aayush = makeProfile('member', { id: 'aayush', full_name: 'Aayush Pujari', member_code: 'RV-0001', created_at: at(todayNum, 9), approval_status: 'pending' });
const riya = makeProfile('member', { id: 'riya', full_name: 'Riya Patil', member_code: 'RV-0002', created_at: '2020-01-01T00:00:00.000Z' });
const desk = makeProfile('receptionist', { id: 'desk', full_name: 'Desk Staff' });

function seedGym() {
  seed('profiles', [aayush, riya, desk]);
  seed('payment_receipts', [
    { id: 'r1', receipt_no: 'RCPT-1', payment_id: 'p1', member_id: 'aayush', amount: 1300, payment_mode: 'cash', received_by: 'desk', received_at: at(todayNum, 10) },
    { id: 'r2', receipt_no: 'RCPT-2', payment_id: 'p2', member_id: 'riya', amount: 500, payment_mode: 'upi', received_by: 'desk', received_at: at(todayNum, 11) },
    { id: 'r3', receipt_no: 'RCPT-3', payment_id: 'p3', member_id: 'riya', amount: 9999, payment_mode: 'cash', received_by: 'desk', received_at: at(todayNum, 12), voided_at: at(todayNum, 13) },
    { id: 'r4', receipt_no: 'RCPT-4', payment_id: 'p4', member_id: 'riya', amount: 700, payment_mode: 'upi', received_by: 'desk', received_at: at(otherNum, 10) },
  ]);
  seed('supplement_logs', [{ id: 's1', member_id: 'riya', taken_on: key(todayNum), supplement: 'Whey Protein', brand: 'ON', quantity: '1 kg', price: 2400 }]);
  seed('attendance', [
    { id: 'a1', member_id: 'aayush', check_in: at(todayNum, 7), method: 'qr' },
    { id: 'a2', member_id: 'riya', check_in: at(todayNum, 8), method: 'manual' },
    { id: 'a3', member_id: 'riya', check_in: at(otherNum, 8), method: 'manual' },
  ]);
}

describe('Admin calendar', () => {
  it('shows everything that happened today', async () => {
    seedGym();
    signInAs(makeProfile('owner'));
    renderPortal(<Routes><Route path="*" element={<AdminCalendar />} /></Routes>);

    const details = screen.getByLabelText('Day details');
    const money = within(details).getByLabelText('Amount received');
    expect(await within(money).findByText('Aayush Pujari')).toBeInTheDocument();
    expect(money).toHaveTextContent('₹1,800');
    expect(money).toHaveTextContent('Cash ₹1,300');
    expect(money).toHaveTextContent('UPI ₹500');
    expect(money).not.toHaveTextContent('9,999'); // voided receipt left out

    expect(within(details).getByLabelText('New members')).toHaveTextContent('Aayush Pujari');
    expect(within(details).getByLabelText('New members')).not.toHaveTextContent('Riya Patil');
    expect(within(details).getByLabelText('Supplements')).toHaveTextContent('Whey Protein');
    expect(within(details).getByLabelText('Supplements')).toHaveTextContent('₹2,400');
    expect(within(details).getByLabelText('Attendance')).toHaveTextContent('Attendance (2)');
  });

  it('opens another day when it is tapped', async () => {
    seedGym();
    signInAs(makeProfile('owner'));
    renderPortal(<Routes><Route path="*" element={<AdminCalendar />} /></Routes>);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: new RegExp(`^${key(otherNum)}: 0 new, ₹700 received`) }));

    const details = screen.getByLabelText('Day details');
    expect(within(details).getByLabelText('Amount received')).toHaveTextContent('Riya Patil');
    expect(within(details).getByLabelText('Amount received')).toHaveTextContent('₹700');
    expect(within(details).getByLabelText('New members')).toHaveTextContent('Nothing on this day.');
    expect(within(details).getByLabelText('Attendance')).toHaveTextContent('Attendance (1)');
  });
});

describe('calendar helpers', () => {
  it('splits cash and UPI and counts each visitor once', () => {
    const d = emptyDay();
    d.receipts.push({ id: '1', receipt_no: 'a', amount: 100, mode: 'cash', note: null, member: 'A', member_code: 'A', received_by: '', at: '' });
    d.receipts.push({ id: '2', receipt_no: 'b', amount: 50, mode: 'upi', note: null, member: 'B', member_code: 'B', received_by: '', at: '' });
    d.visits.push({ id: '1', member: 'A', member_code: 'A', method: 'qr', at: '' }, { id: '2', member: 'A', member_code: 'A', method: 'qr', at: '' });
    expect(dayTotals(d)).toMatchObject({ received: 150, cash: 100, upi: 50, visits: 1 });
  });

  it('covers the whole month', () => {
    expect(monthRange(2026, 1)).toMatchObject({ firstDay: '2026-02-01', lastDay: '2026-02-28' });
  });
});

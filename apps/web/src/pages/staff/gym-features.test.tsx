import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { MembershipCheckout } from '../member/MembershipCheckout';
import { PaymentHistory } from '../member/PaymentHistory';
import { DigitalCard } from '../member/DigitalCard';
import { MemberAttendance } from '../member/MemberAttendance';
import { MemberDashboard } from '../member/MemberDashboard';
import { AdminRequests } from '../admin/AdminRequests';
import { AdminSettings } from '../admin/AdminSettings';
import { AdminContent } from '../admin/AdminContent';
import { AdminDashboard } from '../admin/AdminDashboard';
import { AdminMembers } from '../admin/AdminMembers';
import { InvoicePage } from '../InvoicePage';
import { AttendanceScanner } from './AttendanceScanner';
import { MemberDetail } from './MemberDetail';
import { Login } from '../auth/Login';
import { makeProfile, seed, signInAs, supabaseMock, table } from '../../test/supabaseMock';
import { renderPortal } from '../../test/renderPortal';

const coach = makeProfile('trainer', { id: 'coach-1', full_name: 'Coach Arjun' });
const asha = makeProfile('member', { id: 'asha', full_name: 'Asha Patil', member_code: 'RVF-0007', assigned_trainer_id: 'coach-1' });
const page = (el: React.ReactElement, route = '/') => renderPortal(<Routes><Route path="*" element={el} /></Routes>, { route });

describe('Plan renewal / change requests', () => {
  it('a member requests a plan at the discounted price and sees it pending', async () => {
    seed('settings', [{ key: 'discount', value: { enabled: true, percent: 10, label: 'Monsoon offer' } }]);
    signInAs(asha);
    page(<MembershipCheckout />);
    const user = userEvent.setup();

    expect(await screen.findByText(/Monsoon offer: 10% off all plans/i)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /yearly/i }));
    await user.click(screen.getByRole('radio', { name: /pay online/i }));
    await user.click(screen.getByRole('button', { name: /send renewal request/i }));

    expect(await screen.findByText(/request sent/i)).toBeInTheDocument();
    expect(table('plan_requests')[0]).toMatchObject({ member_id: 'asha', plan_code: 'yearly', price: 10800, payment_preference: 'online', status: 'pending' });
    expect(screen.getByLabelText('Pending request')).toHaveTextContent(/waiting for approval: yearly/i);
  });

  it('the owner approves a request as paid in cash and an invoice is created', async () => {
    seed('profiles', [asha]);
    seed('plan_requests', [
      { id: 'r1', member_id: 'asha', plan_code: 'monthly', plan_title: 'Monthly', months: 1, base_price: 1500, price: 1500, request_type: 'renew', payment_preference: 'desk', status: 'pending', created_at: '2026-10-20T10:00:00Z', member: { full_name: 'Asha Patil' } },
    ]);
    signInAs(makeProfile('owner'));
    page(<AdminRequests />);
    const user = userEvent.setup();

    const card = await screen.findByLabelText(/request from asha patil/i);
    await user.click(within(card).getByRole('button', { name: /approve · paid cash/i }));

    expect(await screen.findByText(/monthly plan approved and marked paid \(CASH\)/i)).toBeInTheDocument();
    expect(table('memberships')).toHaveLength(1);
    expect(table('payments')[0]).toMatchObject({ status: 'paid', payment_mode: 'cash', total_amount: 1500 });
    expect(supabaseMock.rpc).toHaveBeenCalledWith('decide_plan_request', expect.objectContaining({ p_request: 'r1', p_approve: true, p_mark_paid: true, p_mode: 'cash' }));
  });

  it('the owner can decline with a note', async () => {
    seed('plan_requests', [
      { id: 'r2', member_id: 'asha', plan_code: 'yearly', plan_title: 'Yearly', months: 12, base_price: 12000, price: 12000, request_type: 'change', payment_preference: 'desk', status: 'pending', created_at: '2026-10-20T10:00:00Z', member: { full_name: 'Asha Patil' } },
    ]);
    signInAs(makeProfile('owner'));
    page(<AdminRequests />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/note for asha patil/i), 'Please clear dues first');
    await user.click(screen.getByRole('button', { name: /decline/i }));
    expect(await screen.findByText(/declined/i)).toBeInTheDocument();
    expect(table('plan_requests')[0]).toMatchObject({ status: 'rejected', note: 'Please clear dues first' });
  });
});

describe('Invoices', () => {
  const payment = {
    id: 'p1', member_id: 'asha', plan_title: 'Six Month', amount: 6750, tax_amount: 0, total_amount: 6750, discount_amount: 750,
    payment_mode: 'upi', status: 'paid', gst_invoice_no: 'RVF-2026-00012', paid_at: '2026-10-20T10:00:00Z', created_at: '2026-10-20T10:00:00Z',
    member: { full_name: 'Asha Patil', phone: '9822012345', email: 'asha@example.com', member_code: 'RVF-0007' },
    membership: { start_date: '2026-10-20', end_date: '2027-04-19' },
  };

  it('lists the member\'s payments with a link to each invoice', async () => {
    seed('payments', [payment]);
    signInAs(asha);
    page(<PaymentHistory />);
    expect(await screen.findByText('RVF-2026-00012')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view \/ pdf/i })).toHaveAttribute('href', '/invoice/p1');
  });

  it('renders a printable invoice with discount, total and PDF / HTML buttons', async () => {
    seed('payments', [payment]);
    signInAs(asha);
    renderPortal(<Routes><Route path="/invoice/:paymentId" element={<InvoicePage />} /></Routes>, { route: '/invoice/p1' });
    const inv = await screen.findByLabelText('Invoice');
    expect(within(inv).getByText('RVF-2026-00012')).toBeInTheDocument();
    expect(within(inv).getByText('Asha Patil')).toBeInTheDocument();
    expect(within(inv).getByText('−₹750')).toBeInTheDocument();
    expect(within(inv).getAllByText('₹6,750').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /print \/ save as pdf/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download html/i })).toBeInTheDocument();
  });
});

describe('Attendance', () => {
  it('shows a rotating QR pass with the member code', async () => {
    signInAs(asha);
    page(<DigitalCard />);
    expect(await screen.findByText('RVF-0007')).toBeInTheDocument();
    expect(supabaseMock.rpc).toHaveBeenCalledWith('my_qr_token');
    expect(screen.getByText(/new code in \d+s/i)).toBeInTheDocument();
  });

  it('a trainer checks a member in from the scanner by name', async () => {
    seed('profiles', [asha]);
    signInAs(coach);
    page(<AttendanceScanner />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/find member/i), 'asha');
    await user.click(await screen.findByRole('button', { name: /check in asha patil/i }));
    expect(await screen.findByText('Asha Patil checked in.')).toBeInTheDocument();
    expect(table('attendance')[0]).toMatchObject({ member_id: 'asha', method: 'manual', verified_by: 'coach-1' });
  });

  it('hides selfie check-in while geofencing is off', async () => {
    signInAs(asha);
    page(<MemberAttendance />);
    expect(await screen.findByRole('button', { name: /show qr to a trainer/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /selfie check-in/i })).not.toBeInTheDocument();
  });

  it('offers selfie check-in when geofencing is on', async () => {
    seed('settings', [{ key: 'geofence', value: { enabled: true, lat: 16.69, lng: 74.6, radius_m: 100 } }]);
    signInAs(asha);
    page(<MemberAttendance />);
    expect(await screen.findByRole('button', { name: /selfie check-in/i })).toBeInTheDocument();
  });

  it('shows real check-ins on the calendar', async () => {
    seed('attendance', [{ id: 'a1', member_id: 'asha', check_in: new Date().toISOString(), method: 'qr' }]);
    signInAs(asha);
    page(<MemberAttendance />);
    expect(await screen.findByText(/you are checked in for today/i)).toBeInTheDocument();
  });
});

describe('Gym settings', () => {
  it('the owner turns on the discount', async () => {
    signInAs(makeProfile('owner'));
    page(<AdminSettings />);
    const user = userEvent.setup();
    const card = await screen.findByLabelText('Discount');
    const pct = within(card).getByLabelText(/discount %/i);
    await user.clear(pct);
    await user.type(pct, '15');
    await user.click(within(card).getByRole('switch', { name: /discount on or off/i }));
    expect(await screen.findByText(/discount on: 15% off all plans/i)).toBeInTheDocument();
    expect(table('settings').find((r) => r.key === 'discount')?.value).toMatchObject({ enabled: true, percent: 15 });
  });

  it('will not turn on geofencing without a gym location', async () => {
    signInAs(makeProfile('owner'));
    page(<AdminSettings />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('switch', { name: /geofencing on or off/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/set the gym location first/i);
  });

  it('only the super admin can change the website approval rule', async () => {
    signInAs(makeProfile('owner'));
    const { unmount } = page(<AdminSettings />);
    expect(await screen.findByRole('switch', { name: /website change approval/i })).toBeDisabled();
    unmount();
    signInAs(makeProfile('super_admin'));
    page(<AdminSettings />);
    const user = userEvent.setup();
    const toggle = await screen.findByRole('switch', { name: /website change approval/i });
    expect(toggle).toBeEnabled();
    await user.click(toggle);
    expect(await screen.findByText(/owner changes now need your approval/i)).toBeInTheDocument();
  });
});

describe('Website editing by the owner', () => {
  it('owner edits go live directly when approval is off', async () => {
    signInAs(makeProfile('owner'));
    page(<AdminContent />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Short name'), ' Gym');
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(await screen.findByText(/gym details saved/i)).toBeInTheDocument();
    expect(table('site_content').find((r) => r.key === 'site')).toBeTruthy();
  });

  it('owner edits wait for the super admin when approval is on', async () => {
    seed('settings', [{ key: 'content_approval', value: { required: true } }]);
    const owner = makeProfile('owner');
    signInAs(owner);
    page(<AdminContent />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Short name'), ' Gym');
    await user.click(await screen.findByRole('button', { name: /submit for approval/i }));
    expect(await screen.findByText(/sent to the super admin for approval/i)).toBeInTheDocument();
    expect(table('site_content')).toHaveLength(0);
    expect(table('site_content_drafts')[0]).toMatchObject({ key: 'site', status: 'pending', submitted_by: owner.id });
  });

  it('the super admin approves the owner\'s change', async () => {
    seed('site_content_drafts', [{ id: 'd1', key: 'site', value: { name: 'RV Fitness Gym' }, status: 'pending', submitted_by: 'owner-uid', created_at: '2026-10-20T10:00:00Z' }]);
    signInAs(makeProfile('super_admin'));
    page(<AdminContent />);
    const user = userEvent.setup();
    const panel = await screen.findByLabelText(/changes waiting for approval/i);
    await user.click(within(panel).getByRole('button', { name: /^approve$/i }));
    expect(await screen.findByText(/change approved and published/i)).toBeInTheDocument();
    expect(table('site_content').find((r) => r.key === 'site')?.value).toEqual({ name: 'RV Fitness Gym' });
  });
});

describe('Member page for staff and trainers (role chain)', () => {
  it('a trainer opens a member and edits their details', async () => {
    seed('profiles', [asha]);
    signInAs(coach);
    renderPortal(<Routes><Route path="/trainer/members/:memberId" element={<MemberDetail backTo="/trainer/dashboard" />} /></Routes>, { route: '/trainer/members/asha' });
    const user = userEvent.setup();
    expect(await screen.findByRole('heading', { name: /asha patil/i })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Profile' }));
    await user.type(screen.getByLabelText(/weight/i), '64');
    await user.click(screen.getByRole('button', { name: /save details/i }));
    expect(await screen.findByText(/details saved/i)).toBeInTheDocument();
    expect(table('profiles').find((p) => p.id === 'asha')?.weight_kg).toBe(64);
  });

  it('a trainer cannot open an owner\'s page', async () => {
    seed('profiles', [makeProfile('owner', { id: 'boss' })]);
    signInAs(coach);
    renderPortal(<Routes><Route path="/trainer/members/:memberId" element={<MemberDetail backTo="/trainer/dashboard" />} /></Routes>, { route: '/trainer/members/boss' });
    expect(await screen.findByText(/do not have access/i)).toBeInTheDocument();
  });

  it('the owner makes a member premium', async () => {
    seed('profiles', [asha]);
    signInAs(makeProfile('owner'));
    renderPortal(<Routes><Route path="/admin/members/:memberId" element={<MemberDetail backTo="/admin/members" />} /></Routes>, { route: '/admin/members/asha' });
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText(/member type/i), 'premium');
    expect(await screen.findByText(/member type changed to premium/i)).toBeInTheDocument();
    expect(table('profiles').find((p) => p.id === 'asha')?.membership_tier).toBe('premium');
  });
});

describe('Admin screens use real data', () => {
  it('members list splits premium and normal members', async () => {
    seed('profiles', [asha, makeProfile('member', { id: 'ravi', full_name: 'Ravi Kale', membership_tier: 'premium' })]);
    signInAs(makeProfile('owner'));
    page(<AdminMembers />);
    const user = userEvent.setup();
    expect(await screen.findByText('Asha Patil')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /premium \(1\)/i }));
    expect(screen.queryByText('Asha Patil')).not.toBeInTheDocument();
    expect(screen.getByText('Ravi Kale')).toBeInTheDocument();
  });

  it('the dashboard counts pending requests and today\'s check-ins', async () => {
    seed('profiles', [asha]);
    seed('plan_requests', [{ id: 'r1', member_id: 'asha', status: 'pending', created_at: '2026-10-20T10:00:00Z' }]);
    seed('attendance', [{ id: 'a1', member_id: 'asha', check_in: new Date().toISOString(), method: 'qr' }]);
    signInAs(makeProfile('owner'));
    page(<AdminDashboard />);
    expect(await screen.findByLabelText('Pending requests')).toHaveTextContent('1');
    expect(screen.getByLabelText("Today's check-ins")).toHaveTextContent('1');
  });
});

describe('Daily plan pop-up', () => {
  it('shows today\'s meals and lets the member log water', async () => {
    seed('diet_plans', [{ id: 'd1', member_id: 'asha', title: 'Lean Bulk', meals: [{ name: 'Breakfast', time: '8:00 AM', items: 'Oats and eggs' }], is_active: true, created_at: '2026-10-01' }]);
    signInAs(asha);
    page(<MemberDashboard />);
    const user = userEvent.setup();
    const popup = await screen.findByRole('dialog', { name: /today/i });
    expect(within(popup).getByText('Oats and eggs')).toBeInTheDocument();
    await user.click(within(popup).getByRole('button', { name: /add a glass/i }));
    expect(within(popup).getByText(/water: 1 \/ 8 glasses/i)).toBeInTheDocument();
    expect(table('water_logs')[0]).toMatchObject({ member_id: 'asha', glasses: 1 });
  });

  it('shows the gym\'s common plan to a normal member without a personal plan', async () => {
    seed('diet_plans', [{ id: 'c1', member_id: null, is_common: true, title: 'Common Plan', meals: [{ name: 'Lunch', time: '1 PM', items: 'Dal rice' }], is_active: true, created_at: '2026-10-01' }]);
    signInAs(asha);
    page(<MemberDashboard />);
    const popup = await screen.findByRole('dialog', { name: /today/i });
    expect(within(popup).getByText('Dal rice')).toBeInTheDocument();
  });
});

describe('Google sign-in', () => {
  it('starts Google sign-in from the login page', async () => {
    page(<Login />, '/login');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /continue with google/i }));
    expect(supabaseMock.auth.signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ provider: 'google' }));
  });
});


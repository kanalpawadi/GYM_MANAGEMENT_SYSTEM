import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { AdminPlans } from './AdminPlans';
import { Plans } from '../public/Plans';
import { MemberDetail } from '../staff/MemberDetail';
import { planCode } from '../../services/plans';
import { makeProfile, seed, signInAs, supabaseMock, table } from '../../test/supabaseMock';
import { renderPortal } from '../../test/renderPortal';

const aayush = makeProfile('member', { id: 'aayush', full_name: 'Aayush Pujari', approval_status: 'approved', membership_tier: 'premium' });
const dbPlans = [
  { code: 'monthly', title: 'Monthly', months: 1, price: 1300, description: 'Owner price', features: ['Full gym access'], badge: null, highlight: false, sort: 1, active: true },
  { code: 'three-months', title: 'Three Months', months: 3, price: 2500, description: null, features: [], badge: 'New', highlight: true, sort: 2, active: true },
  { code: 'yearly', title: 'Yearly', months: 12, price: 12000, description: null, features: [], badge: null, highlight: false, sort: 3, active: false },
];

afterEach(() => vi.restoreAllMocks());

describe('Owner manages subscription plans', () => {
  it('lists active and removed plans', async () => {
    seed('subscription_plans', dbPlans);
    signInAs(makeProfile('owner'));
    renderPortal(<Routes><Route path="*" element={<AdminPlans />} /></Routes>);
    expect(await screen.findByLabelText('Plan Three Months')).toHaveTextContent('₹2,500');
    expect(within(screen.getByLabelText(/removed plans/i)).getByText(/Yearly/)).toBeInTheDocument();
  });

  it('adds a new plan with a simple code', async () => {
    seed('subscription_plans', dbPlans);
    signInAs(makeProfile('owner'));
    renderPortal(<Routes><Route path="*" element={<AdminPlans />} /></Routes>);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /^add plan$/i }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/plan name/i), 'Student Monthly');
    const price = within(dialog).getByLabelText(/price/i);
    await user.clear(price);
    await user.type(price, '999');
    await user.type(within(dialog).getByLabelText(/features/i), 'Full gym access{Enter}Valid college ID');
    await user.click(within(dialog).getByRole('button', { name: /^add plan$/i }));

    expect(await screen.findByText(/Student Monthly added/)).toBeInTheDocument();
    expect(table('subscription_plans').find((p) => p.code === 'student-monthly')).toMatchObject({ title: 'Student Monthly', price: 999, months: 1, features: ['Full gym access', 'Valid college ID'], active: true });
  });

  it('changes a price, removes and restores a plan', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    seed('subscription_plans', dbPlans);
    signInAs(makeProfile('super_admin'));
    renderPortal(<Routes><Route path="*" element={<AdminPlans />} /></Routes>);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Edit Monthly' }));
    const price = within(screen.getByRole('dialog')).getByLabelText(/price/i);
    await user.clear(price);
    await user.type(price, '1400');
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(await screen.findByText('Monthly updated.')).toBeInTheDocument();
    expect(table('subscription_plans').find((p) => p.code === 'monthly')!.price).toBe(1400);

    await user.click(screen.getByRole('button', { name: 'Remove Three Months' }));
    expect(await screen.findByText('Three Months removed.')).toBeInTheDocument();
    expect(table('subscription_plans').find((p) => p.code === 'three-months')!.active).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Restore Yearly' }));
    expect(await screen.findByText('Yearly restored.')).toBeInTheDocument();
  });

  it('the public Plans page shows the owner’s plans and prices', async () => {
    seed('subscription_plans', dbPlans);
    renderPortal(<Routes><Route path="*" element={<Plans />} /></Routes>);
    expect((await screen.findAllByText('Three Months', {}, { timeout: 3000 })).length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹1,300').length).toBeGreaterThan(0);
    expect(screen.queryByText('Yearly')).not.toBeInTheDocument();
  });

  it('plan codes are simple', () => {
    expect(planCode('Three Months')).toBe('three-months');
    expect(planCode('  Student / Monthly!! ')).toBe('student-monthly');
  });
});

function memberPage() {
  seed('profiles', [aayush]);
  renderPortal(<Routes><Route path="/admin/members/:memberId" element={<MemberDetail backTo="/admin/members" />} /></Routes>, { route: '/admin/members/aayush' });
  return userEvent.setup();
}

describe('Deleting a supplement sale cancels its bill', () => {
  it('front desk deletes it; the bill shows Cancelled and leaves the totals', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    seed('payments', [{ id: 'b1', member_id: 'aayush', plan_title: 'Supplement: Whey', amount: 2499, total_amount: 2499, amount_paid: 0, status: 'pending', payment_mode: 'cash', created_at: '2026-10-27T10:00:00Z' }]);
    seed('supplement_logs', [{ id: 's1', member_id: 'aayush', taken_on: '2026-10-27', supplement: 'Whey', price: 2499, payment_id: 'b1', created_at: '2026-10-27T10:00:00Z' }]);
    signInAs(makeProfile('receptionist'));
    const user = memberPage();

    await user.click(await screen.findByRole('tab', { name: /supplements/i }));
    await user.click(await screen.findByRole('button', { name: /delete whey on/i }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringMatching(/bill will be cancelled too/));
    expect(await screen.findByText(/Whey deleted and its bill cancelled/)).toBeInTheDocument();
    expect(supabaseMock.rpc).toHaveBeenCalledWith('delete_supplement', { p_log: 's1' });

    await user.click(screen.getByRole('tab', { name: /payments/i }));
    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
    expect(screen.getByLabelText(/payment totals/i)).toHaveTextContent(/Total billed₹0/);
  });

  it('a member cannot delete a gym sale entry', async () => {
    seed('supplement_logs', [{ id: 's1', member_id: 'aayush', taken_on: '2026-10-27', supplement: 'Whey', price: 2499, payment_id: 'b1', created_at: '2026-10-27T10:00:00Z' }]);
    signInAs(aayush);
    const { SupplementLog } = await import('../../components/supplements/SupplementLog');
    renderPortal(<Routes><Route path="*" element={<SupplementLog memberId="aayush" />} /></Routes>);
    await screen.findByRole('listitem', { name: /whey on/i });
    expect(screen.queryByRole('button', { name: /delete whey/i })).not.toBeInTheDocument();
  });
});

describe('Deleting a personal plan falls back to the common plan', () => {
  it('trainer deletes the personal workout plan; the member follows the common plan', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    seed('workout_plans', [
      { id: 'w-common', member_id: null, is_common: true, is_active: true, title: 'Common Strength Plan', schedule: [], created_at: '2026-10-01T00:00:00Z' },
      { id: 'w-own', member_id: 'aayush', is_common: false, is_active: true, title: 'Aayush Cut Plan', schedule: [{ day: 'Mon', exercises: 'Squats' }], created_at: '2026-10-20T00:00:00Z' },
    ]);
    signInAs(makeProfile('trainer'));
    const user = memberPage();
    await user.click(await screen.findByRole('tab', { name: /diet & workout/i }));
    expect(await screen.findByText('Aayush Cut Plan')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /delete plan/i })[0]);
    expect(await screen.findByText(/Personal workout plan deleted\. Aayush Pujari now follows the common workout plan/)).toBeInTheDocument();
    expect(await screen.findByText(/Following the common plan: Common Strength Plan/)).toBeInTheDocument();
    expect(table('workout_plans').find((w) => w.id === 'w-own')!.is_active).toBe(false);

    const { getActivePlans } = await import('../../services/portal');
    signInAs(aayush);
    const plans = await getActivePlans('aayush');
    expect(plans.workout?.title).toBe('Common Strength Plan');
    expect(plans.workoutIsCommon).toBe(true);
  });
});

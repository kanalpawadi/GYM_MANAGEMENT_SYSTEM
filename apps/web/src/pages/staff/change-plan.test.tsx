import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { MemberDetail } from './MemberDetail';
import { makeProfile, seed, signInAs, supabaseMock, table } from '../../test/supabaseMock';
import { renderPortal } from '../../test/renderPortal';

const dinesh = makeProfile('member', { id: 'dinesh', full_name: 'Dinesh Sanmure', member_code: 'RVF-0030', approval_status: 'approved' });

function renderMember() {
  seed('profiles', [dinesh]);
  return renderPortal(
    <Routes>
      <Route path="/admin/members/:memberId" element={<MemberDetail backTo="/admin/members" />} />
    </Routes>,
    { route: '/admin/members/dinesh' },
  );
}

async function openForm() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: /change plan/i }));
  return { user, dialog: screen.getByRole('dialog') };
}

describe('Change plan on the member page', () => {
  it('a trainer gives a standard plan at the standard price, paid cash', async () => {
    signInAs(makeProfile('trainer'));
    renderMember();
    const { user, dialog } = await openForm();

    // Trainers can't type an amount or make a custom plan.
    expect(within(dialog).getByLabelText(/^amount/i)).toHaveAttribute('readonly');
    expect(within(dialog).queryByRole('radio', { name: /custom plan/i })).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole('radio', { name: /six month/i }));
    expect(within(dialog).getByLabelText(/^amount/i)).toHaveValue(7500);
    await user.click(within(dialog).getByRole('button', { name: /save plan/i }));

    expect(await screen.findByText(/Dinesh Sanmure: Six Month plan, .* ₹7,500 paid by CASH/)).toBeInTheDocument();
    expect(supabaseMock.rpc).toHaveBeenCalledWith('assign_membership', expect.objectContaining({ p_member: 'dinesh', p_plan_code: 'six-month', p_payment: 'cash', p_price: null }));
    expect(table('memberships')[0]).toMatchObject({ plan_title: 'Six Month', status: 'active' });
  });

  it('the owner creates a custom monthly plan with their own amount, payment due', async () => {
    signInAs(makeProfile('owner'));
    renderMember();
    const { user, dialog } = await openForm();

    await user.click(within(dialog).getByRole('radio', { name: /custom plan/i }));
    await user.type(within(dialog).getByLabelText(/plan name/i), 'Student monthly');
    await user.type(within(dialog).getByLabelText(/^amount/i), '999');
    await user.click(within(dialog).getByText('Payment due'));
    await user.type(within(dialog).getByLabelText(/note/i), 'College ID shown');
    await user.click(within(dialog).getByRole('button', { name: /save plan/i }));

    expect(await screen.findByText(/Student monthly plan, .* ₹999 \(payment due\)/)).toBeInTheDocument();
    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      'assign_membership',
      expect.objectContaining({ p_plan_code: 'custom', p_price: 999, p_title: 'Student monthly', p_months: 1, p_days: null, p_payment: 'due', p_note: 'College ID shown' }),
    );
    expect(table('payments')[0]).toMatchObject({ status: 'pending', total_amount: 999 });
  });

  it('the owner can give a standard plan at a custom amount', async () => {
    signInAs(makeProfile('super_admin'));
    renderMember();
    const { user, dialog } = await openForm();
    const amount = within(dialog).getByLabelText(/^amount/i);
    await user.clear(amount);
    await user.type(amount, '1200');
    await user.click(within(dialog).getByRole('button', { name: /save plan/i }));
    expect(await screen.findByText(/Monthly plan, .* ₹1,200 paid by CASH/)).toBeInTheDocument();
    expect(supabaseMock.rpc).toHaveBeenCalledWith('assign_membership', expect.objectContaining({ p_plan_code: 'monthly', p_price: 1200 }));
  });

  it('a custom plan can last a number of days', async () => {
    signInAs(makeProfile('owner'));
    renderMember();
    const { user, dialog } = await openForm();
    await user.click(within(dialog).getByRole('radio', { name: /custom plan/i }));
    await user.type(within(dialog).getByLabelText(/^amount/i), '500');
    const lasts = within(dialog).getByLabelText(/^lasts$/i);
    await user.clear(lasts);
    await user.type(lasts, '15');
    await user.selectOptions(within(dialog).getByLabelText(/length unit/i), 'days');
    await user.click(within(dialog).getByRole('button', { name: /save plan/i }));
    expect(await screen.findByText(/Custom plan plan/)).toBeInTheDocument();
    expect(supabaseMock.rpc).toHaveBeenCalledWith('assign_membership', expect.objectContaining({ p_days: 15, p_months: null }));
  });

  it('warns when the new plan replaces the current one', async () => {
    const today = new Date().toLocaleDateString('en-CA');
    const later = new Date(Date.now() + 20 * 86400000).toLocaleDateString('en-CA');
    seed('memberships', [{ id: 'ms0', member_id: 'dinesh', plan_code: 'monthly', plan_title: 'Monthly', start_date: today, end_date: later, status: 'active', created_at: '2026-10-24T00:00:00Z' }]);
    signInAs(makeProfile('owner'));
    renderMember();
    const { dialog } = await openForm();
    expect(within(dialog).getByText(/current monthly plan will end on/i)).toBeInTheDocument();
  });

  it('the member does not get the button', async () => {
    signInAs(dinesh);
    renderMember();
    await screen.findByText(/Dinesh Sanmure|not allowed|permission/i).catch(() => null);
    expect(screen.queryByRole('button', { name: /change plan/i })).not.toBeInTheDocument();
  });
});

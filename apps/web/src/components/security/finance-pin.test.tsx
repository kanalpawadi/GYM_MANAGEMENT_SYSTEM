import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminLayout } from '../../pages/admin/AdminLayout';
import { AdminDashboard } from '../../pages/admin/AdminDashboard';
import { AdminFinancials } from '../../pages/admin/AdminFinancials';
import { AdminSettings } from '../../pages/admin/AdminSettings';
import { AdminUsers } from '../../pages/admin/AdminUsers';
import { makeProfile, securityState, seed, signInAs } from '../../test/supabaseMock';
import { renderPortal } from '../../test/renderPortal';
import { HIDDEN_MONEY } from './FinancePin';

const owner = makeProfile('owner', { id: 'owner-uid', full_name: 'Gym Owner' });
const desk = makeProfile('receptionist', { id: 'desk-uid', full_name: 'Desk Staff' });
const now = new Date().toISOString();

function seedMoney() {
  seed('payments', [
    { id: 'p1', member_id: null, payer_name: 'Walk-in', plan_title: 'Monthly', total_amount: 1500, discount_amount: 0, status: 'paid', payment_mode: 'cash', paid_at: now, created_at: now },
  ]);
}

const renderAdmin = (page: React.ReactElement) => renderPortal(<AdminLayout>{page}</AdminLayout>, { route: '/admin/dashboard' });
const revenueCard = () => screen.getByLabelText('Revenue this month');

async function typePin(label: RegExp, pin: string, scope: HTMLElement = document.body) {
  const user = userEvent.setup();
  await user.type(await within(scope).findByLabelText(label), pin);
  return user;
}

beforeEach(() => sessionStorage.clear());

describe('Security PIN for money information', () => {
  it('asks the admin to set a PIN first, then shows the revenue', async () => {
    signInAs(owner);
    seedMoney();
    renderAdmin(<AdminDashboard />);

    expect(await screen.findByRole('heading', { name: 'Set your security PIN' })).toBeInTheDocument();
    await waitFor(() => expect(revenueCard()).toHaveTextContent(HIDDEN_MONEY));
    expect(revenueCard()).not.toHaveTextContent('1,500');

    const user = await typePin(/^new security pin/i, '4826');
    await user.type(screen.getByLabelText(/confirm security pin/i), '4826');
    await user.click(screen.getByRole('button', { name: /set pin & show money/i }));

    expect(await screen.findByText('₹1,500')).toBeInTheDocument();
    expect(securityState.pin('owner-uid')?.pin).toBe('4826');
  });

  it('rejects a PIN that is not 4-6 digits or does not match', async () => {
    signInAs(owner);
    renderAdmin(<AdminDashboard />);
    await screen.findByRole('heading', { name: 'Set your security PIN' });
    const user = await typePin(/^new security pin/i, '12');
    await user.click(screen.getByRole('button', { name: /set pin & show money/i }));
    expect(screen.getByRole('alert')).toHaveTextContent('The PIN must be 4 to 6 digits.');

    await user.type(screen.getByLabelText(/^new security pin/i), '1234');
    await user.type(screen.getByLabelText(/confirm security pin/i), '9999');
    await user.click(screen.getByRole('button', { name: /set pin & show money/i }));
    expect(screen.getByRole('alert')).toHaveTextContent('The two PINs do not match.');
    expect(securityState.pin('owner-uid')).toBeNull();
  });

  it('hides money until the right PIN is entered, and Lock hides it again', async () => {
    signInAs(owner);
    securityState.setPin('owner-uid', '4826');
    seedMoney();
    renderAdmin(<AdminDashboard />);

    expect(await screen.findByRole('heading', { name: 'Money information is locked' })).toBeInTheDocument();
    await waitFor(() => expect(revenueCard()).toHaveTextContent(HIDDEN_MONEY));

    const user = await typePin(/^security pin/i, '1111');
    await user.click(screen.getByRole('button', { name: /^unlock$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong PIN. 2 attempts left');
    expect(revenueCard()).toHaveTextContent(HIDDEN_MONEY);

    await user.type(screen.getByLabelText(/^security pin/i), '4826');
    await user.click(screen.getByRole('button', { name: /^unlock$/i }));
    expect(await screen.findByText('₹1,500')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /lock money information/i }));
    expect(revenueCard()).toHaveTextContent(HIDDEN_MONEY);
    expect(screen.queryByText('₹1,500')).not.toBeInTheDocument();
  });

  it('locks the PIN for 15 minutes after 3 wrong tries', async () => {
    signInAs(owner);
    securityState.setPin('owner-uid', '4826');
    renderAdmin(<AdminDashboard />);
    await screen.findByRole('heading', { name: 'Money information is locked' });
    const user = userEvent.setup();
    for (let i = 0; i < 3; i++) {
      await user.type(screen.getByLabelText(/^security pin/i), '0000');
      await user.click(screen.getByRole('button', { name: /^unlock$/i }));
      await screen.findByRole('alert');
    }
    expect(screen.getByRole('alert')).toHaveTextContent(/Too many wrong PINs. Try again in 1[45]:\d\d/);
    expect(screen.getByRole('button', { name: /^unlock$/i })).toBeDisabled();
  });

  it('stays unlocked in this tab for 15 minutes (a page reload keeps it open)', async () => {
    signInAs(owner);
    securityState.setPin('owner-uid', '4826');
    seedMoney();
    const first = renderAdmin(<AdminDashboard />);
    const user = await typePin(/^security pin/i, '4826');
    await user.click(screen.getByRole('button', { name: /^unlock$/i }));
    await screen.findByText('₹1,500');
    first.unmount();

    renderAdmin(<AdminDashboard />);
    expect(await screen.findByText('₹1,500')).toBeInTheDocument();
  });

  it('keeps the whole Financials ledger and Record Expense behind the PIN', async () => {
    signInAs(desk);
    securityState.setPin('desk-uid', '2468');
    seedMoney();
    renderAdmin(<AdminFinancials />);
    expect(await screen.findByRole('heading', { name: 'Money information is locked' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Payments')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /record expense/i })).not.toBeInTheDocument();

    const user = await typePin(/^security pin/i, '2468');
    await user.click(screen.getByRole('button', { name: /^unlock$/i }));
    expect(await screen.findByRole('button', { name: /record expense/i })).toBeInTheDocument();
    expect(within(screen.getByLabelText('Payments')).getByText('Monthly')).toBeInTheDocument();
  });

  it('changes the PIN in Gym Settings only with the current PIN', async () => {
    signInAs(owner);
    securityState.setPin('owner-uid', '4826');
    renderAdmin(<AdminSettings />);
    const card = await screen.findByLabelText('Security PIN');
    const form = await within(card).findByRole('form', { name: /change security pin/i });
    const user = await typePin(/^current pin/i, '0000', form);
    await user.type(within(form).getByLabelText(/^new pin/i), '1357');
    await user.type(within(form).getByLabelText(/confirm new pin/i), '1357');
    await user.click(within(form).getByRole('button', { name: /change pin/i }));
    expect(await within(form).findByRole('alert')).toHaveTextContent('Wrong PIN');
    expect(securityState.pin('owner-uid')?.pin).toBe('4826');

    await user.type(within(form).getByLabelText(/^current pin/i), '4826');
    await user.type(within(form).getByLabelText(/^new pin/i), '1357');
    await user.type(within(form).getByLabelText(/confirm new pin/i), '1357');
    await user.click(within(form).getByRole('button', { name: /change pin/i }));
    expect(await within(form).findByRole('status')).toHaveTextContent('Your security PIN was changed.');
    expect(securityState.pin('owner-uid')?.pin).toBe('1357');
  });

  it('lets the owner reset a staff member’s forgotten PIN', async () => {
    signInAs(owner);
    seed('profiles', [owner, desk]);
    securityState.setPin('desk-uid', '2468');
    renderAdmin(<AdminUsers />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Reset security PIN for Desk Staff' }));
    expect(await screen.findByText(/Desk Staff's security PIN was reset/)).toBeInTheDocument();
    expect(securityState.pin('desk-uid')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reset security PIN for Gym Owner' })).not.toBeInTheDocument();
  });

  it('a manager cannot reset PINs', async () => {
    signInAs(makeProfile('manager', { id: 'mgr-uid' }));
    seed('profiles', [makeProfile('manager', { id: 'mgr-uid' }), desk]);
    renderAdmin(<AdminUsers />);
    await screen.findByText('Desk Staff');
    expect(screen.queryByRole('button', { name: /reset security pin/i })).not.toBeInTheDocument();
  });

  it('explains when the database update for the PIN is missing', async () => {
    const { failNextRpc } = await import('../../test/supabaseMock');
    signInAs(owner);
    failNextRpc('finance_pin_status', 'Could not find the function public.finance_pin_status without parameters in the schema cache');
    renderAdmin(<AdminDashboard />);
    expect(await screen.findByText(/needs the latest database update \(migration 21\)/)).toBeInTheDocument();
    await waitFor(() => expect(revenueCard()).toHaveTextContent(HIDDEN_MONEY));
  });
});

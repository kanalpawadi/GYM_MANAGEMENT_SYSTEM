import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { MemberSupplements } from './MemberSupplements';
import { PaymentHistory } from './PaymentHistory';
import { Avatar } from '../../components/account/Avatar';
import { Navbar } from '../../components/layout/Navbar';
import { minifyHtml, toHtmlDocument } from '../../utils/exportTable';
import { totalSpent } from '../../services/supplements';
import { makeProfile, seed, signInAs, supabaseMock, table } from '../../test/supabaseMock';
import { renderPortal } from '../../test/renderPortal';

const asha = makeProfile('member', { id: 'asha', full_name: 'Asha Patil', approval_status: 'approved' });
const page = (el: React.ReactElement) => renderPortal(<Routes><Route path="*" element={el} /></Routes>);

afterEach(() => vi.restoreAllMocks());

describe('Header Login button (phones)', () => {
  it('shows Login next to the menu when signed out, and links to the login page', async () => {
    page(<Navbar />);
    const login = await screen.findByRole('link', { name: /^login$/i });
    expect(login).toHaveAttribute('href', '/login');
  });

  it('shows My Portal when signed in', async () => {
    signInAs(asha);
    page(<Navbar />);
    expect(await screen.findAllByRole('link', { name: /my portal/i })).not.toHaveLength(0);
  });
});

describe('Profile photo zoom', () => {
  it('tapping the photo opens it large; tapping again or Escape closes it', async () => {
    const user = userEvent.setup();
    render(<Avatar src="https://img.test/asha.jpg" name="Asha Patil" zoomable />);
    await user.click(screen.getByRole('button', { name: /view asha patil's photo larger/i }));
    const big = screen.getByRole('dialog', { name: /asha patil's photo/i });
    expect(within(big).getByAltText(/large/i)).toHaveAttribute('src', 'https://img.test/asha.jpg');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /larger/i }));
    await user.click(screen.getByRole('button', { name: /close photo/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('a person with no photo shows their initial and nothing to enlarge', () => {
    render(<Avatar name="Ravi" zoomable />);
    expect(screen.getByLabelText('Ravi (no photo)')).toHaveTextContent('R');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('Supplements', () => {
  it('a member notes a supplement they bought and it shows with the price', async () => {
    signInAs(asha);
    page(<MemberSupplements />);
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/^supplement$/i), 'Whey protein');
    await user.type(screen.getByLabelText(/^brand$/i), 'MuscleBlaze');
    await user.type(screen.getByLabelText(/^dose$/i), '1 scoop');
    await user.selectOptions(screen.getByLabelText(/^when$/i), 'post-workout');
    await user.click(screen.getByLabelText(/i bought this/i));
    await user.type(screen.getByLabelText(/^price/i), '2499');
    await user.type(screen.getByLabelText(/bill \/ invoice no/i), 'B-102');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    const entry = await screen.findByRole('listitem', { name: /whey protein on/i });
    expect(entry).toHaveTextContent('MuscleBlaze');
    expect(entry).toHaveTextContent('Post-workout');
    expect(entry).toHaveTextContent(/Bill B-102/);
    expect(table('supplement_logs')[0]).toMatchObject({ member_id: 'asha', supplement: 'Whey protein', price: 2499, bill_no: 'B-102', created_by: 'asha' });
    expect(screen.getByLabelText(/supplement history/i)).toHaveTextContent(/spent ₹2,499/);
  });

  it('the statement downloads as CSV, HTML or minified HTML (no PDF here)', async () => {
    seed('supplement_logs', [{ id: 's1', member_id: 'asha', taken_on: '2026-10-20', supplement: 'Creatine', price: 899, created_at: '2026-10-20T10:00:00Z' }]);
    signInAs(asha);
    page(<MemberSupplements />);
    const user = userEvent.setup();
    await screen.findByRole('listitem', { name: /creatine on/i });

    await user.click(screen.getByRole('button', { name: /statement \/ invoice/i }));
    const items = within(screen.getByRole('menu')).getAllByRole('menuitem').map((b) => b.textContent);
    expect(items).toEqual([expect.stringContaining('CSV'), expect.stringMatching(/^HTML/), expect.stringContaining('Minified HTML')]);

    const clicks: string[] = [];
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push(this.download);
    });
    await user.click(screen.getByRole('menuitem', { name: /minified html/i }));
    expect(clicks[0]).toMatch(/^rv-fitness-supplements-asha-patil-\d{4}-\d{2}-\d{2}\.min\.html$/);
  });

  it('minified HTML is the same page without the spacing, and carries the totals', () => {
    const html = toHtmlDocument({ title: 'Supplement statement', rows: [{ supplement: 'Creatine', price: 899 }], summary: [['Total spent', '₹899']] });
    const min = minifyHtml(html);
    expect(min.length).toBeLessThan(html.length);
    expect(min).not.toMatch(/\n/);
    expect(min).toContain('<td>Creatine</td>');
    expect(min).toContain('Total spent: <b>₹899</b>');
    expect(totalSpent([{ price: 899 }, { price: null }, { price: 100 }])).toBe(999);
  });

  it('the trainer can see a member’s supplements from the member page data', async () => {
    seed('profiles', [asha]);
    seed('supplement_logs', [{ id: 's1', member_id: 'asha', taken_on: '2026-10-20', supplement: 'Creatine', created_at: '2026-10-20T10:00:00Z' }]);
    signInAs(makeProfile('trainer'));
    const { SupplementLog } = await import('../../components/supplements/SupplementLog');
    page(<SupplementLog memberId="asha" memberName="Asha Patil" canEdit={false} />);
    expect(await screen.findByLabelText(/creatine on/i)).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: /add supplement/i })).not.toBeInTheDocument();
  });
});

describe('Generate payment', () => {
  it('a member generates a payment for a plan; it waits for approval and online pay is marked coming soon', async () => {
    signInAs(asha);
    page(<PaymentHistory />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /generate payment/i }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('radio', { name: /yearly/i }));
    await user.click(within(dialog).getByRole('button', { name: /generate ₹/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/generated for the Yearly plan/);
    const generated = await screen.findByLabelText(/generated payments/i);
    expect(generated).toHaveTextContent(/Yearly/);
    expect(generated).toHaveTextContent(/waiting for gym approval/i);
    expect(within(generated).getByRole('button', { name: /online/i })).toBeDisabled();
    expect(supabaseMock.rpc).toHaveBeenCalledWith('request_plan', expect.objectContaining({ p_plan_code: 'yearly', p_payment: 'desk' }));
    // Only one open bill at a time.
    expect(screen.getByRole('button', { name: /generate payment/i })).toBeDisabled();
  });

  it('a generated payment can be cancelled', async () => {
    seed('plan_requests', [{ id: 'r1', member_id: 'asha', plan_code: 'monthly', plan_title: 'Monthly', months: 1, base_price: 1500, price: 1500, request_type: 'renew', payment_preference: 'desk', status: 'pending', created_at: '2026-10-22T10:00:00Z' }]);
    signInAs(asha);
    page(<PaymentHistory />);
    const user = userEvent.setup();
    const generated = await screen.findByLabelText(/generated payments/i);
    await user.click(within(generated).getByRole('button', { name: /cancel/i }));
    expect(await screen.findByRole('status')).toHaveTextContent(/cancelled/i);
    expect(table('plan_requests')[0].status).toBe('cancelled');
  });

  it('a due payment shows Pay online as coming soon', async () => {
    seed('payments', [{ id: 'p1', member_id: 'asha', plan_title: 'Monthly', total_amount: 1500, status: 'pending', payment_mode: 'cash', created_at: '2026-10-22T10:00:00Z' }]);
    signInAs(asha);
    page(<PaymentHistory />);
    const btn = await screen.findByRole('button', { name: /pay ₹1,500 online/i });
    expect(btn).toBeDisabled();
    expect(screen.getAllByText(/coming soon/i).length).toBeGreaterThan(0);
  });
});

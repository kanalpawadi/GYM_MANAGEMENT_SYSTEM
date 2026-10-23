import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AdminLayout } from '../../pages/admin/AdminLayout';
import { MemberPortalLayout } from '../../pages/member/MemberPortalLayout';
import { useCardTable } from '../../utils/useCardTable';
import { makeProfile, signInAs } from '../../test/supabaseMock';
import { CurrentPath, renderPortal } from '../../test/renderPortal';

describe('Admin panel on phones', () => {
  it('the menu button opens a slide-in menu that closes after choosing a page', async () => {
    signInAs(makeProfile('owner'));
    renderPortal(
      <>
        <Routes>
          <Route path="*" element={<AdminLayout><p>page</p></AdminLayout>} />
        </Routes>
        <CurrentPath />
      </>,
      { route: '/admin/dashboard' },
    );
    const user = userEvent.setup();

    expect(screen.queryByRole('dialog', { name: /admin menu/i })).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /open menu/i }));
    const menu = screen.getByRole('dialog', { name: /admin menu/i });
    await user.click(within(menu).getByRole('link', { name: /members/i }));

    expect(screen.getByTestId('path')).toHaveTextContent('/admin/members');
    expect(screen.queryByRole('dialog', { name: /admin menu/i })).not.toBeInTheDocument();
  });

  it('Escape closes the menu', async () => {
    signInAs(makeProfile('owner'));
    renderPortal(<AdminLayout><p>page</p></AdminLayout>, { route: '/admin/dashboard' });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /open menu/i }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /admin menu/i })).not.toBeInTheDocument();
  });
});

describe('Member portal on phones', () => {
  it('has a bottom tab bar and a More sheet with the other pages and account actions', async () => {
    signInAs(makeProfile('member', { approval_status: 'approved' }));
    renderPortal(
      <>
        <Routes>
          <Route path="*" element={<MemberPortalLayout><p>page</p></MemberPortalLayout>} />
        </Routes>
        <CurrentPath />
      </>,
      { route: '/portal/dashboard' },
    );
    const user = userEvent.setup();

    const bar = await screen.findByRole('navigation', { name: /portal menu/i });
    expect(within(bar).getAllByRole('link').map((l) => l.textContent)).toEqual(['Home', 'Plans', 'QR Pass', 'Attendance']);
    expect(within(bar).getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');

    await user.click(within(bar).getByRole('button', { name: /more/i }));
    const sheet = screen.getByRole('dialog', { name: /more options/i });
    expect(within(sheet).getByRole('link', { name: /payments & invoices/i })).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: /sign out/i })).toBeInTheDocument();

    await user.click(within(sheet).getByRole('link', { name: /body metrics/i }));
    expect(screen.getByTestId('path')).toHaveTextContent('/portal/progress');
    expect(screen.queryByRole('dialog', { name: /more options/i })).not.toBeInTheDocument();
  });
});

describe('Tables as cards on phones', () => {
  function Demo() {
    const ref = useCardTable();
    const [rows, setRows] = useState(['Asha']);
    return (
      <>
        <button onClick={() => setRows((r) => [...r, 'Ravi'])}>add</button>
        <table ref={ref} className="table-cards">
          <thead>
            <tr>
              <th>Member</th>
              <th>Plan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r}>
                <td>{r}</td>
                <td>Monthly</td>
              </tr>
            ))}
            <tr>
              <td colSpan={2}>footer</td>
            </tr>
          </tbody>
        </table>
      </>
    );
  }

  it('labels every cell with its column name, including rows added later', async () => {
    render(<Demo />);
    expect(screen.getByText('Monthly')).toHaveAttribute('data-label', 'Plan');
    expect(screen.getByText('Asha')).toHaveAttribute('data-label', 'Member');
    expect(screen.getByText('footer')).not.toHaveAttribute('data-label');

    await userEvent.setup().click(screen.getByRole('button', { name: 'add' }));
    expect(await screen.findByText('Ravi')).toHaveAttribute('data-label', 'Member');
  });
});

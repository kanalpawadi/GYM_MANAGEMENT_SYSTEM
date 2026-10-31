import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { HeightInput, cmToFeet, feetToCm } from '../../components/ui/HeightInput';
import { pickBackCamera } from '../staff/AttendanceScanner';
import { MemberPortalLayout } from './MemberPortalLayout';
import { Registration } from './Registration';
import { MemberDetail } from '../staff/MemberDetail';
import { Modal } from '../../components/ui/Modal';
import { makeProfile, seed, setMembershipCheck, signInAs, supabaseMock, table } from '../../test/supabaseMock';
import { renderPortal } from '../../test/renderPortal';

describe('Height in feet', () => {
  function Harness() {
    const [cm, setCm] = useState('');
    return (
      <>
        <HeightInput value={cm} onChange={setCm} />
        <output data-testid="cm">{cm}</output>
      </>
    );
  }

  it('5 ft 7 in is saved as 170.2 cm', async () => {
    render(<Harness />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('radio', { name: 'feet' }));
    await user.type(screen.getByLabelText('Height feet'), '5');
    await user.type(screen.getByLabelText('Height inches'), '7');
    expect(screen.getByTestId('cm')).toHaveTextContent('170.2');
    expect(screen.getByText('= 170.2 cm')).toBeInTheDocument();
  });

  it('conversion helpers', () => {
    expect(feetToCm(6, 0)).toBe(182.9);
    expect(cmToFeet(170)).toEqual({ feet: 5, inches: 7 });
  });
});

describe('Samsung camera choice', () => {
  it('picks the main back lens, not ultra-wide or the front camera', () => {
    expect(
      pickBackCamera([
        { id: 'front', label: 'camera2 1, facing front' },
        { id: 'wide', label: 'camera2 2, facing back' },
        { id: 'main', label: 'camera2 0, facing back' },
      ]),
    ).toBe('main');
    expect(pickBackCamera([{ id: 'u', label: 'Back Ultra Wide Camera' }, { id: 'b', label: 'Back Camera' }])).toBe('b');
    expect(pickBackCamera([{ id: 'x', label: '' }, { id: 'y', label: '' }])).toBe('y');
    expect(pickBackCamera([])).toBeNull();
  });
});

describe('Plan ending: reminder and admission again', () => {
  const ravi = makeProfile('member', { id: 'ravi', full_name: 'Ravi Kale', approval_status: 'approved' });

  it('shows a renewal banner when 3 days are left', async () => {
    setMembershipCheck({ expired: false, days_left: 3, ends_on: '2026-11-03' });
    signInAs(ravi);
    renderPortal(<Routes><Route path="*" element={<MemberPortalLayout><p>page</p></MemberPortalLayout>} /></Routes>);
    const banner = await screen.findByText(/Your membership ends in 3 days \(3 Nov\)/);
    expect(banner).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /renew now/i })).toHaveAttribute('href', '/portal/checkout');
    expect(supabaseMock.rpc).toHaveBeenCalledWith('check_my_membership');
  });

  it('no banner when the plan has more than 5 days', async () => {
    setMembershipCheck({ expired: false, days_left: 12, ends_on: '2026-11-12' });
    signInAs(ravi);
    renderPortal(<Routes><Route path="*" element={<MemberPortalLayout><p>page</p></MemberPortalLayout>} /></Routes>);
    await screen.findByText('page');
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/your membership ends/i)).not.toBeInTheDocument();
  });

  it('the admission page explains the plan ended', async () => {
    signInAs({ ...ravi, approval_status: 'incomplete', approval_note: 'Your membership ended on 30 Oct 2026. Please fill the admission form again for approval.' });
    renderPortal(<Routes><Route path="*" element={<Registration />} /></Routes>, { route: '/register' });
    expect(await screen.findByText('Admission renewal')).toBeInTheDocument();
    expect(screen.getByText(/Your membership ended on 30 Oct 2026/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit for approval/i })).toBeInTheDocument();
  });
});

describe('Trainer logs body progress for a member', () => {
  it('the member page Progress tab has the progress tracker with Log Progress', async () => {
    seed('profiles', [makeProfile('member', { id: 'asha', full_name: 'Asha Patil', approval_status: 'approved' })]);
    signInAs(makeProfile('trainer'));
    renderPortal(<Routes><Route path="/trainer/members/:memberId" element={<MemberDetail backTo="/trainer/dashboard" />} /></Routes>, { route: '/trainer/members/asha' });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('tab', { name: /progress/i }));
    expect(await screen.findByText(/BODY COMPOSITION AUDIT/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /log progress/i }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/weight/i), '68.5');
    await user.click(within(dialog).getByRole('button', { name: /save/i }));
    await vi.waitFor(() => expect(table('progress_logs')).toHaveLength(1));
    expect(table('progress_logs')[0]).toMatchObject({ member_id: 'asha', weight_kg: 68.5 });
  });
});

describe('Pop-up windows', () => {
  it('open at page level, not inside the card that opened them', () => {
    const { container } = render(
      <div style={{ transform: 'scale(1)' }} data-testid="card">
        <Modal isOpen onClose={() => undefined} title="Crop your photo">
          <p>crop area</p>
        </Modal>
      </div>,
    );
    expect(screen.getByRole('dialog', { name: 'Crop your photo' })).toBeInTheDocument();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { MemberDetail } from './MemberDetail';
import { MemberPortalLayout } from '../member/MemberPortalLayout';
import { MemberPlans } from '../member/MemberPlans';
import { MemberProfile } from '../member/MemberProfile';
import { Registration } from '../member/Registration';
import { PlanEditorModal } from '../../components/plans/PlanEditorModal';
import { makeProfile, seed, signInAs, supabaseMock, table } from '../../test/supabaseMock';
import { renderPortal } from '../../test/renderPortal';

const asha = makeProfile('member', { id: 'asha', full_name: 'Asha Patil', approval_status: 'approved' });
const owner = makeProfile('owner', { id: 'boss', full_name: 'Gym Owner' });
const detail = () =>
  renderPortal(<Routes><Route path="/admin/members/:memberId" element={<MemberDetail backTo="/admin/members" />} /></Routes>, { route: '/admin/members/asha' });

describe('Owner freezes a member', () => {
  it('needs a reason, then freezes; Unfreeze adds the days back', async () => {
    seed('profiles', [asha]);
    signInAs(owner);
    detail();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /freeze account/i }));
    const dialog = screen.getByRole('dialog', { name: /freeze asha patil/i });
    await user.click(within(dialog).getByRole('button', { name: /^freeze$/i }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/reason/i);
    expect(supabaseMock.rpc).not.toHaveBeenCalledWith('freeze_member', expect.anything());

    await user.type(within(dialog).getByLabelText(/reason/i), 'Fees pending for 2 months');
    await user.click(within(dialog).getByRole('button', { name: /^freeze$/i }));
    expect(await screen.findByText(/account is frozen\. Their plan days are paused/i)).toBeInTheDocument();
    expect(supabaseMock.rpc).toHaveBeenCalledWith('freeze_member', { p_member: 'asha', p_reason: 'Fees pending for 2 months' });
    expect(screen.getByText(/account frozen since/i)).toBeInTheDocument();
    expect(screen.getAllByText('Fees pending for 2 months').length).toBeGreaterThan(0);
    expect(screen.getByText('Frozen')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /unfreeze/i }));
    expect(await screen.findByText(/active again\. 3 days added to their plan/i)).toBeInTheDocument();
    expect(table('profiles').find((p) => p.id === 'asha').frozen_at).toBeNull();
  });

  it('trainers see that a member is frozen but cannot freeze or unfreeze', async () => {
    seed('profiles', [{ ...asha, frozen_at: '2026-10-25T10:00:00Z', frozen_reason: 'Medical leave' }]);
    signInAs(makeProfile('trainer'));
    detail();
    expect(await screen.findByText('Medical leave')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /unfreeze/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /freeze account/i })).not.toBeInTheDocument();
  });

  it('trainers see nothing about freezing for an active member', async () => {
    seed('profiles', [asha]);
    signInAs(makeProfile('trainer'));
    detail();
    await screen.findByText('Asha Patil');
    expect(screen.queryByRole('region', { name: /freeze account/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /freeze account/i })).not.toBeInTheDocument();
  });

  it('a frozen member sees only the frozen screen with the reason', async () => {
    signInAs({ ...asha, frozen_at: '2026-10-25T10:00:00Z', frozen_reason: 'Fees pending' });
    renderPortal(<Routes><Route path="*" element={<MemberPortalLayout><p>dashboard</p></MemberPortalLayout>} /></Routes>);
    expect(await screen.findByRole('heading', { name: /account frozen/i })).toBeInTheDocument();
    expect(screen.getByText('Fees pending')).toBeInTheDocument();
    expect(screen.queryByText('dashboard')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });
});

describe('Food type', () => {
  const vegPlan = { id: 'v1', member_id: null, is_common: true, food_type: 'veg', title: 'Veg Plan', meals: [{ name: 'Lunch', time: '1 PM', items: 'Dal rice' }], is_active: true, created_at: '2026-10-01' };
  const eggPlan = { id: 'e1', member_id: null, is_common: true, food_type: 'veg_egg', title: 'Egg Plan', meals: [{ name: 'Breakfast', time: '8 AM', items: 'Boiled eggs' }], is_active: true, created_at: '2026-10-02' };

  it('registration needs a food type and sends it', async () => {
    signInAs(makeProfile('member', { id: 'neha', full_name: 'Neha G', approval_status: 'incomplete' }));
    renderPortal(<Routes><Route path="*" element={<Registration />} /></Routes>, { route: '/register' });
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/contact number/i), '9822011111');
    await user.type(screen.getByLabelText(/^date of birth$/i), '01021999');
    await user.click(screen.getByRole('button', { name: /submit for approval/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/choose your food type/i);

    await user.click(screen.getByRole('radio', { name: /veg \+ egg/i }));
    await user.click(screen.getByRole('button', { name: /submit for approval/i }));
    expect(await screen.findByRole('heading', { name: /waiting for approval/i })).toBeInTheDocument();
    expect(supabaseMock.rpc).toHaveBeenCalledWith('submit_registration', expect.objectContaining({ p_food_preference: 'veg_egg' }));
  });

  it('existing members set it in My Profile', async () => {
    seed('profiles', [asha]);
    signInAs(asha);
    renderPortal(<MemberProfile />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('radio', { name: /non-veg/i }));
    await user.click(screen.getByRole('button', { name: /save details/i }));
    await screen.findByText('Details saved.');
    expect(table('profiles').find((p) => p.id === 'asha').food_preference).toBe('nonveg');
  });

  it('a Veg + Egg member sees the Veg + Egg common diet plan', async () => {
    seed('diet_plans', [vegPlan, eggPlan]);
    signInAs({ ...asha, food_preference: 'veg_egg' });
    renderPortal(<MemberPlans />);
    expect(await screen.findByText('Boiled eggs')).toBeInTheDocument();
    expect(screen.queryByText('Dal rice')).not.toBeInTheDocument();
  });

  it('no plan for their food type yet: nothing is shown', async () => {
    seed('diet_plans', [vegPlan]);
    signInAs({ ...asha, food_preference: 'nonveg' });
    renderPortal(<MemberPlans />);
    expect(await screen.findByText(/No Non-Veg diet plan yet/)).toBeInTheDocument();
    expect(screen.queryByText('Dal rice')).not.toBeInTheDocument();
  });

  it('no food type chosen: asked to pick it in My Profile', async () => {
    seed('diet_plans', [vegPlan]);
    signInAs(asha);
    renderPortal(<MemberPlans />);
    expect(await screen.findByRole('link', { name: /my profile/i })).toHaveAttribute('href', '/portal/profile');
    expect(screen.queryByText('Dal rice')).not.toBeInTheDocument();
  });

  it('trainer saves a Non-Veg common plan without replacing the Veg one', async () => {
    seed('diet_plans', [vegPlan]);
    const trainer = makeProfile('trainer', { id: 'coach', full_name: 'Coach Amit' });
    signInAs(trainer);
    let saved = '';
    renderPortal(<PlanEditorModal target={{ kind: 'diet', member: 'common' }} author={trainer} onClose={() => undefined} onSaved={(m) => (saved = m)} />);
    const user = userEvent.setup();
    // Opens on Pure Veg with that plan filled in.
    expect(await screen.findByDisplayValue('Veg Plan')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /non-veg/i }));
    await vi.waitFor(() => expect(screen.getByLabelText(/plan title/i)).toHaveValue(''));
    await user.type(screen.getByLabelText(/plan title/i), 'Chicken Plan');
    await user.type(screen.getByLabelText('Meal 1 food'), 'Chicken breast');
    await user.click(screen.getByRole('button', { name: /save & send/i }));
    await vi.waitFor(() => expect(saved).toMatch(/sent to all Non-Veg members/));
    const active = table('diet_plans').filter((p) => p.is_common && p.is_active);
    expect(active.map((p) => p.food_type).sort()).toEqual(['nonveg', 'veg']);
  });
});

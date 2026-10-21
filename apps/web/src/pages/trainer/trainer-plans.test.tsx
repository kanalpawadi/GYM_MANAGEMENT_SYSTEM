import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { TrainerDashboard } from './TrainerDashboard';
import { MemberPlans } from '../member/MemberPlans';
import { failNextWrite, makeProfile, resetSupabaseMock, seed, signInAs, table } from '../../test/supabaseMock';
import { renderPortal } from '../../test/renderPortal';

vi.mock('../../lib/supabase', async () => ({ supabase: (await import('../../test/supabaseMock')).supabaseMock }));

const coach = makeProfile('trainer', { id: 'coach-1', full_name: 'Coach Arjun' });
const asha = makeProfile('member', { id: 'asha', full_name: 'Asha Patil', email: 'asha@example.com', assigned_trainer_id: 'coach-1' });
const ravi = makeProfile('member', { id: 'ravi', full_name: 'Ravi Kale', email: 'ravi@example.com', assigned_trainer_id: 'someone-else' });

const renderTrainer = () => renderPortal(<Routes><Route path="*" element={<TrainerDashboard />} /></Routes>);
const renderMemberPlans = () => renderPortal(<Routes><Route path="*" element={<MemberPlans />} /></Routes>);

beforeEach(() => {
  resetSupabaseMock();
  localStorage.clear();
  seed('profiles', [asha, ravi]);
});

async function writeDietPlan(title: string, breakfast: string) {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Diet plan for Asha Patil' }));
  const dialog = await screen.findByRole('dialog');
  const titleInput = within(dialog).getByLabelText(/plan title/i);
  await user.clear(titleInput);
  await user.type(titleInput, title);
  const food = within(dialog).getByLabelText('Meal 1 food');
  await user.clear(food);
  await user.type(food, breakfast);
  await user.type(within(dialog).getByLabelText(/notes for the member/i), 'Drink 4 litres of water');
  await user.click(within(dialog).getByRole('button', { name: /save & send to member/i }));
  return user;
}

describe('Trainer diet & workout plans', () => {
  it('shows a trainer only the members assigned to them', async () => {
    signInAs(coach);
    renderTrainer();
    expect(await screen.findByText('Asha Patil')).toBeInTheDocument();
    expect(screen.queryByText('Ravi Kale')).not.toBeInTheDocument();
  });

  it('explains what to do when no members are assigned', async () => {
    signInAs(makeProfile('trainer', { id: 'lonely-coach' }));
    renderTrainer();
    expect(await screen.findByText(/no members are assigned to you yet/i)).toBeInTheDocument();
  });

  it('saves a diet plan to the database for the member', async () => {
    signInAs(coach);
    renderTrainer();
    await writeDietPlan('Lean Bulk 2,600 kcal', '4 eggs + 80g oats');

    expect(await screen.findByText(/diet plan "Lean Bulk 2,600 kcal" sent to Asha Patil/i)).toBeInTheDocument();
    const saved = table('diet_plans');
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      member_id: 'asha',
      title: 'Lean Bulk 2,600 kcal',
      is_active: true,
      created_by: 'coach-1',
      trainer_name: 'Coach Arjun',
      notes: 'Drink 4 litres of water',
    });
    expect(saved[0].meals[0]).toMatchObject({ name: 'Breakfast', items: '4 eggs + 80g oats' });
  });

  it('replaces the previous plan and keeps it as history', async () => {
    seed('diet_plans', [{ id: 'old', member_id: 'asha', title: 'Old Plan', meals: [{ name: 'Lunch', time: '', items: 'rice' }], is_active: true, created_at: '2026-01-01' }]);
    signInAs(coach);
    renderTrainer();
    await writeDietPlan('New Plan', 'paneer');
    await screen.findByText(/sent to Asha Patil/i);

    const plans = table('diet_plans');
    expect(plans.find((p) => p.id === 'old')?.is_active).toBe(false);
    expect(plans.filter((p) => p.is_active).map((p) => p.title)).toEqual(['New Plan']);
  });

  it('opens the editor pre-filled with the current plan', async () => {
    seed('diet_plans', [{ id: 'cur', member_id: 'asha', title: 'Current Cut', meals: [{ name: 'Snack', time: '5 PM', items: 'sprouts' }], is_active: true, created_at: '2026-01-01' }]);
    signInAs(coach);
    renderTrainer();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Diet plan for Asha Patil' }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByDisplayValue('Current Cut')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('sprouts')).toBeInTheDocument();
  });

  it('saves a workout plan', async () => {
    signInAs(coach);
    renderTrainer();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Workout plan for Asha Patil' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/plan title/i), 'Push Pull Legs');
    await user.type(within(dialog).getByLabelText('Day 1 exercises'), 'Bench 4x8');
    await user.click(within(dialog).getByRole('button', { name: /save & send/i }));
    await screen.findByText(/workout plan "Push Pull Legs" sent to Asha Patil/i);
    expect(table('workout_plans')[0]).toMatchObject({ member_id: 'asha', title: 'Push Pull Legs', schedule: [{ day: 'Day 1', exercises: 'Bench 4x8' }] });
  });

  it('shows the error and keeps the dialog open if saving is refused', async () => {
    signInAs(coach);
    renderTrainer();
    failNextWrite('diet_plans', 'new row violates row-level security policy');
    await writeDietPlan('Blocked', 'eggs');
    expect(await screen.findByText(/row-level security/i)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('Member "My Diet & Workout" page', () => {
  it('shows the diet plan the trainer saved', async () => {
    // 1. Trainer writes the plan.
    signInAs(coach);
    const trainerView = renderTrainer();
    await writeDietPlan('Lean Bulk 2,600 kcal', '4 eggs + 80g oats');
    await screen.findByText(/sent to Asha Patil/i);
    trainerView.unmount();

    // 2. The member signs in and sees it.
    resetSessionTo(asha);
    renderMemberPlans();
    const diet = await screen.findByLabelText('Diet plan');
    expect(await within(diet).findByText('Lean Bulk 2,600 kcal')).toBeInTheDocument();
    expect(within(diet).getByText('4 eggs + 80g oats')).toBeInTheDocument();
    expect(within(diet).getByText('Coach Arjun')).toBeInTheDocument();
    expect(within(diet).getByText('Drink 4 litres of water')).toBeInTheDocument();
  });

  it('does not show another member their plan', async () => {
    seed('diet_plans', [{ id: 'p', member_id: 'ravi', title: 'Ravi Only', meals: [], is_active: true, created_at: '2026-01-01' }]);
    signInAs(asha);
    renderMemberPlans();
    expect(await screen.findByText(/hasn't assigned a diet plan yet/i)).toBeInTheDocument();
    expect(screen.queryByText('Ravi Only')).not.toBeInTheDocument();
  });

  it('shows the workout plan and ignores old inactive plans', async () => {
    seed('workout_plans', [
      { id: 'w-old', member_id: 'asha', title: 'Old Split', schedule: [], is_active: false, created_at: '2026-01-01' },
      { id: 'w-new', member_id: 'asha', title: 'Strength Block', schedule: [{ day: 'Monday', exercises: 'Squat 5x5' }], is_active: true, created_at: '2026-02-01' },
    ]);
    signInAs(asha);
    renderMemberPlans();
    const workout = await screen.findByLabelText('Workout plan');
    expect(await within(workout).findByText('Strength Block')).toBeInTheDocument();
    expect(within(workout).getByText('Squat 5x5')).toBeInTheDocument();
    expect(screen.queryByText('Old Split')).not.toBeInTheDocument();
  });
});

function resetSessionTo(profile: typeof asha) {
  // Keep the tables, switch the signed-in user.
  signInAs(profile);
}

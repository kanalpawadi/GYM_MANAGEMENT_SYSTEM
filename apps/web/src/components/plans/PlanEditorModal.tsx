import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import {
  DietMeal,
  WorkoutDay,
  getCommonPlans,
  getPersonalPlans,
  saveCommonDietPlan,
  saveCommonWorkoutPlan,
  saveDietPlan,
  saveWorkoutPlan,
} from '../../services/portal';
import type { UserProfile } from '../../types';

const textareaClass =
  'w-full bg-black text-white border border-gym-border rounded-xl p-3 text-sm font-body focus:outline-none focus:border-gym-primary';

const EMPTY_MEALS: DietMeal[] = [
  { name: 'Breakfast', time: '8:00 AM', items: '' },
  { name: 'Lunch', time: '1:30 PM', items: '' },
  { name: 'Dinner', time: '8:30 PM', items: '' },
];
const EMPTY_DAYS: WorkoutDay[] = [{ day: 'Day 1', exercises: '' }];

/** Who the plan is for: one member (personal plan) or every normal member (common plan). */
export type PlanTarget = { kind: 'diet' | 'workout'; member: UserProfile | 'common' } | null;

interface Props {
  target: PlanTarget;
  author: UserProfile | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** Diet / workout plan editor, pre-filled with the current plan so it can be edited. */
export const PlanEditorModal: React.FC<Props> = ({ target, author, onClose, onSaved }) => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [meals, setMeals] = useState<DietMeal[]>(EMPTY_MEALS);
  const [days, setDays] = useState<WorkoutDay[]>(EMPTY_DAYS);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const isCommon = target?.member === 'common';
  const forName = !target ? '' : isCommon ? 'All normal members' : (target.member as UserProfile).full_name;

  useEffect(() => {
    if (!target) return;
    setFormError('');
    setTitle('');
    setNotes('');
    setMeals(EMPTY_MEALS);
    setDays(EMPTY_DAYS);
    const load = isCommon ? getCommonPlans() : getPersonalPlans((target.member as UserProfile).id);
    load
      .then((current) => {
        if (target.kind === 'diet' && current.diet) {
          setTitle(current.diet.title);
          setNotes(current.diet.notes ?? '');
          setMeals(current.diet.meals.length ? current.diet.meals : EMPTY_MEALS);
        }
        if (target.kind === 'workout' && current.workout) {
          setTitle(current.workout.title);
          setNotes(current.workout.notes ?? '');
          setDays(current.workout.schedule.length ? current.workout.schedule : EMPTY_DAYS);
        }
      })
      .catch((err: Error) => setFormError(`Could not load the current plan: ${err.message}`));
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target || !author) return;
    setFormError('');
    setSaving(true);
    try {
      if (target.kind === 'diet') {
        const filled = meals.filter((m) => m.name.trim() || m.items.trim());
        if (!filled.length) throw new Error('Add at least one meal.');
        const plan = { title, meals: filled, notes };
        if (isCommon) await saveCommonDietPlan(plan, author);
        else await saveDietPlan((target.member as UserProfile).id, plan, author);
      } else {
        const filled = days.filter((d) => d.day.trim() || d.exercises.trim());
        if (!filled.length) throw new Error('Add at least one training day.');
        const plan = { title, schedule: filled, notes };
        if (isCommon) await saveCommonWorkoutPlan(plan, author);
        else await saveWorkoutPlan((target.member as UserProfile).id, plan, author);
      }
      onSaved(`${target.kind === 'diet' ? 'Diet' : 'Workout'} plan "${title}" sent to ${isCommon ? 'all normal members' : forName}.`);
    } catch (err: any) {
      setFormError(err.message || 'Could not save the plan');
    } finally {
      setSaving(false);
    }
  };

  const updateMeal = (i: number, patch: Partial<DietMeal>) => setMeals((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const updateDay = (i: number, patch: Partial<WorkoutDay>) => setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  return (
    <Modal isOpen={!!target} onClose={onClose} maxWidth="2xl" title={target ? `${target.kind === 'diet' ? 'DIET' : 'WORKOUT'} PLAN · ${forName}` : ''}>
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        {isCommon && (
          <p className="text-xs text-gym-muted bg-gym-primary/10 border border-gym-primary/30 rounded-xl p-3">
            This common plan is shown to every member who doesn't have a personal plan (normal members).
          </p>
        )}
        <Input
          label="Plan Title"
          placeholder={target?.kind === 'diet' ? 'e.g. High-Protein Fat Loss (2,100 kcal)' : 'e.g. 4-Day Push/Pull Split'}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        {target?.kind === 'diet' ? (
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium text-gym-muted">Meals</span>
            {meals.map((meal, i) => (
              <div key={i} className="border border-gym-border rounded-xl p-3 flex flex-col gap-2">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-6">
                    <Input aria-label={`Meal ${i + 1} name`} placeholder="Meal name" value={meal.name} onChange={(e) => updateMeal(i, { name: e.target.value })} />
                  </div>
                  <div className="col-span-5">
                    <Input aria-label={`Meal ${i + 1} time`} placeholder="Time" value={meal.time} onChange={(e) => updateMeal(i, { time: e.target.value })} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setMeals((prev) => prev.filter((_, idx) => idx !== i))}
                    className="col-span-1 p-2 text-gym-muted hover:text-gym-danger"
                    aria-label={`Remove meal ${i + 1}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  aria-label={`Meal ${i + 1} food`}
                  rows={2}
                  placeholder="Foods and quantities, e.g. 4 egg whites + 60g oats"
                  value={meal.items}
                  onChange={(e) => updateMeal(i, { items: e.target.value })}
                  className={textareaClass}
                />
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={() => setMeals((prev) => [...prev, { name: '', time: '', items: '' }])} leftIcon={<Plus className="w-4 h-4" />}>
              Add Meal
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium text-gym-muted">Training Days</span>
            {days.map((day, i) => (
              <div key={i} className="border border-gym-border rounded-xl p-3 flex flex-col gap-2">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input aria-label={`Day ${i + 1} name`} placeholder="e.g. Monday – Chest & Triceps" value={day.day} onChange={(e) => updateDay(i, { day: e.target.value })} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setDays((prev) => prev.filter((_, idx) => idx !== i))}
                    className="p-2 text-gym-muted hover:text-gym-danger"
                    aria-label={`Remove day ${i + 1}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  aria-label={`Day ${i + 1} exercises`}
                  rows={3}
                  placeholder="Bench Press 4x8, Incline DB Press 3x10, Tricep Dips 3x12"
                  value={day.exercises}
                  onChange={(e) => updateDay(i, { exercises: e.target.value })}
                  className={textareaClass}
                />
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={() => setDays((prev) => [...prev, { day: `Day ${prev.length + 1}`, exercises: '' }])} leftIcon={<Plus className="w-4 h-4" />}>
              Add Day
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="plan-notes" className="text-sm font-medium text-gym-muted">Notes for the member (optional)</label>
          <textarea id="plan-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={textareaClass} />
        </div>

        {formError && <span className="text-xs text-gym-danger font-medium">{formError}</span>}
        <Button type="submit" variant="primary" isLoading={saving} className="mt-2">Save & Send to Member</Button>
      </form>
    </Modal>
  );
};

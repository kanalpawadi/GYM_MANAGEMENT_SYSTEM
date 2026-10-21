import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Dumbbell, Users, Plus, Utensils, CheckCircle2, Trash2, KeyRound, LineChart } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { ChangePasswordModal } from '../../components/account/ChangePasswordModal';
import { Avatar } from '../../components/account/Avatar';
import { ProfilePhotoPicker } from '../../components/account/ProfilePhotoPicker';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS, isAdminRole } from '../../config/roles';
import { DietMeal, ProgressEntry, WorkoutDay, getActivePlans, listProgress, listTrainees, saveDietPlan, saveWorkoutPlan } from '../../services/portal';
import { ProgressTimeline } from '../../components/progress/ProgressTimeline';
import type { UserProfile } from '../../types';

const textareaClass =
  'w-full bg-gym-surface text-white border border-gym-border rounded-lg p-3 text-sm font-body focus:outline-none focus:border-gym-primary';

const EMPTY_MEALS: DietMeal[] = [
  { name: 'Breakfast', time: '8:00 AM', items: '' },
  { name: 'Lunch', time: '1:30 PM', items: '' },
  { name: 'Dinner', time: '8:30 PM', items: '' },
];
const EMPTY_DAYS: WorkoutDay[] = [{ day: 'Day 1', exercises: '' }];

type Editing = { kind: 'diet' | 'workout'; member: UserProfile } | null;

export const TrainerDashboard: React.FC = () => {
  const { profile, logout } = useAuth();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [editing, setEditing] = useState<Editing>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [meals, setMeals] = useState<DietMeal[]>(EMPTY_MEALS);
  const [days, setDays] = useState<WorkoutDay[]>(EMPTY_DAYS);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [progressFor, setProgressFor] = useState<UserProfile | null>(null);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState('');

  const openProgress = async (member: UserProfile) => {
    setProgressFor(member);
    setProgress([]);
    setProgressError('');
    setProgressLoading(true);
    try {
      setProgress(await listProgress(member.id));
    } catch (err: any) {
      setProgressError(err.message || 'Could not load progress');
    } finally {
      setProgressLoading(false);
    }
  };

  useEffect(() => {
    if (!profile) return;
    listTrainees(profile)
      .then(setMembers)
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [profile]);

  // Opens the editor pre-filled with the member's current plan, so trainers can edit it.
  const openEditor = async (kind: 'diet' | 'workout', member: UserProfile) => {
    setFormError('');
    setEditing({ kind, member });
    setTitle('');
    setNotes('');
    setMeals(EMPTY_MEALS);
    setDays(EMPTY_DAYS);
    try {
      const current = await getActivePlans(member.id);
      if (kind === 'diet' && current.diet) {
        setTitle(current.diet.title);
        setNotes(current.diet.notes ?? '');
        setMeals(current.diet.meals.length ? current.diet.meals : EMPTY_MEALS);
      }
      if (kind === 'workout' && current.workout) {
        setTitle(current.workout.title);
        setNotes(current.workout.notes ?? '');
        setDays(current.workout.schedule.length ? current.workout.schedule : EMPTY_DAYS);
      }
    } catch (err: any) {
      setFormError(`Could not load the current plan: ${err.message}`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !profile) return;
    setFormError('');
    setSaving(true);
    try {
      if (editing.kind === 'diet') {
        const filled = meals.filter((m) => m.name.trim() || m.items.trim());
        if (!filled.length) throw new Error('Add at least one meal.');
        await saveDietPlan(editing.member.id, { title, meals: filled, notes }, profile);
      } else {
        const filled = days.filter((d) => d.day.trim() || d.exercises.trim());
        if (!filled.length) throw new Error('Add at least one training day.');
        await saveWorkoutPlan(editing.member.id, { title, schedule: filled, notes }, profile);
      }
      setSuccessMsg(`${editing.kind === 'diet' ? 'Diet' : 'Workout'} plan "${title}" sent to ${editing.member.full_name}.`);
      setEditing(null);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Could not save the plan');
    } finally {
      setSaving(false);
    }
  };

  const updateMeal = (i: number, patch: Partial<DietMeal>) => setMeals((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const updateDay = (i: number, patch: Partial<WorkoutDay>) => setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  return (
    <>
      <Helmet>
        <title>Trainer Panel | RV Fitness</title>
      </Helmet>

      <div className="min-h-screen bg-gym-bg text-gym-text p-4 sm:p-6 max-w-7xl mx-auto flex flex-col gap-8">
        {/* Top Trainer Header */}
        <div className="bg-gym-surface border border-gym-border p-4 sm:p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0 w-full md:w-auto">
            <ProfilePhotoPicker size="lg" />
            <div className="min-w-0">
              <span className="text-xs font-heading text-gym-primary uppercase">COACH TERMINAL</span>
              <h1 className="text-2xl sm:text-3xl font-heading text-white uppercase break-words">{profile?.full_name}</h1>
              <p className="text-xs text-gym-muted break-all">{profile ? ROLE_LABELS[profile.role] : ''} · {profile?.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-2">
            {isAdminRole(profile?.role) && (
              <Link to="/admin/dashboard">
                <Button variant="outline" size="sm">Admin Panel</Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShowPassword(true)} leftIcon={<KeyRound className="w-4 h-4" />}>
              Change Password
            </Button>
            <Button variant="ghost" size="sm" onClick={logout} className="text-gym-danger">
              Sign Out
            </Button>
          </div>
        </div>

        {successMsg && (
          <div className="bg-gym-success/20 border border-gym-success text-gym-success p-4 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">{successMsg}</span>
          </div>
        )}

        {/* Assigned Members Grid */}
        <div className="space-y-4">
          <h2 className="text-2xl font-heading text-white uppercase flex items-center gap-2">
            <Users className="w-6 h-6 text-gym-primary" /> {profile?.role === 'trainer' ? 'YOUR ASSIGNED MEMBERS' : 'ALL MEMBERS'}
          </h2>

          {loadError && <div className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-3 rounded-xl text-sm">{loadError}</div>}
          {loading && <p className="text-sm text-gym-muted">Loading members...</p>}
          {!loading && !loadError && members.length === 0 && (
            <Card hoverEffect={false}>
              <p className="text-sm text-gym-muted">
                No members are assigned to you yet. The gym owner assigns members to trainers from Admin → Users & Roles.
              </p>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {members.map((m) => (
              <Card key={m.id} className="border-gym-primary/30 bg-gym-surface flex flex-col justify-between">
                <div className="flex items-center gap-4">
                  <Avatar src={m.avatar_url} name={m.full_name} size="lg" />
                  <div className="min-w-0">
                    <h3 className="text-2xl font-heading text-white uppercase mb-1 truncate">{m.full_name}</h3>
                    <p className="text-xs text-gym-muted truncate">{m.email}{m.phone ? ` · ${m.phone}` : ''}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-6 pt-4 border-t border-gym-border">
                  <Button
                    variant="primary"
                    size="sm"
                    className="col-span-2"
                    onClick={() => openProgress(m)}
                    leftIcon={<LineChart className="w-4 h-4" />}
                    aria-label={`View progress for ${m.full_name}`}
                  >
                    View Progress & Photos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditor('workout', m)}
                    leftIcon={<Dumbbell className="w-4 h-4 text-gym-primary" />}
                    aria-label={`Workout plan for ${m.full_name}`}
                  >
                    Workout Plan
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditor('diet', m)}
                    leftIcon={<Utensils className="w-4 h-4 text-gym-primary" />}
                    aria-label={`Diet plan for ${m.full_name}`}
                  >
                    Diet Plan
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <Modal
          isOpen={!!editing}
          onClose={() => setEditing(null)}
          maxWidth="2xl"
          title={editing ? `${editing.kind === 'diet' ? 'DIET' : 'WORKOUT'} PLAN · ${editing.member.full_name}` : ''}
        >
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <Input
              label="Plan Title"
              placeholder={editing?.kind === 'diet' ? 'e.g. High-Protein Fat Loss (2,100 kcal)' : 'e.g. 4-Day Push/Pull Split'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            {editing?.kind === 'diet' ? (
              <div className="flex flex-col gap-3">
                <span className="text-sm font-medium text-gym-muted">Meals</span>
                {meals.map((meal, i) => (
                  <div key={i} className="border border-gym-border rounded-lg p-3 flex flex-col gap-2">
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
                  <div key={i} className="border border-gym-border rounded-lg p-3 flex flex-col gap-2">
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

        <Modal
          isOpen={!!progressFor}
          onClose={() => setProgressFor(null)}
          maxWidth="2xl"
          title={progressFor ? `PROGRESS · ${progressFor.full_name}` : ''}
        >
          {progressError && <p role="alert" className="text-sm text-gym-danger mb-3">{progressError}</p>}
          {progressLoading ? (
            <p className="text-sm text-gym-muted">Loading progress...</p>
          ) : (
            progressFor && <ProgressTimeline entries={progress} memberName={progressFor.full_name} />
          )}
        </Modal>

        <ChangePasswordModal isOpen={showPassword} onClose={() => setShowPassword(false)} />
      </div>
    </>
  );
};

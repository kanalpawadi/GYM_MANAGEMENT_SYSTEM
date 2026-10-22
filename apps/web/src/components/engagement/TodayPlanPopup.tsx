import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellOff, Droplets, Dumbbell, Minus, Plus, Utensils } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { DietPlan, WorkoutPlan, getActivePlans } from '../../services/portal';
import { getWater, setWater } from '../../services/gym';
import { disableReminders, enableReminders, notificationsSupported, remindersEnabled, startReminders } from '../../utils/reminders';

const WATER_GOAL = 8;
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Picks today's training day: a day named after today's weekday, otherwise rotates through the plan. */
export function todaysWorkoutDay(plan: WorkoutPlan | null, now = new Date()) {
  if (!plan?.schedule?.length) return null;
  const weekday = WEEKDAYS[now.getDay()];
  const named = plan.schedule.find((d) => d.day.toLowerCase().includes(weekday));
  if (named) return named;
  const dayIndex = Math.floor(now.getTime() / 86400000);
  return plan.schedule[dayIndex % plan.schedule.length];
}

const seenKey = (id: string) => `rv_today_popup_${id}_${new Date().toISOString().slice(0, 10)}`;

/** Once-a-day card with today's meals, workout and water goal (shown on the member dashboard). */
export const TodayPlanPopup: React.FC = () => {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [diet, setDiet] = useState<DietPlan | null>(null);
  const [workout, setWorkout] = useState<WorkoutPlan | null>(null);
  const [glasses, setGlasses] = useState(0);
  const [reminders, setReminders] = useState(remindersEnabled());

  useEffect(() => {
    if (!profile || profile.role !== 'member') return;
    let stop: (() => void) | undefined;
    Promise.all([getActivePlans(profile.id), getWater(profile.id)])
      .then(([plans, water]) => {
        setDiet(plans.diet);
        setWorkout(plans.workout);
        setGlasses(water);
        stop = startReminders(plans.diet?.meals ?? []);
        let seen = false;
        try {
          seen = !!localStorage.getItem(seenKey(profile.id));
        } catch {
          // ignore
        }
        if (!seen && (plans.diet || plans.workout)) setOpen(true);
      })
      .catch(() => undefined);
    return () => stop?.();
  }, [profile]);

  const close = () => {
    setOpen(false);
    try {
      if (profile) localStorage.setItem(seenKey(profile.id), '1');
    } catch {
      // ignore
    }
  };

  const changeWater = async (next: number) => {
    if (!profile) return;
    const value = Math.max(0, Math.min(30, next));
    setGlasses(value);
    await setWater(profile.id, value).catch(() => undefined);
  };

  const toggleReminders = async () => {
    if (reminders) {
      disableReminders();
      setReminders(false);
    } else {
      setReminders(await enableReminders());
    }
  };

  const today = todaysWorkoutDay(workout);
  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <Modal isOpen={open} onClose={close} title={`TODAY · ${dateLabel}`} maxWidth="lg">
      <div className="flex flex-col gap-5">
        {diet && (
          <section aria-label="Today's meals">
            <h4 className="font-heading text-white flex items-center gap-2 mb-2">
              <Utensils className="w-4 h-4 text-gym-primary" /> Today's meals
            </h4>
            <ul className="flex flex-col gap-2">
              {diet.meals.map((m, i) => (
                <li key={i} className="bg-black/40 border border-gym-border rounded-xl px-3 py-2">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="font-heading text-white">{m.name}</span>
                    {m.time && <span className="text-xs text-gym-primary">{m.time}</span>}
                  </div>
                  <p className="text-xs text-gym-muted">{m.items}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {today && (
          <section aria-label="Today's workout">
            <h4 className="font-heading text-white flex items-center gap-2 mb-2">
              <Dumbbell className="w-4 h-4 text-gym-primary" /> Today's workout
            </h4>
            <div className="bg-black/40 border border-gym-border rounded-xl px-3 py-2">
              <p className="text-sm font-heading text-white">{today.day}</p>
              <p className="text-xs text-gym-muted whitespace-pre-line">{today.exercises}</p>
            </div>
          </section>
        )}

        <section aria-label="Water intake" className="bg-gym-primary/10 border border-gym-primary/30 rounded-xl p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-sky-400" />
            <div>
              <p className="text-sm font-heading text-white">Water: {glasses} / {WATER_GOAL} glasses</p>
              <p className="text-xs text-gym-muted">{glasses >= WATER_GOAL ? 'Goal reached. Great job!' : 'Tap + after every glass.'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Remove a glass" onClick={() => changeWater(glasses - 1)} className="p-2 rounded-lg border border-gym-border text-white">
              <Minus className="w-4 h-4" />
            </button>
            <button type="button" aria-label="Add a glass" onClick={() => changeWater(glasses + 1)} className="p-2 rounded-lg bg-gold-gradient text-black">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row gap-2">
          {notificationsSupported() && (
            <Button type="button" variant="outline" className="flex-1" onClick={toggleReminders} leftIcon={reminders ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}>
              {reminders ? 'Turn off reminders' : 'Remind me (meals & water)'}
            </Button>
          )}
          <Link to="/portal/plans" className="flex-1" onClick={close}>
            <Button variant="primary" className="w-full">See full plan</Button>
          </Link>
        </div>
      </div>
    </Modal>
  );
};

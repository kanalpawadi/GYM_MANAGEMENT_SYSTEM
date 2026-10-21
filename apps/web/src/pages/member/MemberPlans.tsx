import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Utensils, Dumbbell, Clock, UserCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { DietPlan, WorkoutPlan, getActivePlans } from '../../services/portal';
import { MyTrainerCard } from '../../components/account/MyTrainerCard';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const AssignedBy: React.FC<{ name?: string | null; date: string }> = ({ name, date }) => (
  <p className="text-xs text-gym-muted flex items-center gap-1.5">
    <UserCheck className="w-3.5 h-3.5 text-gym-primary" />
    {name ? <>Assigned by <strong className="text-white">{name}</strong></> : 'Assigned'} on {formatDate(date)}
  </p>
);

const EmptyPlan: React.FC<{ what: string }> = ({ what }) => (
  <p className="text-sm text-gym-muted">
    Your trainer hasn't assigned a {what} yet. Ask at the front desk to get a trainer assigned.
  </p>
);

// Shows the diet and workout plans a trainer assigned to the signed-in member.
export const MemberPlans: React.FC = () => {
  const { profile } = useAuth();
  const [diet, setDiet] = useState<DietPlan | null>(null);
  const [workout, setWorkout] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) return;
    getActivePlans(profile.id)
      .then((plans) => {
        setDiet(plans.diet);
        setWorkout(plans.workout);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [profile]);

  return (
    <>
      <Helmet>
        <title>My Diet & Workout Plan | RV Fitness</title>
      </Helmet>

      <div className="flex flex-col gap-8">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">FROM YOUR TRAINER</span>
          <h1 className="text-4xl font-heading text-white uppercase tracking-wide mt-1">
            MY DIET & <span className="text-gym-primary">WORKOUT</span>
          </h1>
        </div>

        <MyTrainerCard />

        {error && <div className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-3 rounded-xl text-sm">Could not load your plans: {error}</div>}

        {loading ? (
          <p className="text-gym-muted text-sm">Loading your plans...</p>
        ) : error ? null : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card hoverEffect={false} className="flex flex-col gap-4" aria-label="Diet plan">
              <h2 className="text-2xl font-heading text-white uppercase flex items-center gap-2">
                <Utensils className="w-6 h-6 text-gym-primary" /> Diet Plan
              </h2>
              {diet ? (
                <>
                  <div>
                    <h3 className="text-xl font-heading text-gym-primary uppercase">{diet.title}</h3>
                    <AssignedBy name={diet.trainer_name} date={diet.created_at} />
                  </div>
                  <ul className="divide-y divide-gym-border border border-gym-border rounded-lg">
                    {diet.meals.map((meal, i) => (
                      <li key={i} className="p-3 flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-heading text-white uppercase">{meal.name}</span>
                          {meal.time && (
                            <span className="text-xs text-gym-muted flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> {meal.time}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gym-muted whitespace-pre-line">{meal.items}</p>
                      </li>
                    ))}
                  </ul>
                  {diet.notes && <p className="text-sm text-gym-muted whitespace-pre-line border-l-2 border-gym-primary pl-3">{diet.notes}</p>}
                </>
              ) : (
                <EmptyPlan what="diet plan" />
              )}
            </Card>

            <Card hoverEffect={false} className="flex flex-col gap-4" aria-label="Workout plan">
              <h2 className="text-2xl font-heading text-white uppercase flex items-center gap-2">
                <Dumbbell className="w-6 h-6 text-gym-primary" /> Workout Plan
              </h2>
              {workout ? (
                <>
                  <div>
                    <h3 className="text-xl font-heading text-gym-primary uppercase">{workout.title}</h3>
                    <AssignedBy name={workout.trainer_name} date={workout.created_at} />
                  </div>
                  <ul className="divide-y divide-gym-border border border-gym-border rounded-lg">
                    {workout.schedule.map((day, i) => (
                      <li key={i} className="p-3 flex flex-col gap-1">
                        <span className="font-heading text-white uppercase">{day.day}</span>
                        <p className="text-sm text-gym-muted whitespace-pre-line">{day.exercises}</p>
                      </li>
                    ))}
                  </ul>
                  {workout.notes && <p className="text-sm text-gym-muted whitespace-pre-line border-l-2 border-gym-primary pl-3">{workout.notes}</p>}
                </>
              ) : (
                <EmptyPlan what="workout plan" />
              )}
            </Card>
          </div>
        )}
      </div>
    </>
  );
};

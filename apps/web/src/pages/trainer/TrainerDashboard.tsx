import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Dumbbell, Users, Plus, Utensils, Activity, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';

export const TrainerDashboard: React.FC = () => {
  const { profile, logout } = useAuth();
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showDietModal, setShowDietModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState('Rahul Sharma');
  const [successMsg, setSuccessMsg] = useState('');

  // Workout form
  const [planTitle, setPlanTitle] = useState('Hypertrophy 4-Day Push/Pull Split');
  const [exerciseDetails, setExerciseDetails] = useState('Day 1: Bench Press 4x8, Incline Dumbbell Press 3x10, Tricep Dips 3x12');

  // Diet form
  const [dietTitle, setDietTitle] = useState('High-Protein Calorie Deficit Plan (2,100 kcal)');
  const [meals, setMeals] = useState('Breakfast: 4 egg whites + oats. Lunch: 150g grilled chicken + brown rice. Dinner: Paneer bhurji + salad.');

  const assignedMembers = [
    { id: 'm1', name: 'Rahul Sharma', goal: 'Muscle Gain & Strength', weight: '74.5 kg', lastCheckin: 'Today @ 07:30 AM' },
    { id: 'm2', name: 'Sneha Reddy', goal: 'Fat Loss & Flexibility', weight: '58.0 kg', lastCheckin: 'Yesterday' },
  ];

  const handleSaveWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(`Workout plan "${planTitle}" assigned to ${selectedMember}!`);
    setShowWorkoutModal(false);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSaveDiet = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(`Diet plan "${dietTitle}" assigned to ${selectedMember}!`);
    setShowDietModal(false);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <>
      <Helmet>
        <title>Trainer Panel | RV-Fitness Gym</title>
      </Helmet>

      <div className="min-h-screen bg-gym-bg text-gym-text p-6 max-w-7xl mx-auto flex flex-col gap-8">
        {/* Top Trainer Header */}
        <div className="bg-gym-surface border border-gym-border p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={profile?.avatar_url || 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?auto=format&fit=crop&w=200&q=80'}
              alt={profile?.full_name}
              className="w-16 h-16 rounded-full object-cover border-2 border-gym-primary"
            />
            <div>
              <span className="text-xs font-heading text-gym-primary uppercase">HEAD COACH TERMINAL</span>
              <h1 className="text-3xl font-heading text-white uppercase">{profile?.full_name || 'Coach Vikram Sharma'}</h1>
              <p className="text-xs text-gym-muted">Specialization: CrossFit & Heavy Strength Conditioning</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-gym-danger">
            Sign Out
          </Button>
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
            <Users className="w-6 h-6 text-gym-primary" /> YOUR ASSIGNED ATHLETES
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assignedMembers.map((m) => (
              <Card key={m.id} className="border-gym-primary/30 bg-gym-surface flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-2xl font-heading text-white uppercase">{m.name}</h3>
                    <span className="text-xs bg-gym-primary/20 text-gym-primary font-heading px-2.5 py-0.5 rounded border border-gym-primary/40 uppercase font-bold">
                      {m.weight}
                    </span>
                  </div>
                  <p className="text-xs text-gym-muted mb-4">Target Goal: <strong className="text-white">{m.goal}</strong></p>
                  <p className="text-xs text-gym-muted">Last Gym Check-in: <strong className="text-gym-success">{m.lastCheckin}</strong></p>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-6 pt-4 border-t border-gym-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedMember(m.name);
                      setShowWorkoutModal(true);
                    }}
                    leftIcon={<Dumbbell className="w-4 h-4 text-gym-primary" />}
                  >
                    Assign Workout
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedMember(m.name);
                      setShowDietModal(true);
                    }}
                    leftIcon={<Utensils className="w-4 h-4 text-gym-primary" />}
                  >
                    Assign Diet
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Workout Plan Modal */}
        <Modal isOpen={showWorkoutModal} onClose={() => setShowWorkoutModal(false)} title={`ASSIGN WORKOUT PLAN (${selectedMember})`}>
          <form onSubmit={handleSaveWorkout} className="flex flex-col gap-4">
            <Input label="Workout Plan Title" value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} required />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gym-muted">Daily Schedule & Exercises</label>
              <textarea
                rows={5}
                value={exerciseDetails}
                onChange={(e) => setExerciseDetails(e.target.value)}
                className="w-full bg-gym-surface text-white border border-gym-border rounded-lg p-3 text-sm font-body focus:outline-none focus:border-gym-primary"
                required
              />
            </div>
            <Button type="submit" variant="primary" className="mt-2">Save & Send to Member</Button>
          </form>
        </Modal>

        {/* Diet Plan Modal */}
        <Modal isOpen={showDietModal} onClose={() => setShowDietModal(false)} title={`ASSIGN NUTRITION & DIET PLAN (${selectedMember})`}>
          <form onSubmit={handleSaveDiet} className="flex flex-col gap-4">
            <Input label="Diet Plan Title" value={dietTitle} onChange={(e) => setDietTitle(e.target.value)} required />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gym-muted">Daily Meals & Macros (Indian Calorie Deficit/Surplus)</label>
              <textarea
                rows={5}
                value={meals}
                onChange={(e) => setMeals(e.target.value)}
                className="w-full bg-gym-surface text-white border border-gym-border rounded-lg p-3 text-sm font-body focus:outline-none focus:border-gym-primary"
                required
              />
            </div>
            <Button type="submit" variant="primary" className="mt-2">Save & Send to Member</Button>
          </form>
        </Modal>
      </div>
    </>
  );
};

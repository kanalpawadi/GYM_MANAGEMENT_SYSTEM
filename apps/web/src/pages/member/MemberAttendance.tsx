import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Flame, CalendarCheck, CheckCircle2, Award } from 'lucide-react';
import { Card } from '../../components/ui/Card';

export const MemberAttendance: React.FC = () => {
  // Calendar days mock for October 2026
  const totalDaysInMonth = 31;
  const checkedInDays = [1, 2, 3, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 19, 20, 21];

  return (
    <>
      <Helmet>
        <title>Attendance History & Streak | RV-Fitness Gym</title>
      </Helmet>

      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">WORKOUT CONSISTENCY</span>
          <h1 className="text-4xl font-heading text-white uppercase tracking-wide mt-1">
            ATTENDANCE <span className="text-gym-primary">LOG & STREAK</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="border-amber-500/40 bg-gym-surface text-center">
            <Flame className="w-8 h-8 text-amber-400 fill-amber-400 mx-auto mb-2" />
            <h3 className="text-3xl font-heading text-amber-400 uppercase">14 DAYS STREAK</h3>
            <p className="text-xs text-gym-muted mt-1">Current unbroken active streak</p>
          </Card>
          <Card className="border-gym-primary/40 bg-gym-surface text-center">
            <CalendarCheck className="w-8 h-8 text-gym-primary mx-auto mb-2" />
            <h3 className="text-3xl font-heading text-white uppercase">18 WORKOUTS</h3>
            <p className="text-xs text-gym-muted mt-1">Total check-ins this month</p>
          </Card>
          <Card className="border-gym-success/40 bg-gym-surface text-center">
            <Award className="w-8 h-8 text-gym-success mx-auto mb-2" />
            <h3 className="text-3xl font-heading text-gym-success uppercase">82% CONSISTENCY</h3>
            <p className="text-xs text-gym-muted mt-1">Monthly target achievement</p>
          </Card>
        </div>

        {/* Monthly Calendar View */}
        <Card className="border-gym-border bg-gym-surface">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-heading text-white uppercase">OCTOBER 2026 CALENDAR</h3>
            <span className="text-xs text-gym-muted">🟢 Green = Verified Check-in Pass</span>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-heading text-gym-muted uppercase mb-3">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {[...Array(totalDaysInMonth)].map((_, i) => {
              const dayNum = i + 1;
              const isCheckedIn = checkedInDays.includes(dayNum);
              return (
                <div
                  key={dayNum}
                  className={`h-14 rounded-lg flex flex-col items-center justify-center border font-heading text-sm transition-all ${
                    isCheckedIn
                      ? 'bg-gym-success/20 border-gym-success text-gym-success font-bold'
                      : 'bg-gym-bg border-gym-border text-gym-muted'
                  }`}
                >
                  <span>{dayNum}</span>
                  {isCheckedIn && <CheckCircle2 className="w-3.5 h-3.5 text-gym-success mt-0.5" />}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </>
  );
};

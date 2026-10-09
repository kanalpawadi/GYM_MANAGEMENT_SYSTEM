import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ShieldCheck, Dumbbell, Award, Flame, HeartPulse } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';

export const About: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>About Us | RV-Fitness Gym India</title>
        <meta name="description" content="Learn about RV-Fitness Gym's mission, high-performance training facility, certified trainers, and state-of-the-art Hammer Strength equipment." />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-16">
        {/* Header Banner */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">OUR STORY & VISION</span>
          <h1 className="text-5xl sm:text-6xl font-heading text-white tracking-wide uppercase mt-1">
            BUILT FOR <span className="text-gym-primary">PERFORMANCE</span>
          </h1>
          <p className="text-base text-gym-muted mt-3 leading-relaxed">
            Founded with a passion to redefine fitness in India, RV-Fitness Gym combines elite strength training machinery, expert exercise science, and an unbeatable community culture.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-3xl font-heading text-white uppercase">
              MORE THAN A GYM. A <span className="text-gym-primary">FITNESS REVOLUTION.</span>
            </h2>
            <p className="text-sm text-gym-muted leading-relaxed">
              At RV-Fitness, we believe that fitness is a lifelong journey. Whether your goal is to drop body fat, pack on dense muscle, prepare for a competition, or simply maintain cardiovascular longevity, our facility is engineered to give you every competitive advantage.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-gym-primary shrink-0" />
                <span className="text-sm text-white font-medium">100% Biomechanically Verified Hammer Strength Equipment</span>
              </div>
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-gym-primary shrink-0" />
                <span className="text-sm text-white font-medium">ACE & K11 Certified Personal Trainers</span>
              </div>
              <div className="flex items-center gap-3">
                <HeartPulse className="w-5 h-5 text-gym-primary shrink-0" />
                <span className="text-sm text-white font-medium">Steam Bath & Post-Workout Recovery Protocol</span>
              </div>
            </div>
            <div className="pt-4">
              <Link to="/contact">
                <Button variant="primary">Visit Our Gym Today</Button>
              </Link>
            </div>
          </div>
          <div className="lg:col-span-6 grid grid-cols-2 gap-4">
            <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=600&q=80" alt="Gym Floor" className="rounded-xl border border-gym-border h-48 sm:h-64 object-cover w-full" />
            <img src="https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=600&q=80" alt="Cardio Zone" className="rounded-xl border border-gym-border h-48 sm:h-64 object-cover w-full mt-6" />
          </div>
        </div>

        {/* Mission Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="text-center">
            <h3 className="text-4xl font-heading text-gym-primary">10,000+ SQ FT</h3>
            <p className="text-sm font-heading text-white uppercase mt-1">Spacious Training Floor</p>
            <p className="text-xs text-gym-muted mt-2">Separate zones for free weights, functional CrossFit, cardio, and group dance studios.</p>
          </Card>
          <Card className="text-center">
            <h3 className="text-4xl font-heading text-gym-primary">50+ MACHINES</h3>
            <p className="text-sm font-heading text-white uppercase mt-1">Imported Equipment</p>
            <p className="text-xs text-gym-muted mt-2">Plate-loaded chest presses, hack squats, cable towers, and air bikes.</p>
          </Card>
          <Card className="text-center">
            <h3 className="text-4xl font-heading text-gym-primary">98% SATISFACTION</h3>
            <p className="text-sm font-heading text-white uppercase mt-1">Member Retention</p>
            <p className="text-xs text-gym-muted mt-2">Friendly staff, spotless locker rooms, and zero pushy sales tactics.</p>
          </Card>
        </div>
      </div>
    </>
  );
};

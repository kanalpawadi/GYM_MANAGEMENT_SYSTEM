import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Dumbbell, Flame, Activity, Heart, UserCheck, Scale, Check } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';

export const Programs: React.FC = () => {
  const programs = [
    {
      icon: <Dumbbell className="w-8 h-8 text-gym-primary" />,
      title: 'Heavy Strength & Muscle Building',
      desc: 'Build dense lean muscle and raw power with structured compound lifting routines, progressive overload, and hypertrophy protocols.',
      benefits: ['Hypertrophy Split Routines', 'Bench, Squat & Deadlift Coaching', 'Plate-Loaded Hammer Machines', 'Progressive Overload Logs'],
      image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=600&q=80',
    },
    {
      icon: <Flame className="w-8 h-8 text-gym-primary" />,
      title: 'CrossFit & Functional Fitness',
      desc: 'High-intensity functional movements designed to boost endurance, agility, VO2 max, and explosive athletic power.',
      benefits: ['Olympic Weightlifting Racks', 'Kettlebell & Plyometric Workouts', 'Rowers & Assault Air Bikes', 'Weekly Endurance Challenges'],
      image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80',
    },
    {
      icon: <Activity className="w-8 h-8 text-gym-primary" />,
      title: 'High-Energy Zumba & Dance Cardio',
      desc: 'Burn up to 600 calories per hour in a fun, rhythmic party atmosphere led by licensed Zumba dance instructors.',
      benefits: ['Latin & Bollywood Beats', 'Core & Leg Toning', 'Full Body Cardio Burn', 'High Energy Group Vibe'],
      image: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?auto=format&fit=crop&w=600&q=80',
    },
    {
      icon: <Heart className="w-8 h-8 text-gym-primary" />,
      title: 'Mindful Ashtanga Yoga & Mobility',
      desc: 'Enhance joint mobility, spinal alignment, posture correction, and mental calm through traditional yoga practices.',
      benefits: ['Breathwork & Pranayama', 'Deep Muscle Flexibility', 'Postural Alignment', 'Stress Reduction & Recovery'],
      image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80',
    },
    {
      icon: <UserCheck className="w-8 h-8 text-gym-primary" />,
      title: '1-on-1 VIP Personal Training',
      desc: 'Dedicated 1-on-1 coaching customized strictly to your body type, medical history, and target timeframe.',
      benefits: ['Custom Diet & Macro Chart', 'Form Correction & Spotting', 'Weekly Fat & Muscle Audit', 'Guaranteed Results Timeline'],
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=600&q=80',
    },
    {
      icon: <Scale className="w-8 h-8 text-gym-primary" />,
      title: 'Fat Loss & Body Transformation',
      desc: 'Targeted caloric deficit protocols combined with HIIT cardio to drop body fat percentages while maintaining muscle mass.',
      benefits: ['InBody Composition Test', 'Indian Calorie Deficit Guide', 'Fat Burn HIIT Circuit', 'Personal Accountability Coach'],
      image: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=600&q=80',
    },
  ];

  return (
    <>
      <Helmet>
        <title>Fitness Programs & Services | RV-Fitness Gym</title>
        <meta name="description" content="Explore RV-Fitness Gym programs: Strength Training, CrossFit, Zumba, Yoga, Personal Training, and Fat Loss Transformation." />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-12">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">TAILORED TRAINING FOR EVERY GOAL</span>
          <h1 className="text-5xl font-heading text-white tracking-wide uppercase mt-1">
            OUR FITNESS <span className="text-gym-primary">PROGRAMS</span>
          </h1>
          <p className="text-sm text-gym-muted mt-2">
            Whether you want to build strength, drop fat, or boost flexibility, we have a specialized program designed for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {programs.map((prog, idx) => (
            <Card key={idx} className="flex flex-col justify-between overflow-hidden group">
              <div>
                <div className="h-48 overflow-hidden rounded-lg mb-4 relative">
                  <img src={prog.image} alt={prog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute top-3 left-3 bg-gym-bg/90 p-2 rounded-lg border border-gym-border">
                    {prog.icon}
                  </div>
                </div>
                <h3 className="text-2xl font-heading text-white uppercase mb-2">{prog.title}</h3>
                <p className="text-xs text-gym-muted leading-relaxed mb-4">{prog.desc}</p>
                <div className="space-y-2 mb-6 border-t border-gym-border pt-4">
                  {prog.benefits.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gym-text">
                      <Check className="w-3.5 h-3.5 text-gym-primary shrink-0" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link to="/contact" className="w-full">
                <Button variant="outline" size="sm" className="w-full">
                  Book Program Consultation
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
};

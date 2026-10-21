import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Dumbbell, Flame, Activity, Heart, UserCheck, Scale, Check } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { useContent } from '../../content/ContentContext';

export const Programs: React.FC = () => {
  const programs = useContent('programs').items;
  const icons = [Dumbbell, Flame, Activity, Heart, UserCheck, Scale];

  return (
    <>
      <Helmet>
        <title>Fitness Programs & Services | RV Fitness</title>
        <meta name="description" content="Explore RV Fitness programs: Strength Training, CrossFit, Zumba, Yoga, Personal Training, and Fat Loss Transformation." />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-12">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">TAILORED TRAINING FOR EVERY GOAL</span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl break-words font-heading text-white tracking-wide uppercase mt-1">
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
                    {React.createElement(icons[idx % icons.length], { className: 'w-8 h-8 text-gym-primary' })}
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

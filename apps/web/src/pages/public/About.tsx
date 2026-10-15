import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ShieldCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { SITE, PRINCIPLES, FORCES } from '../../config/site';

export const About: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>{`About Us | ${SITE.fullName}`}</title>
        <meta name="description" content={SITE.about} />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-16">
        {/* Header Banner */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">OUR STORY & VISION</span>
          <h1 className="text-5xl sm:text-6xl font-heading text-white tracking-wide uppercase mt-1">
            BUILD YOUR <span className="text-gym-primary">STRENGTH.</span> DEFINE YOURSELF.
          </h1>
          <p className="text-base text-gym-muted mt-3 leading-relaxed">
            {SITE.about}
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-3xl font-heading text-white uppercase">
              MORE THAN A <span className="text-gym-primary">GYM.</span>
            </h2>
            <p className="text-sm text-gym-muted leading-relaxed">
              {SITE.name} is a space where effort meets intent — built for those who refuse to settle. Founded by {SITE.founder}, our gym in {SITE.location} is built around a simple belief: {SITE.tagline.toLowerCase()}
            </p>
            <div className="space-y-3 pt-2">
              {PRINCIPLES.map((principle) => (
                <div key={principle} className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-gym-primary shrink-0" />
                  <span className="text-sm text-white font-medium">{principle}</span>
                </div>
              ))}
            </div>
            <div className="pt-4">
              <Link to="/contact">
                <Button variant="primary">Visit {SITE.name} Today</Button>
              </Link>
            </div>
          </div>
          <div className="lg:col-span-6 grid grid-cols-2 gap-4">
            <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=600&q=80" alt="Gym Floor" className="rounded-xl border border-gym-border h-48 sm:h-64 object-cover w-full" />
            <img src="https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=600&q=80" alt="Cardio Zone" className="rounded-xl border border-gym-border h-48 sm:h-64 object-cover w-full mt-6" />
          </div>
        </div>

        {/* Four Forces of Progress */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FORCES.map((force) => (
            <Card key={force} className="text-center">
              <h3 className="text-4xl font-heading text-gym-primary uppercase">{force}</h3>
              <p className="text-sm font-heading text-white uppercase mt-1">The {SITE.name} Mindset</p>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
};

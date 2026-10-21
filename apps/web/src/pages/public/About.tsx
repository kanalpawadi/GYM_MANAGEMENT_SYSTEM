import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ShieldCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { useContent, useSiteInfo } from '../../content/ContentContext';

export const About: React.FC = () => {
  const site = useSiteInfo();
  const about = useContent('about');
  return (
    <>
      <Helmet>
        <title>{`About Us | ${site.fullName}`}</title>
        <meta name="description" content={site.about} />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-16">
        {/* Header Banner */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">OUR STORY & VISION</span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl break-words font-heading text-white tracking-wide uppercase mt-1">
            BUILD YOUR <span className="text-gym-primary">STRENGTH.</span> DEFINE YOURSELF.
          </h1>
          <p className="text-base text-gym-muted mt-3 leading-relaxed">
            {site.about}
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-3xl font-heading text-white uppercase">
              MORE THAN A <span className="text-gym-primary">GYM.</span>
            </h2>
            <p className="text-sm text-gym-muted leading-relaxed">
              {about.story}
            </p>
            <div className="space-y-3 pt-2">
              {about.principles.map((principle) => (
                <div key={principle} className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-gym-primary shrink-0" />
                  <span className="text-sm text-white font-medium">{principle}</span>
                </div>
              ))}
            </div>
            <div className="pt-4">
              <Link to="/contact">
                <Button variant="primary">Visit {site.name} Today</Button>
              </Link>
            </div>
          </div>
          <div className="lg:col-span-6 grid grid-cols-2 gap-4">
            <img src={about.imageOne} alt="Gym Floor" className="rounded-xl border border-gym-border h-48 sm:h-64 object-cover w-full" />
            <img src={about.imageTwo} alt="Cardio Zone" className="rounded-xl border border-gym-border h-48 sm:h-64 object-cover w-full mt-6" />
          </div>
        </div>

        {/* Four Forces of Progress */}
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">CORE PRINCIPLES</span>
            <h2 className="text-3xl sm:text-4xl font-heading text-white tracking-wide uppercase mt-1">
              THE FOUR FORCES OF <span className="text-gym-primary">PROGRESS</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Strength', img: '/images/gym/rushikesh-side-bicep.jpg', tag: 'FORCE 01' },
              { title: 'Discipline', img: '/images/gym/rushikesh-bw.jpg', tag: 'FORCE 02' },
              { title: 'Power', img: '/images/gym/rushikesh-warrior.jpg', tag: 'FORCE 03' },
              { title: 'Transformation', img: '/images/gym/rushikesh-gym-trophies.jpg', tag: 'FORCE 04' },
            ].map((force) => (
              <div
                key={force.title}
                className="group relative h-72 rounded-2xl overflow-hidden border border-gym-border shadow-xl bg-gym-surface flex flex-col justify-end p-5"
              >
                <img
                  src={force.img}
                  alt={force.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="relative z-10">
                  <span className="text-[10px] font-heading bg-gym-primary/20 text-gym-primary px-2.5 py-0.5 rounded-full border border-gym-primary/40 uppercase tracking-wider">
                    {force.tag}
                  </span>
                  <h3 className="text-2xl font-heading text-white uppercase mt-2">{force.title}</h3>
                  <p className="text-xs text-gym-muted uppercase mt-0.5 font-heading">The {site.name} Mindset</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Star, Award, Calendar } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { useContent } from '../../content/ContentContext';

export const Trainers: React.FC = () => {
  const [filter, setFilter] = useState('All');

  const trainers = useContent('trainers').items;

  const filteredTrainers = filter === 'All' ? trainers : trainers.filter((t) => t.category === filter);

  return (
    <>
      <Helmet>
        <title>Certified Personal Trainers | RV Fitness</title>
        <meta name="description" content="Meet RV Fitness's certified trainers specializing in bodybuilding, CrossFit, yoga, Zumba, and 1-on-1 personal coaching." />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-10">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">EXPERTS IN YOUR CORNER</span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl break-words font-heading text-white tracking-wide uppercase mt-1">
            MEET OUR <span className="text-gym-primary">COACHES</span>
          </h1>
          <p className="text-sm text-gym-muted mt-2">
            Certified exercise physiologists and fitness champions dedicated to pushing your boundaries safely.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {['All', ...Array.from(new Set(trainers.map((t) => t.category).filter(Boolean)))].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-lg font-heading text-sm uppercase transition-all ${
                filter === cat
                  ? 'bg-gold-gradient text-black font-bold shadow-yellow-glow'
                  : 'bg-gym-surface text-gym-muted border border-gym-border hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredTrainers.map((t, idx) => (
            <Card key={idx} className="flex flex-col justify-between overflow-hidden">
              <div>
                <img src={t.photo} alt={t.name} className="w-full h-64 object-cover rounded-lg mb-4" />
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-2xl font-heading text-white uppercase">{t.name}</h3>
                  <span className="text-xs font-heading text-gym-primary bg-gym-primary/10 px-2 py-0.5 rounded border border-gym-primary/30">
                    {t.rating}
                  </span>
                </div>
                <p className="text-xs font-heading text-gym-primary uppercase mb-2">{t.specialization}</p>
                <div className="flex items-center gap-1.5 text-xs text-gym-muted mb-3">
                  <Award className="w-3.5 h-3.5 text-gym-primary" />
                  <span>{t.experience}</span>
                </div>
                <p className="text-xs text-gym-muted leading-relaxed mb-6">{t.bio}</p>
              </div>
              <Link to="/contact" className="w-full">
                <Button variant="primary" size="sm" className="w-full" leftIcon={<Calendar className="w-4 h-4" />}>
                  Book PT Session
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
};

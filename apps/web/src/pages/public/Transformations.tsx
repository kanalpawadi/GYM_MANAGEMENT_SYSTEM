import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Trophy, ArrowRight, Quote } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { useContent } from '../../content/ContentContext';

export const Transformations: React.FC = () => {
  const transformations = useContent('transformations').items;

  return (
    <>
      <Helmet>
        <title>Member Transformations & Results | RV Fitness</title>
        <meta name="description" content="See real member weight loss and muscle gain transformations achieved at RV Fitness, Narsobawadi." />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-12">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">REAL PEOPLE. REAL RESULTS.</span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl break-words font-heading text-white tracking-wide uppercase mt-1">
            TRANSFORMATION <span className="text-gym-primary">GALLERY</span>
          </h1>
          <p className="text-sm text-gym-muted mt-2">
            Explore verified fitness journeys of RV Fitness members who achieved dramatic health and body composition changes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {transformations.map((item, idx) => (
            <Card key={idx} className="flex flex-col justify-between border-gym-primary/40">
              <div>
                {/* Visual Comparison */}
                <div className="grid grid-cols-2 gap-2 mb-4 relative">
                  <div className="relative">
                    <img src={item.beforeImg} alt={`${item.name} Before`} className="w-full h-48 object-cover rounded-lg grayscale" />
                    <span className="absolute bottom-2 left-2 bg-black/80 text-white font-heading text-xs px-2 py-0.5 rounded">BEFORE</span>
                  </div>
                  <div className="relative">
                    <img src={item.afterImg} alt={`${item.name} After`} className="w-full h-48 object-cover rounded-lg border-2 border-gym-primary" />
                    <span className="absolute bottom-2 right-2 bg-gold-gradient text-black font-heading text-xs px-2 py-0.5 rounded font-bold">AFTER</span>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-2xl font-heading text-white uppercase">{item.name}</h3>
                  <span className="text-xs font-heading bg-gym-primary/20 text-gym-primary px-2.5 py-0.5 rounded border border-gym-primary/40 uppercase">
                    {item.weightChange}
                  </span>
                </div>
                <div className="text-xs text-gym-muted flex items-center justify-between mb-4 pb-3 border-b border-gym-border">
                  <span>Duration: <strong className="text-white">{item.duration}</strong></span>
                  <span>Coach: <strong className="text-gym-primary">{item.coach}</strong></span>
                </div>

                <p className="text-xs text-gym-muted italic leading-relaxed relative pl-4 border-l-2 border-gym-primary mb-6">
                  "{item.story}"
                </p>
              </div>

              <Link to="/contact" className="w-full">
                <Button variant="primary" size="sm" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Start Your Transformation
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
};

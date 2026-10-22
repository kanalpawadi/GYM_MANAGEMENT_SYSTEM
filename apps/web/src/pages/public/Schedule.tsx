import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Calendar, Clock, MapPin, User, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { useContent } from '../../content/ContentContext';

export const Schedule: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Edited in Admin → Website Editor → Class Schedule.
  const timetable = useContent('schedule').items;
  const categories = ['All', ...Array.from(new Set(timetable.map((t) => t.category).filter(Boolean)))];

  const filtered = timetable.filter(
    (item) => item.day === selectedDay && (selectedCategory === 'All' || item.category === selectedCategory)
  );

  return (
    <>
      <Helmet>
        <title>Weekly Class Schedule | RV Fitness</title>
        <meta name="description" content="View weekly class schedule for Zumba, Power Yoga, CrossFit, HIIT, and Strength conditioning at RV Fitness." />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-10">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">LIVE TIMETABLE</span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl break-words font-heading text-white tracking-wide uppercase mt-1">
            CLASS <span className="text-gym-primary">SCHEDULE</span>
          </h1>
          <p className="text-sm text-gym-muted mt-2">
            Filter classes by day of the week and program type. Ask our trainers at the front desk for the latest batch timings.
          </p>
        </div>

        {/* Day Selector Tabs */}
        <div className="flex overflow-x-auto gap-2 border-b border-gym-border pb-3 no-scrollbar">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-5 py-2.5 rounded-lg font-heading text-base uppercase whitespace-nowrap transition-all ${
                selectedDay === day
                  ? 'bg-gold-gradient text-black font-bold shadow-yellow-glow'
                  : 'bg-gym-surface text-gym-muted border border-gym-border hover:text-white'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gym-muted uppercase font-heading mr-2">Category:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-heading uppercase ${
                selectedCategory === cat
                  ? 'bg-gym-primary/20 text-gym-primary border border-gym-primary/40 font-bold'
                  : 'bg-gym-surface text-gym-muted hover:text-white border border-gym-border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Schedule Grid */}
        {filtered.length === 0 ? (
          <div className="bg-gym-surface border border-gym-border p-12 text-center rounded-xl">
            <p className="text-gym-muted">No group classes scheduled for {selectedDay} in {selectedCategory}. Open gym floor is active from 5:30 AM to 10:00 PM!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item, idx) => (
              <Card key={idx} className="flex flex-col justify-between border-gym-primary/30">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-heading bg-gym-primary/20 text-gym-primary px-2.5 py-0.5 rounded border border-gym-primary/40 uppercase">
                      {item.category}
                    </span>
                    <span className="text-xs text-gym-muted flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gym-primary" /> {item.time}
                    </span>
                  </div>
                  <h3 className="text-2xl font-heading text-white uppercase mt-2">{item.title}</h3>
                  <div className="space-y-1.5 text-xs text-gym-muted my-4">
                    {item.trainer && (
                      <p className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-gym-primary" /> Coach: <strong className="text-white">{item.trainer}</strong>
                      </p>
                    )}
                    {item.room && (
                      <p className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-gym-primary" /> Location: <strong className="text-white">{item.room}</strong>
                      </p>
                    )}
                  </div>
                </div>
                <Link to="/contact" className="w-full mt-4">
                  <Button variant="outline" size="sm" className="w-full">
                    Reserve Spot / Enquire
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

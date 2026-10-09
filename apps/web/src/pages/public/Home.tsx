import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Dumbbell, ShieldCheck, Trophy, Users, Flame, Star, ArrowRight, CheckCircle2, Calendar, Clock, MapPin } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { FitnessCalculators } from '../../components/calculators/FitnessCalculators';
import { bookFreeTrial } from '../../services/api';

export const Home: React.FC = () => {
  const [trialName, setTrialName] = useState('');
  const [trialPhone, setTrialPhone] = useState('');
  const [trialDate, setTrialDate] = useState('');
  const [trialSlot, setTrialSlot] = useState('Morning (6 AM - 10 AM)');
  const [trialSuccess, setTrialSuccess] = useState('');
  const [trialError, setTrialError] = useState('');
  const [trialLoading, setTrialLoading] = useState(false);
  const [honeypot, setHoneypot] = useState('');

  const handleTrialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrialSuccess('');
    setTrialError('');
    setTrialLoading(true);

    try {
      const res = await bookFreeTrial({
        name: trialName,
        phone: trialPhone,
        preferred_date: trialDate || new Date().toISOString().split('T')[0],
        preferred_slot: trialSlot,
        website_honeypot: honeypot,
      });
      setTrialSuccess(res.message);
      setTrialName('');
      setTrialPhone('');
    } catch (err: any) {
      setTrialError(err.message || 'Error booking trial pass');
    } finally {
      setTrialLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>RV-Fitness Gym | Premium Fitness & Gym Center in India</title>
        <meta name="description" content="Transform your body at RV-Fitness Gym. World-class Hammer Strength equipment, certified personal trainers, CrossFit, Yoga, Zumba & 1-day Free Trial pass!" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ExerciseGym",
            "name": "RV-Fitness Gym",
            "image": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
            "telePhone": "+919876543210",
            "email": "info@rvfitnessgym.in",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "Plot 42, Sector 18, Commercial Belt",
              "addressLocality": "Metro City",
              "addressCountry": "IN",
              "postalCode": "400705"
            },
            "openingHours": "Mo-Sa 05:30-22:00, Su 07:00-14:00",
            "priceRange": "₹1499 - ₹11999"
          })}
        </script>
      </Helmet>

      <div className="flex flex-col gap-16 md:gap-24 pb-16">
        {/* HERO SECTION */}
        <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-gym-bg border-b border-gym-border">
          {/* Background image overlay */}
          <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25 scale-105 transform transition-transform duration-1000" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1920&q=80')` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-gym-bg via-gym-bg/80 to-transparent" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Copy */}
            <div className="lg:col-span-7 flex flex-col gap-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gym-primary/10 border border-gym-primary/30 text-gym-primary font-heading text-sm uppercase tracking-wider w-fit">
                <Flame className="w-4 h-4" /> INDIA'S HIGHEST RATED GYM & FITNESS CLUB
              </div>

              <h1 className="text-5xl sm:text-6xl md:text-7xl font-heading text-white tracking-wide uppercase leading-none">
                UNLEASH YOUR <span className="text-gym-primary drop-shadow-[0_0_25px_rgba(255,212,0,0.4)]">TRUE POTENTIAL</span>
              </h1>

              <p className="text-lg text-gym-muted max-w-2xl font-body leading-relaxed">
                Step into a high-performance training ground built for champions. Heavy-duty Hammer Strength machinery, certified elite personal coaches, steam bath, and high-energy group fitness classes.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <Link to="/plans">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto" rightIcon={<ArrowRight className="w-5 h-5" />}>
                    Explore Plans & Join
                  </Button>
                </Link>
                <Link to="/schedule">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    View Class Timetable
                  </Button>
                </Link>
              </div>

              {/* Quick KPI stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gym-border/80">
                <div>
                  <h4 className="text-3xl font-heading text-gym-primary">1,200+</h4>
                  <p className="text-xs text-gym-muted uppercase font-heading">Active Members</p>
                </div>
                <div>
                  <h4 className="text-3xl font-heading text-gym-primary">15+</h4>
                  <p className="text-xs text-gym-muted uppercase font-heading">Certified Coaches</p>
                </div>
                <div>
                  <h4 className="text-3xl font-heading text-gym-primary">4.9 ★</h4>
                  <p className="text-xs text-gym-muted uppercase font-heading">Google Rating</p>
                </div>
              </div>
            </div>

            {/* Right Hero Form: Instant Free Trial Pass */}
            <div className="lg:col-span-5">
              <Card className="border-gym-primary/40 bg-gym-surface/90 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-2 text-gym-primary font-heading text-2xl uppercase mb-1">
                  <Calendar className="w-6 h-6" /> CLAIM 1-DAY FREE PASS
                </div>
                <p className="text-xs text-gym-muted mb-6">
                  Try all equipment, group classes, and steam room with zero obligation!
                </p>

                {trialSuccess ? (
                  <div className="bg-gym-success/20 border border-gym-success/40 text-gym-success p-4 rounded-xl text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 mx-auto" />
                    <h4 className="font-heading text-xl uppercase">PASS CONFIRMED!</h4>
                    <p className="text-xs text-white">{trialSuccess}</p>
                    <Button variant="outline" size="sm" onClick={() => setTrialSuccess('')} className="mt-2">
                      Book Another
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleTrialSubmit} className="flex flex-col gap-4">
                    {/* Honeypot field */}
                    <input
                      type="text"
                      name="website_honeypot"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                      className="hidden"
                      tabIndex={-1}
                      autoComplete="off"
                    />

                    <Input
                      label="Full Name"
                      placeholder="e.g. Rahul Sharma"
                      value={trialName}
                      onChange={(e) => setTrialName(e.target.value)}
                      required
                    />

                    <Input
                      label="Mobile Number (10-Digit Indian Phone)"
                      placeholder="9876543210"
                      type="tel"
                      value={trialPhone}
                      onChange={(e) => setTrialPhone(e.target.value)}
                      required
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Trial Date"
                        type="date"
                        value={trialDate}
                        onChange={(e) => setTrialDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                      <Select
                        label="Time Slot"
                        options={[
                          { label: 'Morning (6 AM - 10 AM)', value: 'Morning (6 AM - 10 AM)' },
                          { label: 'Afternoon (12 PM - 4 PM)', value: 'Afternoon (12 PM - 4 PM)' },
                          { label: 'Evening (5 PM - 9 PM)', value: 'Evening (5 PM - 9 PM)' },
                        ]}
                        value={trialSlot}
                        onChange={(e) => setTrialSlot(e.target.value)}
                      />
                    </div>

                    {trialError && <span className="text-xs text-gym-danger font-medium">{trialError}</span>}

                    <Button type="submit" variant="primary" isLoading={trialLoading} className="w-full mt-2">
                      Get Free Pass Now
                    </Button>

                    <p className="text-[11px] text-gym-muted text-center">
                      🔒 No credit card required. Show SMS at front desk.
                    </p>
                  </form>
                )}
              </Card>
            </div>
          </div>
        </section>

        {/* WHY CHOOSE RV-FITNESS (HIGHLIGHTS) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">WORLD-CLASS AMENITIES</span>
            <h2 className="text-4xl sm:text-5xl font-heading text-white tracking-wide uppercase mt-1">
              THE RV-FITNESS <span className="text-gym-primary">ADVANTAGE</span>
            </h2>
            <p className="text-sm text-gym-muted mt-2">
              Everything you need for strength, endurance, agility, and recovery under one roof.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-lg bg-gym-primary/10 text-gym-primary flex items-center justify-center">
                <Dumbbell className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-heading text-white uppercase">Heavy Steel & Hammer Equipment</h3>
              <p className="text-xs text-gym-muted leading-relaxed">
                Imported biomechanically precise machines, power racks, platform lifting decks, and dumbbells up to 50 kg.
              </p>
            </Card>

            <Card className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-lg bg-gym-primary/10 text-gym-primary flex items-center justify-center">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-heading text-white uppercase">Certified Master Trainers</h3>
              <p className="text-xs text-gym-muted leading-relaxed">
                ACE, K11, and Reebok certified fitness coaches who design personalized nutrition and workout plans.
              </p>
            </Card>

            <Card className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-lg bg-gym-primary/10 text-gym-primary flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-heading text-white uppercase">High Energy Group Classes</h3>
              <p className="text-xs text-gym-muted leading-relaxed">
                Daily Zumba, Power Yoga, CrossFit HIIT, and Strength bootcamps led by top studio instructors.
              </p>
            </Card>

            <Card className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-lg bg-gym-primary/10 text-gym-primary flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-heading text-white uppercase">Steam Room & Recovery Zone</h3>
              <p className="text-xs text-gym-muted leading-relaxed">
                Hygiene-first shower cubicles, personal lockers, steam sauna bath, and post-workout protein bar.
              </p>
            </Card>
          </div>
        </section>

        {/* FITNESS CALCULATORS SECTION */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <FitnessCalculators />
        </section>

        {/* PREVIEW MEMBERSHIP PLANS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">TRANSPARENT PRICING</span>
              <h2 className="text-4xl sm:text-5xl font-heading text-white tracking-wide uppercase mt-1">
                MEMBERSHIP <span className="text-gym-primary">PLANS</span>
              </h2>
            </div>
            <Link to="/plans">
              <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Compare All Features
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Monthly Starter', months: 1, original: '₹1,999', price: '₹1,499', badge: 'Flexible' },
              { title: 'Quarterly Fit', months: 3, original: '₹4,999', price: '₹3,999', badge: 'Most Popular', highlight: true },
              { title: 'Half-Yearly Pro', months: 6, original: '₹8,999', price: '₹6,999', badge: 'Best Value' },
              { title: 'Annual Elite', months: 12, original: '₹15,999', price: '₹11,999', badge: 'VIP Perks' },
            ].map((plan, idx) => (
              <Card
                key={idx}
                className={`flex flex-col justify-between relative ${
                  plan.highlight ? 'border-gym-primary shadow-yellow-glow bg-gym-surface' : ''
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-heading bg-gym-primary/20 text-gym-primary px-2.5 py-0.5 rounded-full border border-gym-primary/40 uppercase">
                      {plan.badge}
                    </span>
                    <span className="text-xs text-gym-muted">{plan.months} Month{plan.months > 1 ? 's' : ''}</span>
                  </div>
                  <h3 className="text-2xl font-heading text-white uppercase">{plan.title}</h3>
                  <div className="my-4">
                    <span className="text-xs text-gym-muted line-through mr-2">{plan.original}</span>
                    <span className="text-4xl font-heading text-gym-primary">{plan.price}</span>
                    <span className="text-xs text-gym-muted font-body"> + GST</span>
                  </div>
                </div>
                <Link to="/plans" className="w-full mt-6">
                  <Button variant={plan.highlight ? 'primary' : 'secondary'} className="w-full">
                    Select Plan
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </section>

        {/* TESTIMONIALS SLIDER */}
        <section className="bg-gym-surface border-y border-gym-border py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">SUCCESS STORIES</span>
              <h2 className="text-4xl sm:text-5xl font-heading text-white tracking-wide uppercase mt-1">
                MEMBER <span className="text-gym-primary">REVIEWS</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  name: 'Rahul Sharma',
                  achievement: 'Lost 18 kg in 6 Months',
                  review: 'RV-Fitness completely changed my life. I lost 18 kg in 6 months under Coach Vikram’s guidance. The vibe is unmatched!',
                  rating: 5,
                  image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
                },
                {
                  name: 'Sneha Reddy',
                  achievement: 'Gained Core Strength',
                  review: 'The Zumba and Yoga classes are top-tier. Clean lockers, high-energy environment, and super helpful trainers!',
                  rating: 5,
                  image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
                },
                {
                  name: 'Amit Verma',
                  achievement: 'Bench Press +30kg',
                  review: 'Best equipment setup in town! Hammer Strength machines and huge dumbbell rack up to 50 kg.',
                  rating: 5,
                  image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
                },
              ].map((item, idx) => (
                <Card key={idx} className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1 text-gym-primary mb-3">
                      {[...Array(item.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-gym-primary" />
                      ))}
                    </div>
                    <p className="text-sm text-gym-muted italic leading-relaxed mb-6">
                      "{item.review}"
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-4 border-t border-gym-border">
                    <img src={item.image} alt={item.name} className="w-12 h-12 rounded-full object-cover border border-gym-primary" />
                    <div>
                      <h4 className="text-lg font-heading text-white uppercase">{item.name}</h4>
                      <span className="text-xs text-gym-primary font-heading uppercase">{item.achievement}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* MAP & LOCATION SUMMARY */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-gym-surface border border-gym-border rounded-2xl overflow-hidden p-6 sm:p-8">
            <div className="lg:col-span-5 flex flex-col gap-4">
              <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">VISIT OUR FACILITY</span>
              <h3 className="text-3xl sm:text-4xl font-heading text-white uppercase">
                LOCATED IN THE HEART OF <span className="text-gym-primary">SECTOR 18</span>
              </h3>
              <div className="space-y-3 text-sm text-gym-muted pt-2">
                <p className="flex items-start gap-2.5">
                  <MapPin className="w-5 h-5 text-gym-primary shrink-0" />
                  <span>Plot 42, Sector 18, Commercial Belt, Metro City, India - 400705</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-gym-primary shrink-0" />
                  <span>Mon - Sat: 5:30 AM - 10:00 PM | Sun: 7:00 AM - 2:00 PM</span>
                </p>
              </div>
              <Link to="/contact" className="mt-4">
                <Button variant="primary" size="md">
                  Get Directions & Contact Us
                </Button>
              </Link>
            </div>
            <div className="lg:col-span-7 h-64 sm:h-80 rounded-xl overflow-hidden border border-gym-border">
              <iframe
                title="RV Fitness Gym Location Map"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3770.7924840801875!2d73.0135!3d19.0305!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTnCsDAxJzefOC44Ik4gNzPCsDAwJzQ4LjYiRQ!5e0!3m2!1sen!2sin!4v1650000000000!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0, filter: 'grayscale(1) invert(0.9) contrast(1.2)' }}
                allowFullScreen={false}
                loading="lazy"
              />
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

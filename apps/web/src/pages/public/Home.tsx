import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Dumbbell, Trophy, Flame, ArrowRight, CheckCircle2, Calendar, Clock, MapPin, UserCheck, TrendingUp } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { FitnessCalculators } from '../../components/calculators/FitnessCalculators';
import { bookFreeTrial } from '../../services/api';
import { formatINR, mapEmbedSrc } from '../../config/site';
import { useContent, usePlans, useSiteInfo } from '../../content/ContentContext';

const HIGHLIGHT_ICONS = [Dumbbell, Trophy, UserCheck, TrendingUp];

export const Home: React.FC = () => {
  const site = useSiteInfo();
  const plans = usePlans();
  const home = useContent('home');
  const { principles } = useContent('about');
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
        <title>{`${site.fullName} | Build Your Strength. Define Yourself.`}</title>
        <meta name="description" content={`${site.fullName} — ${site.tagline} Monthly, six month and yearly memberships starting at ${formatINR(plans[0].price)}.`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ExerciseGym",
            "name": site.fullName,
            "founder": site.founder,
            "telephone": `+91${site.phone}`,
            "email": site.email,
            "address": {
              "@type": "PostalAddress",
              "addressLocality": site.location,
              "addressRegion": "Maharashtra",
              "addressCountry": "IN"
            },
            "openingHours": site.hours.schema,
            "priceRange": `${formatINR(plans[0].price)} - ${formatINR(plans[plans.length - 1].price)}`
          })}
        </script>
      </Helmet>

      <div className="flex flex-col gap-16 md:gap-24 pb-16">
        {/* HERO SECTION */}
        <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-gym-bg border-b border-gym-border">
          {/* Background image overlay */}
          <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25 scale-105 transform transition-transform duration-1000" style={{ backgroundImage: `url('${home.heroImage}')` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-gym-bg via-gym-bg/80 to-transparent" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Copy */}
            <div className="lg:col-span-7 flex flex-col gap-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gym-primary/10 border border-gym-primary/30 text-gym-primary font-heading text-sm uppercase tracking-wider w-fit">
                <Flame className="w-4 h-4" /> {site.name} · {site.location}
              </div>

              <h1 className="text-4xl sm:text-6xl md:text-7xl break-words font-heading text-white tracking-wide uppercase leading-none">
                {home.heroTitleLead} <span className="text-gym-primary drop-shadow-[0_0_25px_rgba(212,175,55,0.4)]">{home.heroTitleHighlight}</span> {home.heroTitleTail}
              </h1>

              <p className="text-lg text-gym-muted max-w-2xl font-body leading-relaxed">
                {home.heroText}
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <Link to="/plans">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto" rightIcon={<ArrowRight className="w-5 h-5" />}>
                    Join Now
                  </Button>
                </Link>
                <Link to="/about">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Explore {site.name}
                  </Button>
                </Link>
              </div>

              {/* Quick KPI stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gym-border/80">
                {plans.map((plan) => (
                  <div key={plan.id}>
                    <h4 className="text-3xl font-heading text-gym-primary">{formatINR(plan.price)}</h4>
                    <p className="text-xs text-gym-muted uppercase font-heading">{plan.title} Plan</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Hero Form: Instant Free Trial Pass */}
            <div className="lg:col-span-5">
              <Card className="border-gym-primary/40 bg-gym-surface/90 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-2 text-gym-primary font-heading text-2xl uppercase mb-1">
                  <Calendar className="w-6 h-6" /> BOOK YOUR GYM VISIT
                </div>
                <p className="text-xs text-gym-muted mb-6">
                  Visit {site.fullName}, see the equipment and meet our trainers — no obligation.
                </p>

                {trialSuccess ? (
                  <div className="bg-gym-success/20 border border-gym-success/40 text-gym-success p-4 rounded-xl text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 mx-auto" />
                    <h4 className="font-heading text-xl uppercase">VISIT BOOKED!</h4>
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
                        label="Visit Date"
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
                      Book My Visit
                    </Button>

                    <p className="text-[11px] text-gym-muted text-center">
                      🔒 No payment required. We will call you to confirm.
                    </p>
                  </form>
                )}
              </Card>
            </div>
          </div>
        </section>

        {/* WHY RV FITNESS (HIGHLIGHTS) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">WHY RV FITNESS</span>
            <h2 className="text-4xl sm:text-5xl font-heading text-white tracking-wide uppercase mt-1">
              TRAIN WITH <span className="text-gym-primary">PURPOSE</span>
            </h2>
            <p className="text-sm text-gym-muted mt-2">
              Everything you need to train hard and recover smart.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {home.highlights.map((item, idx) => {
              const Icon = HIGHLIGHT_ICONS[idx % HIGHLIGHT_ICONS.length];
              return (
                <Card key={item.title} className="flex flex-col gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gym-primary/10 text-gym-primary flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-heading text-white uppercase">{item.title}</h3>
                  <p className="text-xs text-gym-muted leading-relaxed">{item.text}</p>
                </Card>
              );
            })}
          </div>
        </section>

        {/* FITNESS CALCULATORS SECTION */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <FitnessCalculators />
        </section>

        {/* PREVIEW MEMBERSHIP plans */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">MEMBERSHIP</span>
              <h2 className="text-4xl sm:text-5xl font-heading text-white tracking-wide uppercase mt-1">
                CHOOSE YOUR <span className="text-gym-primary">PATH</span>
              </h2>
              <p className="text-sm text-gym-muted mt-2">Plans designed around real goals — no gimmicks.</p>
            </div>
            <Link to="/plans">
              <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                View All Plans
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.id}
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
                    <span className="text-4xl font-heading text-gym-primary">{formatINR(plan.price)}</span>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-gym-muted">
                        <CheckCircle2 className="w-4 h-4 text-gym-primary shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link to="/plans" className="w-full mt-6">
                  <Button variant={plan.highlight ? 'primary' : 'secondary'} className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Join {plan.title}
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </section>

        {/* FOUR FORCES OF PROGRESS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">THE RV FITNESS MINDSET</span>
            <h2 className="text-4xl sm:text-5xl font-heading text-white tracking-wide uppercase mt-1">
              FOUR FORCES OF <span className="text-gym-primary">PROGRESS</span>
            </h2>
            <p className="text-sm text-gym-muted mt-2">
              The principles behind every transformation at RV Fitness.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Strength', img: '/images/gym/rushikesh-side-bicep.jpg', tag: 'STRENGTH' },
              { title: 'Discipline', img: '/images/gym/rushikesh-bw.jpg', tag: 'DISCIPLINE' },
              { title: 'Power', img: '/images/gym/rushikesh-warrior.jpg', tag: 'POWER' },
              { title: 'Transformation', img: '/images/gym/rushikesh-gym-trophies.jpg', tag: 'TRANSFORMATION' },
            ].map((force) => (
              <div
                key={force.title}
                className="group relative h-80 rounded-2xl overflow-hidden border border-gym-border shadow-xl bg-gym-surface flex flex-col justify-end p-5"
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
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PHILOSOPHY: MORE THAN A GYM */}
        <section className="bg-gym-surface border-y border-gym-border py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Photo with Badge */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden border border-gym-border shadow-2xl">
                <img
                  src="/images/gym/rushikesh-posing-logo.jpg"
                  alt={`${site.name} Founder & Philosophy`}
                  className="w-full h-[420px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 bg-gold-gradient text-black font-heading text-xs px-3.5 py-1.5 rounded-lg uppercase font-bold tracking-wider shadow-lg">
                  MORE THAN A GYM
                </div>
              </div>
            </div>

            {/* Right Copy & Principles */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div>
                <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">OUR PHILOSOPHY</span>
                <h2 className="text-4xl sm:text-5xl font-heading text-white tracking-wide uppercase mt-1">
                  MORE THAN A <span className="text-gym-primary">GYM.</span>
                </h2>
                <p className="text-sm text-gym-muted mt-2 leading-relaxed">
                  {home.philosophyText}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {principles.map((principle, idx) => (
                  <div
                    key={principle}
                    className="flex items-center gap-4 p-4 rounded-xl bg-gym-bg/60 border border-gym-border hover:border-gym-primary/40 transition-colors"
                  >
                    <span className="text-2xl font-heading text-gym-primary w-8 shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <p className="text-sm font-medium text-white">{principle}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* MAP & LOCATION SUMMARY */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-gym-surface border border-gym-border rounded-2xl overflow-hidden p-6 sm:p-8">
            <div className="lg:col-span-5 flex flex-col gap-4">
              <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">VISIT OUR FACILITY</span>
              <h3 className="text-3xl sm:text-4xl font-heading text-white uppercase">
                LOCATED IN <span className="text-gym-primary">{site.location.toUpperCase()}</span>
              </h3>
              <div className="space-y-3 text-sm text-gym-muted pt-2">
                <p className="flex items-start gap-2.5">
                  <MapPin className="w-5 h-5 text-gym-primary shrink-0" />
                  <span>{site.address}</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-gym-primary shrink-0" />
                  <span>{site.hours.weekdays} | {site.hours.sunday}</span>
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
                title={`${site.fullName} location map`}
                src={mapEmbedSrc(`${site.name} ${site.location}`)}
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

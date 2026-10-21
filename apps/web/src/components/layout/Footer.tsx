import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Dumbbell, Phone, Mail, MapPin, Clock, Send, CheckCircle2, Instagram } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { phoneDisplay, telHref, instagramHref } from '../../config/site';
import { useSiteInfo } from '../../content/ContentContext';

export const Footer: React.FC = () => {
  const site = useSiteInfo();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="bg-gym-surface border-t border-gym-border text-gym-muted font-body mt-auto">
      {/* Upper Newsletter Section */}
      <div className="border-b border-gym-border py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 bg-gym-bg/80 border border-gym-border p-6 sm:p-8 rounded-2xl">
          <div>
            <h3 className="text-2xl sm:text-3xl font-heading text-white tracking-wider uppercase">
              SUBSCRIBE TO OUR <span className="text-gym-primary">VIP FITNESS CLUB</span>
            </h3>
            <p className="text-sm text-gym-muted mt-1">
              Get weekly workout plans, diet tips, and exclusive membership discount codes!
            </p>
          </div>
          {subscribed ? (
            <div className="flex items-center gap-2 bg-gym-success/20 text-gym-success border border-gym-success/40 px-6 py-3 rounded-lg font-heading text-lg tracking-wide">
              <CheckCircle2 className="w-5 h-5" /> SUBSCRIBED SUCCESSFULLY!
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full sm:w-72"
              />
              <Button type="submit" variant="primary" rightIcon={<Send className="w-4 h-4" />}>
                Subscribe
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
        {/* Brand Summary */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-gold-gradient text-black flex items-center justify-center font-bold">
              <Dumbbell className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-2xl font-heading text-white tracking-wider">
              RV <span className="text-gym-primary">FITNESS</span>
            </span>
          </Link>
          <p className="text-sm text-gym-muted leading-relaxed pr-4">
            {site.about}
          </p>
          <div className="text-xs text-gym-muted flex flex-col gap-1 border-t border-gym-border/60 pt-3">
            <span>Founder: <strong className="text-white">{site.founder}</strong></span>
            {site.instagram && (
              <a
                href={instagramHref(site.instagram)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-gym-primary transition-colors w-fit"
                aria-label={`${site.name} on Instagram`}
              >
                <Instagram className="w-4 h-4" /> @{site.instagram}
              </a>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-lg font-heading text-white tracking-wider uppercase mb-4 text-gym-primary">
            Quick Links
          </h4>
          <ul className="flex flex-col gap-2.5 text-sm">
            <li><Link to="/about" className="hover:text-gym-primary transition-colors">About RV Fitness</Link></li>
            <li><Link to="/programs" className="hover:text-gym-primary transition-colors">Fitness Programs</Link></li>
            <li><Link to="/trainers" className="hover:text-gym-primary transition-colors">Certified Trainers</Link></li>
            <li><Link to="/plans" className="hover:text-gym-primary transition-colors">Membership Plans</Link></li>
            <li><Link to="/schedule" className="hover:text-gym-primary transition-colors">Class Timetable</Link></li>
            <li><Link to="/transformations" className="hover:text-gym-primary transition-colors">Transformations</Link></li>
          </ul>
        </div>

        {/* Programs */}
        <div>
          <h4 className="text-lg font-heading text-white tracking-wider uppercase mb-4 text-gym-primary">
            Programs
          </h4>
          <ul className="flex flex-col gap-2.5 text-sm">
            <li><Link to="/programs" className="hover:text-gym-primary transition-colors">Strength & Bodybuilding</Link></li>
            <li><Link to="/programs" className="hover:text-gym-primary transition-colors">CrossFit & Functional</Link></li>
            <li><Link to="/programs" className="hover:text-gym-primary transition-colors">High-Energy Zumba</Link></li>
            <li><Link to="/programs" className="hover:text-gym-primary transition-colors">Mindful Yoga Sessions</Link></li>
            <li><Link to="/programs" className="hover:text-gym-primary transition-colors">Personal Training (1-on-1)</Link></li>
            <li><Link to="/programs" className="hover:text-gym-primary transition-colors">Fat Loss Bootcamps</Link></li>
          </ul>
        </div>

        {/* Contact Info */}
        <div>
          <h4 className="text-lg font-heading text-white tracking-wider uppercase mb-4 text-gym-primary">
            Contact & Timings
          </h4>
          <ul className="flex flex-col gap-3 text-sm">
            <li className="flex items-start gap-2.5">
              <MapPin className="w-5 h-5 text-gym-primary shrink-0 mt-0.5" />
              <span>{site.address}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-gym-primary shrink-0" />
              <a href={telHref(site.phone)} className="hover:text-white">{phoneDisplay(site.phone)}</a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-gym-primary shrink-0" />
              <a href={`mailto:${site.email}`} className="hover:text-white break-all">{site.email}</a>
            </li>
            <li className="flex items-start gap-2.5 pt-2 border-t border-gym-border/60">
              <Clock className="w-4 h-4 text-gym-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium">{site.hours.weekdays}</p>
                <p className="text-xs text-gym-muted">{site.hours.sunday}</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar & Legal */}
      <div className="bg-gym-bg border-t border-gym-border py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <p>© {new Date().getFullYear()} {site.fullName}. All Rights Reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/policies" className="hover:text-gym-primary transition-colors">Privacy Policy</Link>
            <Link to="/policies" className="hover:text-gym-primary transition-colors">Terms of Service</Link>
            <Link to="/policies" className="hover:text-gym-primary transition-colors">Refund & Freeze Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

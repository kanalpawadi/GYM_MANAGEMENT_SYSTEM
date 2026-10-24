import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Phone, User, Calendar } from 'lucide-react';
import { Button } from '../ui/Button';
import { phoneDisplay, telHref } from '../../config/site';
import { useSiteInfo } from '../../content/ContentContext';
import { homePathForRole, useOptionalAuth } from '../../context/AuthContext';
import { BrandLogo } from '../ui/BrandLogo';

export const Navbar: React.FC = () => {
  const site = useSiteInfo();
  const auth = useOptionalAuth();
  const portalPath = auth?.profile ? homePathForRole(auth.profile.role) : '/login';
  const portalLabel = auth?.profile ? 'My Portal' : null;
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Programs', path: '/programs' },
    { name: 'Trainers', path: '/trainers' },
    { name: 'Plans', path: '/plans' },
    { name: 'Schedule', path: '/schedule' },
    { name: 'Gallery', path: '/gallery' },
    { name: 'Transformations', path: '/transformations' },
    { name: 'Blog', path: '/blog' },
    { name: 'FAQ', path: '/faq' },
    { name: 'Contact', path: '/contact' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-gym-bg/90 backdrop-blur-md border-b border-gym-border">
      {/* Top Strip */}
      <div className="bg-gym-surface py-1.5 px-4 border-b border-gym-border text-xs text-gym-muted hidden md:flex justify-between items-center">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5 text-white">
            <Phone className="w-3.5 h-3.5 text-gym-primary" />
            <a href={telHref(site.phone)} className="hover:text-gym-primary">{phoneDisplay(site.phone)}</a>
          </span>
          <span>📍 {site.location}</span>
          <span>⏰ {site.hours.weekdays} | {site.hours.sunday}</span>
        </div>
        <div className="flex items-center gap-4 text-gym-primary font-heading font-semibold tracking-wider uppercase">
          <span>🔥 {site.tagline}</span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0 mr-4">
          <BrandLogo className="w-12 h-12 shadow-yellow-glow group-hover:scale-105 transition-transform" />
          <div className="flex flex-col">
            <span className="text-xl 2xl:text-2xl font-heading font-bold text-white tracking-wide leading-none whitespace-nowrap">
              RV <span className="text-gym-primary">FITNESS</span>
            </span>
            <span className="text-[10px] text-gym-muted font-body font-medium uppercase tracking-widest">
              {site.location}
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden xl:flex items-center gap-0.5 2xl:gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-xs 2xl:text-sm font-heading font-semibold whitespace-nowrap px-2 py-1.5 rounded-lg border transition-colors hover:text-gym-primary ${
                isActive(link.path) ? 'text-gym-primary bg-gym-primary/10 border-gym-primary/40' : 'text-gray-200 border-transparent'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden xl:flex items-center gap-2 shrink-0">
          <Link to={portalPath}>
            <Button variant="ghost" size="sm" className="whitespace-nowrap" leftIcon={<User className="w-4 h-4" />}>
              {portalLabel ?? 'Portal Login'}
            </Button>
          </Link>
          <Link to="/contact">
            <Button variant="primary" size="sm" className="whitespace-nowrap" leftIcon={<Calendar className="w-4 h-4" />}>
              Free Trial
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex xl:hidden items-center gap-2">
          <Link to={portalPath}>
            <Button variant="primary" size="sm" className="text-xs px-3 min-h-[36px] whitespace-nowrap" leftIcon={<User className="w-3.5 h-3.5" />}>
              {auth?.profile ? 'My Portal' : 'Login'}
            </Button>
          </Link>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-gym-muted hover:text-white rounded-lg bg-gym-surface border border-gym-border"
            aria-label="Toggle Navigation"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isOpen && (
        <div className="xl:hidden bg-gym-surface border-b border-gym-border px-4 py-6 flex flex-col gap-4 animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`py-2 px-3 rounded-xl text-lg font-heading font-semibold transition-colors ${
                  isActive(link.path)
                    ? 'bg-gold-gradient text-black font-bold'
                    : 'text-gym-text hover:bg-gym-surfaceHover'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="pt-4 border-t border-gym-border flex flex-col gap-2">
            <Link to={portalPath} onClick={() => setIsOpen(false)}>
              <Button variant="outline" className="w-full" leftIcon={<User className="w-5 h-5" />}>
                {portalLabel ?? 'Member Login'}
              </Button>
            </Link>
            <Link to="/contact" onClick={() => setIsOpen(false)}>
              <Button variant="primary" className="w-full" leftIcon={<Calendar className="w-5 h-5" />}>
                Book Free Trial
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

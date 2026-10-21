import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Sliders, PenSquare } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { phoneDisplay } from '../../config/site';
import { useSiteInfo } from '../../content/ContentContext';
import { useAuth } from '../../context/AuthContext';
import { canEditContent } from '../../config/roles';

// Gym details are edited in the Website Editor so they stay in one place.
export const AdminSettings: React.FC = () => {
  const site = useSiteInfo();
  const { profile } = useAuth();

  const rows: [string, string][] = [
    ['Gym name', site.fullName],
    ['Founder', site.founder],
    ['Phone', phoneDisplay(site.phone)],
    ['Email', site.email],
    ['Address', site.address],
    ['Hours', `${site.hours.weekdays} | ${site.hours.sunday}`],
  ];

  return (
    <>
      <Helmet>
        <title>Gym Settings | RV Fitness Admin</title>
      </Helmet>

      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">SYSTEM CONFIGURATION</span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl break-words font-heading text-white uppercase tracking-wide mt-1">
            GYM <span className="text-gym-primary">SETTINGS</span>
          </h1>
        </div>

        <Card className="border-gym-border bg-gym-surface space-y-4" hoverEffect={false}>
          <h3 className="text-xl font-heading text-white uppercase flex items-center gap-2">
            <Sliders className="w-5 h-5 text-gym-primary" /> BUSINESS DETAILS
          </h3>
          <dl className="divide-y divide-gym-border">
            {rows.map(([label, value]) => (
              <div key={label} className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 text-sm">
                <dt className="text-gym-muted">{label}</dt>
                <dd className="sm:col-span-2 text-white break-words">{value}</dd>
              </div>
            ))}
          </dl>
          {canEditContent(profile?.role) ? (
            <Link to="/admin/content">
              <Button variant="primary" className="w-full" leftIcon={<PenSquare className="w-4 h-4" />}>
                Edit in Website Editor
              </Button>
            </Link>
          ) : (
            <p className="text-xs text-gym-muted">These details are shown on the website. Ask the Super Admin to change them.</p>
          )}
        </Card>
      </div>
    </>
  );
};

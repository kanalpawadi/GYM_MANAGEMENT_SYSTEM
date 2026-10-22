import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { MessageCircle, Phone } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { phoneDisplay, telHref, whatsappHref } from '../../config/site';
import { Lead, TrialBooking, listLeads, listTrialBookings, updateLeadStatus, updateTrialStatus } from '../../services/gym';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const LEAD_STAGES: { value: Lead['status']; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'trial', label: 'Visit booked' },
  { value: 'converted', label: 'Joined' },
  { value: 'lost', label: 'Not interested' },
];
const VISIT_STATUS = ['pending', 'confirmed', 'visited', 'no-show', 'cancelled'];

const ContactLinks: React.FC<{ phone: string; name: string }> = ({ phone, name }) => (
  <div className="flex gap-2">
    <a href={telHref(phone)} className="inline-flex items-center gap-1 text-xs text-gym-primary hover:underline">
      <Phone className="w-3.5 h-3.5" /> {phoneDisplay(phone)}
    </a>
    <a href={whatsappHref(`Hi ${name}, this is RV Fitness.`, phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-gym-success hover:underline">
      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
    </a>
  </div>
);

/** Website enquiries (Contact form) and gym-visit bookings, with follow-up status. */
export const AdminLeads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [visits, setVisits] = useState<TrialBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([listLeads(), listTrialBookings()])
      .then(([l, v]) => {
        setLeads(l);
        setVisits(v);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const changeLead = async (id: string, status: Lead['status']) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    await updateLeadStatus(id, status).catch((err: Error) => setError(err.message));
  };
  const changeVisit = async (id: string, status: string) => {
    setVisits((prev) => prev.map((v) => (v.id === id ? { ...v, status } : v)));
    await updateTrialStatus(id, status).catch((err: Error) => setError(err.message));
  };

  return (
    <>
      <Helmet>
        <title>Leads | RV Fitness Admin</title>
      </Helmet>

      <div className="flex flex-col gap-6">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">SALES PIPELINE</span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl break-words font-heading text-white uppercase tracking-wide mt-1">
            LEADS & <span className="text-gym-primary">VISITS</span>
          </h1>
          <p className="text-xs text-gym-muted mt-1">Enquiries and gym-visit bookings from the website's Contact page.</p>
        </div>

        {error && <div role="alert" className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-3 rounded-xl text-sm">{error}</div>}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card hoverEffect={false} className="flex flex-col gap-3" aria-label="Visit bookings">
            <h3 className="font-heading text-white">Gym visit bookings ({visits.length})</h3>
            {loading ? (
              <p className="text-sm text-gym-muted">Loading...</p>
            ) : visits.length === 0 ? (
              <p className="text-sm text-gym-muted">No visit bookings yet.</p>
            ) : (
              <ul className="divide-y divide-gym-border">
                {visits.map((v) => (
                  <li key={v.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-white font-heading">{v.name}</p>
                      <p className="text-xs text-gym-muted">
                        {fmt(v.preferred_date)} · {v.preferred_slot}
                      </p>
                      <ContactLinks phone={v.phone} name={v.name} />
                    </div>
                    <div className="sm:w-40">
                      <Select aria-label={`Status for ${v.name}`} value={v.status ?? 'pending'} onChange={(e) => changeVisit(v.id, e.target.value)} options={VISIT_STATUS.map((s) => ({ label: s, value: s }))} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card hoverEffect={false} className="flex flex-col gap-3" aria-label="Enquiries">
            <h3 className="font-heading text-white">Enquiries ({leads.length})</h3>
            {loading ? (
              <p className="text-sm text-gym-muted">Loading...</p>
            ) : leads.length === 0 ? (
              <p className="text-sm text-gym-muted">No enquiries yet.</p>
            ) : (
              <ul className="divide-y divide-gym-border">
                {leads.map((l) => (
                  <li key={l.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-white font-heading">{l.name} <span className="text-xs text-gym-muted font-body">· {fmt(l.created_at)}</span></p>
                      {l.notes && <p className="text-xs text-gym-muted">{l.notes}</p>}
                      <ContactLinks phone={l.phone} name={l.name} />
                    </div>
                    <div className="sm:w-44">
                      <Select aria-label={`Stage for ${l.name}`} value={l.status} onChange={(e) => changeLead(l.id, e.target.value as Lead['status'])} options={LEAD_STAGES} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
};

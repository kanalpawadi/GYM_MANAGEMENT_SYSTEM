import React, { useState } from 'react';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { bookFreeTrial } from '../../services/api';
import { useSiteInfo } from '../../content/ContentContext';

const SLOTS = ['Morning (6 AM - 10 AM)', 'Afternoon (12 PM - 4 PM)', 'Evening (5 PM - 9 PM)'];

/** "Book your gym visit" form: saves a visit booking through the API (shown on the Contact page). */
export const VisitBookingForm: React.FC = () => {
  const site = useSiteInfo();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState(SLOTS[0]);
  const [honeypot, setHoneypot] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    setLoading(true);
    try {
      const res = await bookFreeTrial({
        name,
        phone,
        preferred_date: date || new Date().toISOString().split('T')[0],
        preferred_slot: slot,
        website_honeypot: honeypot,
      });
      setSuccess(res.message);
      setName('');
      setPhone('');
    } catch (err: any) {
      setError(err.message || 'Error booking your visit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-gym-primary/40" id="book-visit" role="region" aria-label="Book your gym visit">
      <div className="flex items-center gap-2 text-gym-primary font-heading text-xl uppercase mb-1">
        <Calendar className="w-6 h-6" /> Book your gym visit
      </div>
      <p className="text-xs text-gym-muted mb-5">Visit {site.fullName}, see the equipment and meet our trainers — no obligation.</p>

      {success ? (
        <div className="bg-gym-success/20 border border-gym-success/40 text-gym-success p-4 rounded-xl text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 mx-auto" />
          <h4 className="font-heading text-xl uppercase">VISIT BOOKED!</h4>
          <p className="text-xs text-white">{success}</p>
          <Button variant="outline" size="sm" onClick={() => setSuccess('')} className="mt-2">Book Another</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <input type="text" name="website_honeypot" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" />
          <Input label="Full Name" placeholder="e.g. Rahul Sharma" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Mobile Number (10-Digit Indian Phone)" placeholder="9876543210" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Visit Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} required />
            <Select label="Time Slot" options={SLOTS.map((s) => ({ label: s, value: s }))} value={slot} onChange={(e) => setSlot(e.target.value)} />
          </div>
          {error && <span className="text-xs text-gym-danger font-medium">{error}</span>}
          <Button type="submit" variant="primary" isLoading={loading} className="w-full mt-1">Book My Visit</Button>
          <p className="text-[11px] text-gym-muted text-center">🔒 No payment required. We will call you to confirm.</p>
        </form>
      )}
    </Card>
  );
};

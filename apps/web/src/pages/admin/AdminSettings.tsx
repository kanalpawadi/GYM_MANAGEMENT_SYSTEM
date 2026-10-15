import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Sliders, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SITE, phoneDisplay } from '../../config/site';

export const AdminSettings: React.FC = () => {
  const [gymName, setGymName] = useState<string>(SITE.fullName);
  const [phone, setPhone] = useState(phoneDisplay());
  const [email, setEmail] = useState<string>(SITE.email);
  const [gstin, setGstin] = useState('');
  const [saved, setSaved] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved('Gym settings saved successfully!');
    setTimeout(() => setSaved(''), 3000);
  };

  return (
    <>
      <Helmet>
        <title>Gym Settings | RV Fitness Admin</title>
      </Helmet>

      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">SYSTEM CONFIGURATION</span>
          <h1 className="text-4xl font-heading text-white uppercase tracking-wide mt-1">
            GYM <span className="text-gym-primary">SETTINGS</span>
          </h1>
        </div>

        {saved && (
          <div className="bg-gym-success/20 border border-gym-success text-gym-success p-4 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">{saved}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <Card className="border-gym-border bg-gym-surface space-y-4">
            <h3 className="text-xl font-heading text-white uppercase flex items-center gap-2">
              <Sliders className="w-5 h-5 text-gym-primary" /> BUSINESS IDENTITY & GST
            </h3>
            <Input label="Gym Trade Name" value={gymName} onChange={(e) => setGymName(e.target.value)} required />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Helpline Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              <Input label="Support Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Input label="GSTIN Registration Number (optional)" value={gstin} onChange={(e) => setGstin(e.target.value)} />
          </Card>

          <Button type="submit" variant="primary" className="w-full">
            Save Gym Settings
          </Button>
        </form>
      </div>
    </>
  );
};

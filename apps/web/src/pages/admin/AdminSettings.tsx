import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { BadgePercent, CheckCircle2, LocateFixed, MapPin, PenSquare, ShieldCheck, Sliders } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { phoneDisplay } from '../../config/site';
import { useSiteInfo } from '../../content/ContentContext';
import { loadGymSettings, useGymSettings } from '../../content/useGymSettings';
import { useAuth } from '../../context/AuthContext';
import { canEditContent, isOwnerLevel } from '../../config/roles';
import { DiscountSetting, GeofenceSetting, currentPosition, saveSetting } from '../../services/gym';

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }> = ({ checked, onChange, label, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-50 ${checked ? 'bg-gold-gradient' : 'bg-gym-border'}`}
  >
    <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${checked ? 'left-6' : 'left-1'}`} />
  </button>
);

export const AdminSettings: React.FC = () => {
  const site = useSiteInfo();
  const { profile } = useAuth();
  const { settings } = useGymSettings();
  const owner = isOwnerLevel(profile?.role);
  const superAdmin = profile?.role === 'super_admin';

  const [discount, setDiscount] = useState<DiscountSetting>(settings.discount);
  const [geo, setGeo] = useState<GeofenceSetting>(settings.geofence);
  const [approval, setApproval] = useState(settings.content_approval.required);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    setDiscount(settings.discount);
    setGeo(settings.geofence);
    setApproval(settings.content_approval.required);
  }, [settings]);

  const save = async (fn: () => Promise<void>, msg: string) => {
    setError('');
    setNotice('');
    try {
      await fn();
      await loadGymSettings(true);
      setNotice(msg);
      setTimeout(() => setNotice(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Could not save');
    }
  };

  const saveDiscount = (next: DiscountSetting) => {
    const percent = Math.min(90, Math.max(1, Math.round(Number(next.percent) || 0)));
    const value = { ...next, percent, label: next.label.trim() || 'Special offer' };
    setDiscount(value);
    return save(() => saveSetting('discount', value), value.enabled ? `Discount ON: ${percent}% off all plans.` : 'Discount turned off.');
  };

  const useMyLocation = async () => {
    setLocating(true);
    setError('');
    try {
      const pos = await currentPosition();
      setGeo((g) => ({ ...g, lat: Number(pos.lat.toFixed(6)), lng: Number(pos.lng.toFixed(6)) }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLocating(false);
    }
  };

  const saveGeo = (next: GeofenceSetting) => {
    if (next.enabled && (next.lat == null || next.lng == null)) {
      setError('Set the gym location first (stand inside the gym and tap "Use my current location").');
      return Promise.resolve();
    }
    const value = { ...next, radius_m: Math.min(1000, Math.max(30, Math.round(Number(next.radius_m) || 100))) };
    setGeo(value);
    return save(() => saveSetting('geofence', value), value.enabled ? 'Selfie check-in with geofence is ON.' : 'Selfie check-in is OFF (QR scan only).');
  };

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

      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">SYSTEM CONFIGURATION</span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl break-words font-heading text-white uppercase tracking-wide mt-1">
            GYM <span className="text-gym-primary">SETTINGS</span>
          </h1>
        </div>

        {notice && (
          <div role="status" className="bg-gym-success/20 border border-gym-success text-gym-success p-3 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {notice}
          </div>
        )}
        {error && <div role="alert" className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-3 rounded-xl text-sm">{error}</div>}

        <Card hoverEffect={false} className="space-y-4" aria-label="Discount">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-heading text-white flex items-center gap-2"><BadgePercent className="w-5 h-5 text-gym-primary" /> Discount</h3>
              <p className="text-xs text-gym-muted">When on, every plan shows the discounted price on the website and the gym charges it on approval.</p>
            </div>
            <Toggle label="Discount on or off" checked={discount.enabled} disabled={!owner} onChange={(v) => saveDiscount({ ...discount, enabled: v })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <Input label="Discount %" type="number" min="1" max="90" value={discount.percent} disabled={!owner} onChange={(e) => setDiscount({ ...discount, percent: Number(e.target.value) })} />
            <Input label="Offer name" value={discount.label} disabled={!owner} onChange={(e) => setDiscount({ ...discount, label: e.target.value })} />
            <Button variant="outline" disabled={!owner} onClick={() => saveDiscount(discount)}>Save Discount</Button>
          </div>
          {!owner && <p className="text-xs text-gym-muted">Only the gym owner or Super Admin can change the discount.</p>}
        </Card>

        <Card hoverEffect={false} className="space-y-4" aria-label="Geofence">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-heading text-white flex items-center gap-2"><MapPin className="w-5 h-5 text-gym-primary" /> Selfie check-in (geofencing)</h3>
              <p className="text-xs text-gym-muted">When on, members can check in with a selfie if they are inside this distance of the gym. When off, only QR scanning works.</p>
            </div>
            <Toggle label="Geofencing on or off" checked={geo.enabled} disabled={!owner} onChange={(v) => saveGeo({ ...geo, enabled: v })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="Latitude" type="number" step="0.000001" value={geo.lat ?? ''} disabled={!owner} onChange={(e) => setGeo({ ...geo, lat: e.target.value === '' ? null : Number(e.target.value) })} />
            <Input label="Longitude" type="number" step="0.000001" value={geo.lng ?? ''} disabled={!owner} onChange={(e) => setGeo({ ...geo, lng: e.target.value === '' ? null : Number(e.target.value) })} />
            <Input label="Allowed distance (m)" type="number" min="30" max="1000" value={geo.radius_m} disabled={!owner} onChange={(e) => setGeo({ ...geo, radius_m: Number(e.target.value) })} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" disabled={!owner} isLoading={locating} onClick={useMyLocation} leftIcon={<LocateFixed className="w-4 h-4" />}>Use my current location</Button>
            <Button variant="outline" size="sm" disabled={!owner} onClick={() => saveGeo(geo)}>Save Location</Button>
            {geo.lat != null && geo.lng != null && (
              <a href={`https://www.google.com/maps?q=${geo.lat},${geo.lng}`} target="_blank" rel="noopener noreferrer" className="text-xs text-gym-primary hover:underline self-center">
                Check on Google Maps
              </a>
            )}
          </div>
        </Card>

        <Card hoverEffect={false} className="space-y-3" aria-label="Website change approval">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-heading text-white flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-gym-primary" /> Owner's website changes need approval</h3>
              <p className="text-xs text-gym-muted">
                Off: the gym owner's edits in the Website Editor go live straight away. On: they wait until the Super Admin approves them.
              </p>
            </div>
            <Toggle
              label="Website change approval on or off"
              checked={approval}
              disabled={!superAdmin}
              onChange={(v) => {
                setApproval(v);
                save(() => saveSetting('content_approval', { required: v }), v ? 'Owner changes now need your approval.' : "Owner's changes go live directly.");
              }}
            />
          </div>
          {!superAdmin && <p className="text-xs text-gym-muted">Only the Super Admin can change this.</p>}
        </Card>

        <Card hoverEffect={false} className="space-y-4">
          <h3 className="text-lg font-heading text-white flex items-center gap-2"><Sliders className="w-5 h-5 text-gym-primary" /> Business details</h3>
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
              <Button variant="primary" className="w-full" leftIcon={<PenSquare className="w-4 h-4" />}>Edit in Website Editor</Button>
            </Link>
          ) : (
            <p className="text-xs text-gym-muted">These details are shown on the website. Ask the owner or Super Admin to change them.</p>
          )}
        </Card>
      </div>
    </>
  );
};

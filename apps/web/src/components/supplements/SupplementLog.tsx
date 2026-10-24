import React, { useEffect, useMemo, useState } from 'react';
import { Pill, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { ExportMenu } from '../ui/ExportMenu';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../config/site';
import { localDay } from '../../services/gym';
import { SupplementEntry, TIMES_OF_DAY, TimeOfDay, addSupplement, deleteSupplement, listSupplements, timeLabel, totalSpent } from '../../services/supplements';

const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const textarea =
  'w-full bg-black text-white placeholder-gym-muted/70 border border-gym-border rounded-xl p-3 text-sm font-body focus:outline-none focus:border-gym-primary';

interface Props {
  memberId: string;
  memberName?: string;
  /** Member themself and staff can add; trainers too (role chain). */
  canEdit?: boolean;
}

/** Supplements a member takes, plus optional purchase details for the statement / invoice export. */
export const SupplementLog: React.FC<Props> = ({ memberId, memberName, canEdit = true }) => {
  const { profile } = useAuth();
  const [rows, setRows] = useState<SupplementEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [bought, setBought] = useState(false);
  const empty = { taken_on: localDay(), supplement: '', brand: '', dose: '', time_of_day: '' as TimeOfDay | '', quantity: '', price: '', shop: '', bill_no: '', notes: '' };
  const [form, setForm] = useState(empty);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const load = () =>
    listSupplements(memberId)
      .then(setRows)
      .catch((err: Error) => setError(err.message));

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [memberId]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setError('');
    setNotice('');
    setSaving(true);
    const blank = (v: string) => (v.trim() ? v.trim() : null);
    try {
      await addSupplement(memberId, profile.id, {
        taken_on: form.taken_on || localDay(),
        supplement: form.supplement,
        brand: blank(form.brand),
        dose: blank(form.dose),
        time_of_day: (form.time_of_day || null) as TimeOfDay | null,
        quantity: bought ? blank(form.quantity) : null,
        price: bought && form.price.trim() ? Number(form.price) : null,
        shop: bought ? blank(form.shop) : null,
        bill_no: bought ? blank(form.bill_no) : null,
        notes: blank(form.notes),
      });
      setForm({ ...empty, taken_on: form.taken_on });
      setBought(false);
      setNotice('Saved.');
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: SupplementEntry) => {
    if (!window.confirm(`Delete ${r.supplement} on ${fmt(r.taken_on)}?`)) return;
    setError('');
    try {
      await deleteSupplement(r.id);
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not delete');
    }
  };

  const spent = useMemo(() => totalSpent(rows), [rows]);
  const purchases = rows.filter((r) => r.price != null).length;
  const who = memberName ?? profile?.full_name ?? 'Member';

  const exportSpec = () => ({
    title: `Supplement statement · ${who}`,
    filename: `rv-fitness-supplements-${who.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${localDay()}`,
    summary: [
      ['Entries', String(rows.length)],
      ['Purchases', String(purchases)],
      ['Total spent', formatINR(spent)],
    ] as [string, string][],
    rows: rows.map((r) => ({
      date: r.taken_on,
      supplement: r.supplement,
      brand: r.brand ?? '',
      dose: r.dose ?? '',
      time: timeLabel(r.time_of_day),
      quantity: r.quantity ?? '',
      price: r.price != null ? Number(r.price) : '',
      shop: r.shop ?? '',
      bill_no: r.bill_no ?? '',
      notes: r.notes ?? '',
    })),
  });

  return (
    <div className="flex flex-col gap-6">
      {canEdit && (
        <Card hoverEffect={false}>
          <form onSubmit={save} className="flex flex-col gap-4" aria-label="Add supplement">
            <h3 className="text-lg font-heading text-white flex items-center gap-2">
              <Pill className="w-5 h-5 text-gym-primary" /> Note a supplement
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Supplement" value={form.supplement} onChange={set('supplement')} placeholder="e.g. Whey protein, Creatine" maxLength={120} required />
              <Input label="Brand" value={form.brand} onChange={set('brand')} placeholder="Optional" maxLength={120} />
              <Input label="Dose" value={form.dose} onChange={set('dose')} placeholder="e.g. 1 scoop, 5 g" maxLength={60} />
              <Select
                label="When"
                value={form.time_of_day}
                onChange={set('time_of_day')}
                options={[{ label: 'Select', value: '' }, ...TIMES_OF_DAY.map((t) => ({ label: t.label, value: t.value }))]}
              />
              <Input label="Date" type="date" value={form.taken_on} max={localDay()} onChange={set('taken_on')} required />
            </div>

            <label className="flex items-center gap-2 text-sm text-white cursor-pointer w-fit min-h-[44px]">
              <input type="checkbox" checked={bought} onChange={(e) => setBought(e.target.checked)} className="accent-gym-primary w-4 h-4" />
              <ShoppingBag className="w-4 h-4 text-gym-primary" /> I bought this (add price and bill)
            </label>
            {bought && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Price (₹)" type="number" min="0" step="0.01" inputMode="decimal" value={form.price} onChange={set('price')} />
                <Input label="Quantity" value={form.quantity} onChange={set('quantity')} placeholder="e.g. 1 kg tub" maxLength={60} />
                <Input label="Shop" value={form.shop} onChange={set('shop')} placeholder="e.g. RV Fitness desk, Amazon" maxLength={120} />
                <Input label="Bill / invoice no." value={form.bill_no} onChange={set('bill_no')} maxLength={60} />
              </div>
            )}
            <label className="flex flex-col gap-1.5 text-sm font-medium text-gym-muted">
              Notes
              <textarea rows={2} value={form.notes} onChange={set('notes')} maxLength={500} className={textarea} placeholder="Optional" />
            </label>
            <Button type="submit" variant="primary" isLoading={saving} leftIcon={<Plus className="w-4 h-4" />} className="sm:self-start">
              Save
            </Button>
          </form>
        </Card>
      )}

      {notice && <p role="status" className="text-sm text-gym-success">{notice}</p>}
      {error && <div role="alert" className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-3 rounded-xl text-sm">{error}</div>}

      <Card hoverEffect={false} className="flex flex-col gap-4" aria-label="Supplement history">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-heading text-white">History</h3>
            <p className="text-xs text-gym-muted">
              {rows.length} entr{rows.length === 1 ? 'y' : 'ies'} · {purchases} purchase{purchases === 1 ? '' : 's'} · spent <span className="text-gym-primary font-heading">{formatINR(spent)}</span>
            </p>
          </div>
          <ExportMenu label="Statement / invoice" getSpec={exportSpec} disabled={!rows.length} formats={['csv', 'html', 'html-min']} />
        </div>

        {loading && <p className="text-sm text-gym-muted">Loading...</p>}
        {!loading && rows.length === 0 && <p className="text-sm text-gym-muted">No supplements noted yet.</p>}
        <ul className="divide-y divide-gym-border">
          {rows.map((r) => (
            <li key={r.id} className="py-3 flex items-start justify-between gap-3" aria-label={`${r.supplement} on ${fmt(r.taken_on)}`}>
              <div className="min-w-0">
                <p className="font-heading text-white break-words">
                  {r.supplement}
                  {r.brand && <span className="text-gym-muted font-body text-sm"> · {r.brand}</span>}
                </p>
                <p className="text-xs text-gym-muted">
                  {fmt(r.taken_on)}
                  {r.dose ? ` · ${r.dose}` : ''}
                  {r.time_of_day ? ` · ${timeLabel(r.time_of_day)}` : ''}
                </p>
                {r.price != null && (
                  <p className="text-xs text-gym-primary mt-0.5">
                    Bought {r.quantity ? `${r.quantity} ` : ''}for {formatINR(Number(r.price))}
                    {r.shop ? ` at ${r.shop}` : ''}
                    {r.bill_no ? ` · Bill ${r.bill_no}` : ''}
                  </p>
                )}
                {r.notes && <p className="text-xs text-gray-300 mt-0.5 break-words">{r.notes}</p>}
              </div>
              {canEdit && (
                <button type="button" onClick={() => remove(r)} className="p-2 text-gym-muted hover:text-gym-danger shrink-0" aria-label={`Delete ${r.supplement} on ${fmt(r.taken_on)}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};

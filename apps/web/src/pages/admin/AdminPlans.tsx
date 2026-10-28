import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Pencil, Plus, RotateCcw, Star, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useContentState } from '../../content/ContentContext';
import { formatINR } from '../../config/site';
import {
  PlanInput,
  SubscriptionPlan,
  createSubscriptionPlan,
  listSubscriptionPlans,
  setSubscriptionPlanActive,
  updateSubscriptionPlan,
} from '../../services/plans';

const textarea =
  'w-full bg-black text-white placeholder-gym-muted/70 border border-gym-border rounded-xl p-3 text-sm font-body focus:outline-none focus:border-gym-primary';

const EMPTY: PlanInput = { title: '', months: 1, price: 0, description: '', features: [], badge: '', highlight: false, sort: 10 };

/** Gym Owner / Super Admin decide the subscription plans: add, change price/length, remove. */
export const AdminPlans: React.FC = () => {
  const { profile } = useAuth();
  const { refresh } = useContentState();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<{ code: string | null; form: PlanInput } | null>(null);
  const [featuresText, setFeaturesText] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = () =>
    listSubscriptionPlans(true)
      .then(setPlans)
      .catch((err: Error) => setError(err.message));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const open = (plan: SubscriptionPlan | null) => {
    setFormError('');
    const form: PlanInput = plan
      ? { title: plan.title, months: plan.months, price: Number(plan.price), description: plan.description ?? '', features: plan.features ?? [], badge: plan.badge ?? '', highlight: plan.highlight, sort: plan.sort }
      : { ...EMPTY, sort: (plans.reduce((m, p) => Math.max(m, p.sort), 0) || 0) + 1 };
    setFeaturesText(form.features.join('\n'));
    setEditing({ code: plan?.code ?? null, form });
  };

  const setField = <K extends keyof PlanInput>(k: K, v: PlanInput[K]) => setEditing((e) => (e ? { ...e, form: { ...e.form, [k]: v } } : e));

  const save = async () => {
    if (!editing || !profile) return;
    setFormError('');
    setSaving(true);
    const form: PlanInput = {
      ...editing.form,
      description: editing.form.description?.trim() || null,
      badge: editing.form.badge?.trim() || null,
      features: featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean),
    };
    try {
      if (editing.code) {
        await updateSubscriptionPlan(editing.code, form, profile.id);
        setNotice(`${form.title} updated.`);
      } else {
        await createSubscriptionPlan(form, profile.id, plans.map((p) => p.code));
        setNotice(`${form.title} added. It now shows on the website and in plan requests.`);
      }
      setEditing(null);
      await load();
      await refresh();
    } catch (err: any) {
      setFormError(err.message || 'Could not save the plan');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (plan: SubscriptionPlan) => {
    if (!profile) return;
    if (plan.active && !window.confirm(`Remove the ${plan.title} plan? It disappears from the website and plan requests. Members already on it keep their membership.`)) return;
    setError('');
    try {
      await setSubscriptionPlanActive(plan.code, !plan.active, profile.id);
      setNotice(plan.active ? `${plan.title} removed.` : `${plan.title} restored.`);
      await load();
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Could not update the plan');
    }
  };

  const active = plans.filter((p) => p.active);
  const removed = plans.filter((p) => !p.active);

  return (
    <>
      <Helmet>
        <title>Subscription Plans | RV Fitness Admin</title>
      </Helmet>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">OWNER</span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading text-white uppercase tracking-wide mt-1">
              SUBSCRIPTION <span className="text-gym-primary">PLANS</span>
            </h1>
            <p className="text-xs text-gym-muted mt-1">These plans and prices show on the website and are used for plan requests and Change plan. The discount switch still applies.</p>
          </div>
          <Button variant="primary" onClick={() => open(null)} leftIcon={<Plus className="w-4 h-4" />} className="sm:self-end">
            Add plan
          </Button>
        </div>

        {notice && <div role="status" className="bg-gym-success/15 border border-gym-success/60 text-gym-success p-3 rounded-xl text-sm">{notice}</div>}
        {error && <div role="alert" className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-3 rounded-xl text-sm">{error}</div>}
        {loading && <p className="text-sm text-gym-muted">Loading plans...</p>}
        {!loading && !error && plans.length === 0 && (
          <Card hoverEffect={false}>
            <p className="text-sm text-gym-muted">No plans yet. Run migration 16 (it adds Monthly, Six Month and Yearly), or press Add plan.</p>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {active.map((p) => (
            <Card key={p.code} hoverEffect={false} className={`flex flex-col gap-3 ${p.highlight ? 'border-gym-primary/60' : ''}`} aria-label={`Plan ${p.title}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-heading text-white text-lg flex items-center gap-1.5">
                    {p.title} {p.highlight && <Star className="w-4 h-4 text-gym-primary" aria-label="Highlighted" />}
                  </h3>
                  <p className="text-xs text-gym-muted">
                    {p.months} month{p.months === 1 ? '' : 's'}
                    {p.badge ? ` · ${p.badge}` : ''}
                  </p>
                </div>
                <span className="font-heading text-gym-primary text-xl">{formatINR(Number(p.price))}</span>
              </div>
              {p.description && <p className="text-sm text-gray-300">{p.description}</p>}
              {p.features?.length > 0 && (
                <ul className="text-xs text-gym-muted list-disc pl-4 space-y-0.5">
                  {p.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2 mt-auto pt-2">
                <Button variant="outline" size="sm" onClick={() => open(p)} leftIcon={<Pencil className="w-4 h-4" />} aria-label={`Edit ${p.title}`}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" className="text-gym-danger" onClick={() => toggle(p)} leftIcon={<Trash2 className="w-4 h-4" />} aria-label={`Remove ${p.title}`}>
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {removed.length > 0 && (
          <Card hoverEffect={false} className="flex flex-col gap-2" aria-label="Removed plans">
            <h3 className="font-heading text-white">Removed plans</h3>
            <ul className="divide-y divide-gym-border">
              {removed.map((p) => (
                <li key={p.code} className="py-2 flex items-center justify-between gap-2">
                  <span className="text-sm text-gym-muted">
                    {p.title} · {p.months} mo · {formatINR(Number(p.price))}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => toggle(p)} leftIcon={<RotateCcw className="w-4 h-4" />} aria-label={`Restore ${p.title}`}>
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <Modal isOpen={!!editing} onClose={saving ? () => undefined : () => setEditing(null)} title={editing?.code ? 'Edit plan' : 'Add plan'}>
        {editing && (
          <div className="flex flex-col gap-4 text-sm">
            <Input label="Plan name" value={editing.form.title} onChange={(e) => setField('title', e.target.value)} placeholder="e.g. Three Months" maxLength={60} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Months" type="number" min="1" max="60" inputMode="numeric" value={String(editing.form.months)} onChange={(e) => setField('months', Number(e.target.value))} />
              <Input label="Price (₹)" type="number" min="0" step="1" inputMode="decimal" value={String(editing.form.price)} onChange={(e) => setField('price', Number(e.target.value))} />
            </div>
            <label className="flex flex-col gap-1.5 font-medium text-gym-muted">
              Description
              <textarea rows={2} maxLength={300} value={editing.form.description ?? ''} onChange={(e) => setField('description', e.target.value)} className={textarea} />
            </label>
            <label className="flex flex-col gap-1.5 font-medium text-gym-muted">
              Features (one per line)
              <textarea rows={4} value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} className={textarea} placeholder={'Full gym access\nLocker facility'} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Badge" value={editing.form.badge ?? ''} onChange={(e) => setField('badge', e.target.value)} placeholder="e.g. Popular" maxLength={30} />
              <Input label="Order" type="number" inputMode="numeric" value={String(editing.form.sort)} onChange={(e) => setField('sort', Number(e.target.value))} helperText="Lower shows first" />
            </div>
            <label className="flex items-center gap-2 text-white cursor-pointer w-fit min-h-[44px]">
              <input type="checkbox" checked={editing.form.highlight} onChange={(e) => setField('highlight', e.target.checked)} className="accent-gym-primary w-4 h-4" />
              Highlight this plan on the website
            </label>
            {editing.code && <p className="text-xs text-gym-muted">New prices apply to new requests and plan changes. Existing memberships and bills keep their price.</p>}
            {formError && <p role="alert" className="text-gym-danger">{formError}</p>}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" onClick={save} isLoading={saving}>
                {editing.code ? 'Save changes' : 'Add plan'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

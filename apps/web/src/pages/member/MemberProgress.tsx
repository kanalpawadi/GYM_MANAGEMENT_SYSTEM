import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Activity, Plus, Lock, Camera } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ProgressTimeline } from '../../components/progress/ProgressTimeline';
import { useAuth } from '../../context/AuthContext';
import { ProgressEntry, addProgress, deleteProgress, listProgress, validateImage } from '../../services/portal';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const today = () => new Date().toISOString().split('T')[0];
const num = (v: string) => (v.trim() === '' ? null : Number(v));

const PhotoInput: React.FC<{ label: string; file: File | null; onChange: (f: File | null) => void }> = ({ label, file, onChange }) => {
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) return setPreview('');
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <label className="flex flex-col gap-1.5 cursor-pointer">
      <span className="text-sm font-medium text-gym-muted">{label}</span>
      <div className="h-36 rounded-lg border border-dashed border-gym-border bg-gym-bg overflow-hidden flex items-center justify-center text-gym-muted">
        {preview ? <img src={preview} alt={`${label} preview`} className="w-full h-full object-cover" /> : <Camera className="w-6 h-6" />}
      </div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="text-xs text-gym-muted file:mr-2 file:rounded file:border-0 file:bg-gym-primary file:px-2 file:py-1 file:text-black"
        aria-label={`Upload ${label}`}
        onChange={(e) => {
          const picked = e.target.files?.[0] ?? null;
          setError('');
          try {
            if (picked) validateImage(picked, 5);
            onChange(picked);
          } catch (err: any) {
            setError(err.message);
            onChange(null);
            e.target.value = '';
          }
        }}
      />
      {error && <span className="text-xs text-gym-danger">{error}</span>}
    </label>
  );
};

interface ProgressProps {
  /** Staff view: the member whose progress is shown (defaults to the signed-in member). */
  memberId?: string;
  memberName?: string;
  /** Inside the member page tab: no page title. */
  embedded?: boolean;
}

/** Body composition audit / progress tracker. Members log their own; trainer, owner and Super Admin can log for them. */
export const MemberProgress: React.FC<ProgressProps> = ({ memberId, memberName, embedded = false }) => {
  const { profile } = useAuth();
  const targetId = memberId ?? profile?.id;
  const targetName = memberName ?? profile?.full_name ?? 'Member';
  const forSomeoneElse = !!memberId && memberId !== profile?.id;
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [date, setDate] = useState(today());
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [bicep, setBicep] = useState('');
  const [notes, setNotes] = useState('');
  const [front, setFront] = useState<File | null>(null);
  const [side, setSide] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!targetId) return;
    listProgress(targetId)
      .then(setEntries)
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [targetId]);

  const chartData = useMemo(
    () =>
      [...entries]
        .filter((e) => e.weight_kg != null)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e) => ({ date: new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), weight: Number(e.weight_kg) })),
    [entries],
  );

  const resetForm = () => {
    setDate(today());
    setWeight('');
    setBodyFat('');
    setChest('');
    setWaist('');
    setBicep('');
    setNotes('');
    setFront(null);
    setSide(null);
    setFormError('');
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId) return;
    if (!weight && !front && !side) return setFormError(forSomeoneElse ? 'Add at least the weight or a photo.' : 'Add at least your weight or a photo.');
    setSaving(true);
    setFormError('');
    try {
      const saved = await addProgress(
        targetId,
        { date, weight_kg: num(weight), body_fat_pct: num(bodyFat), chest_cm: num(chest), waist_cm: num(waist), bicep_cm: num(bicep), notes: notes.trim() || null },
        { front, side },
      );
      setEntries((prev) => [saved, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry: ProgressEntry) => {
    if (!window.confirm('Delete this progress entry and its photos?')) return;
    try {
      await deleteProgress(entry);
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    } catch (err: any) {
      setLoadError(err.message || 'Could not delete');
    }
  };

  return (
    <>
      {!embedded && (
        <Helmet>
          <title>Body Metrics & Progress Tracker | RV Fitness</title>
        </Helmet>
      )}

      <div className={`${embedded ? '' : 'max-w-4xl mx-auto'} flex flex-col gap-8`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">BODY COMPOSITION AUDIT</span>
            {embedded ? (
              <h2 className="text-2xl font-heading text-white uppercase tracking-wide mt-1">
                PROGRESS <span className="text-gym-primary">TRACKER</span>
              </h2>
            ) : (
              <h1 className="text-4xl font-heading text-white uppercase tracking-wide mt-1">
                PROGRESS <span className="text-gym-primary">TRACKER</span>
              </h1>
            )}
          </div>
          <Button variant="primary" onClick={() => setShowModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Log Progress & Photos
          </Button>
        </div>

        <p className="text-xs text-gym-muted flex items-start gap-2 bg-gym-surface border border-gym-border rounded-xl p-3">
          <Lock className="w-4 h-4 text-gym-primary shrink-0" />
          {forSomeoneElse
            ? `Entries you log appear on ${targetName}'s Body Metrics page too. Photos stay private: only ${targetName}, their trainer and the gym owner can see them.`
            : 'Your body photos are private. Only you, your assigned trainer and the gym owner can see them. They are never shown on the website.'}
        </p>

        {loadError && <div role="alert" className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-3 rounded-xl text-sm">{loadError}</div>}

        {chartData.length > 1 && (
          <Card className="border-gym-border bg-gym-surface p-6" hoverEffect={false}>
            <h3 className="text-xl font-heading text-white uppercase mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-gym-primary" /> WEIGHT TREND (KG)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2E2E2E" />
                  <XAxis dataKey="date" stroke="#B3B3B3" fontSize={12} />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke="#B3B3B3" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181B', borderColor: '#D4AF37', borderRadius: '8px' }} itemStyle={{ color: '#D4AF37' }} />
                  <Line type="monotone" dataKey="weight" stroke="#D4AF37" strokeWidth={3} dot={{ r: 6, fill: '#D4AF37' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        <Card className="border-gym-border bg-gym-surface flex flex-col gap-4" hoverEffect={false}>
          <h3 className="text-lg font-heading text-white uppercase">PROGRESS HISTORY</h3>
          {loading ? <p className="text-sm text-gym-muted">Loading...</p> : <ProgressTimeline entries={entries} memberName={targetName} onDelete={handleDelete} />}
        </Card>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="LOG PROGRESS" maxWidth="xl">
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Weight (kg)" type="number" step="0.1" min="20" max="300" value={weight} onChange={(e) => setWeight(e.target.value)} />
              <Input label="Body Fat (%)" type="number" step="0.1" min="2" max="70" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} />
              <Input label="Chest (cm)" type="number" step="0.1" value={chest} onChange={(e) => setChest(e.target.value)} />
              <Input label="Waist (cm)" type="number" step="0.1" value={waist} onChange={(e) => setWaist(e.target.value)} />
              <Input label="Bicep (cm)" type="number" step="0.1" value={bicep} onChange={(e) => setBicep(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PhotoInput label="Front photo" file={front} onChange={setFront} />
              <PhotoInput label="Side photo" file={side} onChange={setSide} />
            </div>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-gym-muted">
              Notes (optional)
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-gym-surface text-white border border-gym-border rounded-lg p-3 text-sm font-body focus:outline-none focus:border-gym-primary"
              />
            </label>
            {formError && <span className="text-xs text-gym-danger font-medium">{formError}</span>}
            <Button type="submit" variant="primary" isLoading={saving}>Save Progress</Button>
          </form>
        </Modal>
      </div>
    </>
  );
};

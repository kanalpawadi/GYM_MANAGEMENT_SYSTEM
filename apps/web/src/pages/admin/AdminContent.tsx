import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowDown, ArrowUp, CheckCircle2, ExternalLink, ImagePlus, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { useContentState } from '../../content/ContentContext';
import { DEFAULT_CONTENT, FieldDef, SECTIONS, SectionKey } from '../../content/sections';
import { resetSection, saveSection, uploadSiteImage } from '../../services/content';

const PAGE_LINKS: Partial<Record<SectionKey, string>> = {
  site: '/contact',
  home: '/',
  about: '/about',
  plans: '/plans',
  trainers: '/trainers',
  programs: '/programs',
  gallery: '/gallery',
  transformations: '/transformations',
  faq: '/faq',
  offer: '/',
  blog: '/blog',
};

const textareaClass =
  'w-full bg-gym-surface text-white border border-gym-border rounded-lg p-3 text-sm font-body focus:outline-none focus:border-gym-primary';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function emptyItem(fields: FieldDef[]) {
  return Object.fromEntries(
    fields.map((f) => [f.key, f.type === 'stringList' ? [] : f.type === 'boolean' ? false : '']),
  );
}

// ---- Field editors -----------------------------------------------------------

const ImageField: React.FC<{ label: string; value: string; onChange: (v: string) => void; folder: string }> = ({ label, value, onChange, folder }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      onChange(await uploadSiteImage(file, folder));
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gym-muted">{label}</span>
      <div className="flex flex-col sm:flex-row gap-3 items-start">
        <div className="w-full sm:w-40 h-28 rounded-lg border border-gym-border bg-gym-bg overflow-hidden shrink-0 flex items-center justify-center">
          {value ? <img src={value} alt={`${label} preview`} className="w-full h-full object-cover" /> : <span className="text-xs text-gym-muted">No image</span>}
        </div>
        <div className="flex-1 w-full flex flex-col gap-2">
          <Input aria-label={`${label} URL`} placeholder="https://..." value={value} onChange={(e) => onChange(e.target.value)} />
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            aria-label={`Upload ${label}`}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Button type="button" variant="outline" size="sm" isLoading={uploading} onClick={() => fileRef.current?.click()} leftIcon={<ImagePlus className="w-4 h-4" />} className="w-fit">
            Upload Image
          </Button>
          {error && <span className="text-xs text-gym-danger">{error}</span>}
        </div>
      </div>
    </div>
  );
};

const StringListField: React.FC<{ label: string; itemLabel: string; value: string[]; onChange: (v: string[]) => void }> = ({ label, itemLabel, value, onChange }) => (
  <div className="flex flex-col gap-2">
    <span className="text-sm font-medium text-gym-muted">{label}</span>
    {value.map((item, i) => (
      <div key={i} className="flex gap-2 items-center">
        <Input aria-label={`${itemLabel} ${i + 1}`} value={item} onChange={(e) => onChange(value.map((v, idx) => (idx === i ? e.target.value : v)))} />
        <button type="button" className="p-2 text-gym-muted hover:text-gym-danger" aria-label={`Remove ${itemLabel} ${i + 1}`} onClick={() => onChange(value.filter((_, idx) => idx !== i))}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    ))}
    <Button type="button" variant="ghost" size="sm" className="w-fit" leftIcon={<Plus className="w-4 h-4" />} onClick={() => onChange([...value, ''])}>
      Add {itemLabel}
    </Button>
  </div>
);

const FieldEditor: React.FC<{ field: FieldDef; value: any; onChange: (v: any) => void; folder: string }> = ({ field, value, onChange, folder }) => {
  switch (field.type) {
    case 'text':
      return <Input label={field.label} value={value ?? ''} onChange={(e) => onChange(e.target.value)} helperText={field.help} />;
    case 'textarea':
      return (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gym-muted">
            {field.label}
            <textarea rows={4} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={`${textareaClass} mt-1.5`} />
          </label>
        </div>
      );
    case 'readonly':
      return (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-gym-muted">{field.label}</span>
          <span className="text-white text-sm bg-gym-bg border border-gym-border rounded-lg px-3 py-2">{String(value)} <span className="text-xs text-gym-muted">(fixed)</span></span>
        </div>
      );
    case 'boolean':
      return (
        <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="accent-gym-primary w-4 h-4" />
          {field.label}
        </label>
      );
    case 'image':
      return <ImageField label={field.label} value={value ?? ''} onChange={onChange} folder={folder} />;
    case 'stringList':
      return <StringListField label={field.label} itemLabel={field.itemLabel ?? 'Item'} value={value ?? []} onChange={onChange} />;
    case 'list':
      return <ListField field={field} value={value ?? []} onChange={onChange} folder={folder} />;
  }
};

const ListField: React.FC<{ field: Extract<FieldDef, { type: 'list' }>; value: any[]; onChange: (v: any[]) => void; folder: string }> = ({ field, value, onChange, folder }) => {
  const [open, setOpen] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
    setOpen(to);
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-gym-muted">{field.label}</span>
      {value.map((item, i) => {
        const title = String(item?.[field.titleKey] || `${field.itemLabel} ${i + 1}`);
        return (
          <div key={i} className="border border-gym-border rounded-xl bg-gym-bg/40">
            <div className="flex items-center justify-between gap-2 p-3">
              <button type="button" className="flex-1 text-left font-heading text-white uppercase text-sm truncate" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                {open === i ? '▾' : '▸'} {title}
              </button>
              {!field.fixed && (
                <div className="flex items-center gap-1">
                  <button type="button" className="p-1.5 text-gym-muted hover:text-white" aria-label={`Move ${title} up`} onClick={() => move(i, i - 1)}>
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button type="button" className="p-1.5 text-gym-muted hover:text-white" aria-label={`Move ${title} down`} onClick={() => move(i, i + 1)}>
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className="p-1.5 text-gym-muted hover:text-gym-danger"
                    aria-label={`Remove ${title}`}
                    onClick={() => window.confirm(`Remove "${title}"?`) && onChange(value.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            {open === i && (
              <div className="p-4 pt-0 flex flex-col gap-4">
                {field.fields.map((sub) => (
                  <FieldEditor
                    key={sub.key}
                    field={sub}
                    value={item?.[sub.key]}
                    folder={folder}
                    onChange={(v) => onChange(value.map((it, idx) => (idx === i ? { ...it, [sub.key]: v } : it)))}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
      {!field.fixed && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => {
            onChange([...value, emptyItem(field.fields)]);
            setOpen(value.length);
          }}
        >
          Add {field.itemLabel}
        </Button>
      )}
    </div>
  );
};

// ---- Page --------------------------------------------------------------------

export const AdminContent: React.FC = () => {
  const { profile } = useAuth();
  const { content, refresh } = useContentState();
  const [active, setActive] = useState<SectionKey>('site');
  const [draft, setDraft] = useState<Record<string, any>>(() => clone(content.site));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const section = SECTIONS.find((s) => s.key === active)!;

  // Load the section's current content whenever the tab changes or content reloads.
  useEffect(() => {
    if (!dirty) setDraft(clone(content[active]));
  }, [active, content]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchTo = (key: SectionKey) => {
    if (key === active) return;
    if (dirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    setDirty(false);
    setNotice('');
    setError('');
    setActive(key);
    setDraft(clone(content[key]));
  };

  const updateField = (key: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setNotice('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await saveSection(active, draft, profile?.id);
      setDirty(false);
      await refresh();
      setNotice(`${section.label} saved. The website now shows your changes.`);
    } catch (err: any) {
      setError(err.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm(`Reset "${section.label}" to the original built-in content? Your saved edits for this section will be removed.`)) return;
    setSaving(true);
    setError('');
    try {
      await resetSection(active);
      setDirty(false);
      setDraft(clone(DEFAULT_CONTENT[active]));
      await refresh();
      setNotice(`${section.label} reset to the original content.`);
    } catch (err: any) {
      setError(err.message || 'Could not reset');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Website Editor | RV Fitness Admin</title>
      </Helmet>

      <div className="flex flex-col gap-6">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">SUPER ADMIN</span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl break-words font-heading text-white uppercase tracking-wide mt-1">
            WEBSITE <span className="text-gym-primary">EDITOR</span>
          </h1>
          <p className="text-xs text-gym-muted mt-1">Change the text and photos on the public website. Changes go live as soon as you save.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <nav className="lg:col-span-3 flex lg:flex-col gap-1 overflow-x-auto no-scrollbar" aria-label="Website sections">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => switchTo(s.key)}
                aria-current={s.key === active ? 'page' : undefined}
                className={`text-left px-3.5 py-2.5 rounded-xl font-heading text-sm uppercase tracking-wide whitespace-nowrap transition-all ${
                  s.key === active ? 'bg-gold-gradient text-black font-bold' : 'text-gym-muted hover:text-white hover:bg-gym-surfaceHover'
                }`}
              >
                {s.label}
              </button>
            ))}
          </nav>

          <Card hoverEffect={false} className="lg:col-span-9 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-heading text-white uppercase">{section.label}</h2>
                <p className="text-xs text-gym-muted mt-1 max-w-xl">{section.description}</p>
              </div>
              {PAGE_LINKS[active] && (
                <a href={PAGE_LINKS[active]} target="_blank" rel="noopener noreferrer" className="text-xs text-gym-primary hover:underline inline-flex items-center gap-1 shrink-0">
                  View page <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {section.fields.map((field) => (
              <FieldEditor key={field.key} field={field} value={draft[field.key]} onChange={(v) => updateField(field.key, v)} folder={active} />
            ))}

            {notice && (
              <div className="bg-gym-success/20 border border-gym-success text-gym-success p-3 rounded-xl flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4" /> {notice}
              </div>
            )}
            {error && <div className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-3 rounded-xl text-sm">{error}</div>}

            <div className="flex flex-col sm:flex-row gap-3 justify-between pt-4 border-t border-gym-border sticky bottom-0 bg-gym-surface">
              <Button type="button" variant="ghost" size="sm" onClick={handleReset} disabled={saving} leftIcon={<RotateCcw className="w-4 h-4" />}>
                Reset to Original
              </Button>
              <Button type="button" variant="primary" onClick={handleSave} isLoading={saving} disabled={!dirty} leftIcon={<Save className="w-4 h-4" />}>
                {dirty ? 'Save Changes' : 'Saved'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};

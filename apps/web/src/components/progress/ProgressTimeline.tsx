import React, { useEffect, useState } from 'react';
import { Trash2, ImageOff } from 'lucide-react';
import { ProgressEntry, signProgressPhotos } from '../../services/portal';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const Metric: React.FC<{ label: string; value?: number | null; unit: string }> = ({ label, value, unit }) =>
  value == null ? null : (
    <div className="bg-gym-bg border border-gym-border rounded-lg px-3 py-2">
      <span className="block text-[10px] text-gym-muted uppercase font-heading">{label}</span>
      <span className="text-white font-heading text-lg">
        {value} <span className="text-xs text-gym-muted">{unit}</span>
      </span>
    </div>
  );

const Photo: React.FC<{ url?: string; label: string; who: string }> = ({ url, label, who }) => (
  <figure className="flex flex-col gap-1">
    {url ? (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img src={url} alt={`${who} ${label.toLowerCase()} photo`} className="w-full h-48 sm:h-56 object-cover rounded-lg border border-gym-border" />
      </a>
    ) : (
      <div className="w-full h-48 sm:h-56 rounded-lg border border-dashed border-gym-border flex items-center justify-center text-gym-muted">
        <ImageOff className="w-6 h-6" />
      </div>
    )}
    <figcaption className="text-[10px] text-gym-muted uppercase font-heading text-center">{label}</figcaption>
  </figure>
);

/** Newest-first list of body measurements with private (signed-URL) photos. */
export const ProgressTimeline: React.FC<{
  entries: ProgressEntry[];
  memberName: string;
  onDelete?: (entry: ProgressEntry) => void;
}> = ({ entries, memberName, onDelete }) => {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [photoError, setPhotoError] = useState('');

  useEffect(() => {
    const paths = entries.flatMap((e) => [e.front_photo_url, e.side_photo_url]).filter(Boolean) as string[];
    if (!paths.length) return;
    signProgressPhotos(paths)
      .then(setUrls)
      .catch((err: Error) => setPhotoError(`Photos could not be loaded: ${err.message}`));
  }, [entries]);

  if (!entries.length) {
    return <p className="text-sm text-gym-muted">No progress logged yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {photoError && <p className="text-xs text-gym-danger">{photoError}</p>}
      {entries.map((entry) => (
        <article key={entry.id} className="border border-gym-border rounded-xl p-4 flex flex-col gap-3" aria-label={`Progress on ${formatDate(entry.date)}`}>
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-heading text-white uppercase">{formatDate(entry.date)}</h4>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(entry)}
                className="p-1.5 text-gym-muted hover:text-gym-danger"
                aria-label={`Delete entry from ${formatDate(entry.date)}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Metric label="Weight" value={entry.weight_kg} unit="kg" />
            <Metric label="Body fat" value={entry.body_fat_pct} unit="%" />
            <Metric label="Chest" value={entry.chest_cm} unit="cm" />
            <Metric label="Waist" value={entry.waist_cm} unit="cm" />
            <Metric label="Bicep" value={entry.bicep_cm} unit="cm" />
          </div>
          {(entry.front_photo_url || entry.side_photo_url) && (
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <Photo url={entry.front_photo_url ? urls[entry.front_photo_url] : undefined} label="Front" who={memberName} />
              <Photo url={entry.side_photo_url ? urls[entry.side_photo_url] : undefined} label="Side" who={memberName} />
            </div>
          )}
          {entry.notes && <p className="text-sm text-gym-muted whitespace-pre-line border-l-2 border-gym-primary pl-3">{entry.notes}</p>}
        </article>
      ))}
    </div>
  );
};

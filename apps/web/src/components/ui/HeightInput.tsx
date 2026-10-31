import React, { useEffect, useState } from 'react';

/** Feet + inches -> centimetres (one decimal). */
export const feetToCm = (feet: number, inches: number) => Math.round((feet * 12 + inches) * 2.54 * 10) / 10;

/** Centimetres -> whole feet and rounded inches. */
export function cmToFeet(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / 2.54);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

interface Props {
  /** Height in cm as text ('' when empty). */
  value: string;
  onChange: (cm: string) => void;
}

/** Height in cm, or in feet and inches (converted to cm automatically). */
export const HeightInput: React.FC<Props> = ({ value, onChange }) => {
  const [unit, setUnit] = useState<'cm' | 'ft'>('cm');
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');

  // Switching to feet shows the current height in feet/inches.
  useEffect(() => {
    if (unit !== 'ft') return;
    const cm = Number(value);
    if (value && cm > 0) {
      const f = cmToFeet(cm);
      setFeet(String(f.feet));
      setInches(String(f.inches));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit]);

  const updateFeet = (f: string, i: string) => {
    setFeet(f);
    setInches(i);
    const ft = Number(f);
    const inch = Number(i || 0);
    onChange(f.trim() && ft >= 0 && inch >= 0 ? String(feetToCm(ft, inch)) : '');
  };

  const box =
    'w-full min-h-[44px] bg-black text-white placeholder-gym-muted/70 border border-gym-border rounded-xl px-3 text-sm focus:outline-none focus:border-gym-primary';

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gym-muted" id="height-label">
          Height
        </span>
        <div className="flex rounded-lg border border-gym-border overflow-hidden text-[11px] font-heading" role="radiogroup" aria-label="Height unit">
          {(['cm', 'ft'] as const).map((u) => (
            <button
              key={u}
              type="button"
              role="radio"
              aria-checked={unit === u}
              onClick={() => setUnit(u)}
              className={`px-2.5 py-1 ${unit === u ? 'bg-gold-gradient text-black' : 'text-gym-muted'}`}
            >
              {u === 'cm' ? 'cm' : 'feet'}
            </button>
          ))}
        </div>
      </div>
      {unit === 'cm' ? (
        <input
          aria-label="Height (cm)"
          type="number"
          step="0.1"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. 170"
          className={box}
        />
      ) : (
        <div className="flex gap-2">
          <input aria-label="Height feet" type="number" min="0" max="8" inputMode="numeric" value={feet} onChange={(e) => updateFeet(e.target.value, inches)} placeholder="ft" className={box} />
          <input aria-label="Height inches" type="number" min="0" max="11" inputMode="numeric" value={inches} onChange={(e) => updateFeet(feet, e.target.value)} placeholder="in" className={box} />
        </div>
      )}
      {unit === 'ft' && <span className="text-xs text-gym-muted">{value ? `= ${value} cm` : 'Enter feet and inches, e.g. 5 ft 7 in'}</span>}
    </div>
  );
};

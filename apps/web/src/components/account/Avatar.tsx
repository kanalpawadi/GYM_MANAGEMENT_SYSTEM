import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const SIZES = { sm: 'w-9 h-9 text-xs', md: 'w-12 h-12 text-base', lg: 'w-16 h-16 text-2xl', xl: 'w-24 h-24 text-3xl' };

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
  /** Tap the photo to see it full screen. Leave off when the photo sits inside another button or link. */
  zoomable?: boolean;
}

/** Profile photo, or the person's initial when they haven't added one. */
export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', className = '', zoomable = false }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!src) {
    return (
      <div
        aria-label={name ? `${name} (no photo)` : 'No photo'}
        className={`${SIZES[size]} rounded-full bg-gym-primary/20 text-gym-primary flex items-center justify-center font-heading uppercase border-2 border-gym-primary/60 shrink-0 ${className}`}
      >
        {name?.trim().charAt(0) || '?'}
      </div>
    );
  }

  const img = (
    <img src={src} alt={name ? `${name}'s photo` : 'Profile photo'} className={`${SIZES[size]} rounded-full object-cover border-2 border-gym-primary shrink-0 ${className}`} />
  );
  if (!zoomable) return img;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="rounded-full shrink-0 cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-gym-primary"
        aria-label={`View ${name ? `${name}'s` : 'the'} photo larger`}
      >
        {img}
      </button>
      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={name ? `${name}'s photo` : 'Photo'}
            className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setOpen(false)}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Close photo"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={src}
              alt={name ? `${name}'s photo, large` : 'Photo, large'}
              className="max-w-[92vw] max-h-[78vh] w-auto h-auto rounded-2xl object-contain shadow-2xl border border-gym-primary/40"
            />
            {name && <p className="mt-3 font-heading text-white text-lg">{name}</p>}
          </div>,
          document.body,
        )}
    </>
  );
};

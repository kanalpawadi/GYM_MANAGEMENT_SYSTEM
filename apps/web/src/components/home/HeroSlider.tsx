import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface Slide {
  image: string;
  caption?: string;
}

const INTERVAL_MS = 3500;

/** Photos that slide sideways on their own; pauses on hover/touch, swipe or use the arrows. */
export const HeroSlider: React.FC<{ slides: Slide[] }> = ({ slides }) => {
  const items = slides.filter((s) => s.image);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (paused || reduceMotion || items.length < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % items.length), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, reduceMotion, items.length]);

  useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [items.length, index]);

  if (!items.length) return null;
  const go = (i: number) => setIndex((i + items.length) % items.length);

  return (
    <div
      className="relative w-full aspect-[4/5] sm:aspect-[4/3] lg:aspect-[4/5] rounded-3xl overflow-hidden border border-gym-primary/40 shadow-2xl bg-black"
      aria-roledescription="carousel"
      aria-label="RV Fitness photos"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => {
        setPaused(true);
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        setPaused(false);
        if (start == null) return;
        const dx = e.changedTouches[0].clientX - start;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="flex h-full transition-transform duration-700 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
        {items.map((s, i) => (
          <figure key={i} className="relative w-full h-full shrink-0" aria-hidden={i !== index} aria-label={`Photo ${i + 1} of ${items.length}`}>
            <img src={s.image} alt={s.caption || `RV Fitness photo ${i + 1}`} className="w-full h-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
            {s.caption && (
              <figcaption className="absolute inset-x-0 bottom-0 p-4 pt-12 bg-gradient-to-t from-black/90 to-transparent text-white font-heading text-sm">
                {s.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {items.length > 1 && (
        <>
          <button type="button" onClick={() => go(index - 1)} aria-label="Previous photo" className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button type="button" onClick={() => go(index + 1)} aria-label="Next photo" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-gym-primary' : 'w-2 bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

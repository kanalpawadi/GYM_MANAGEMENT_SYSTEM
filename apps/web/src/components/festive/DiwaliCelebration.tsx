import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/** Diwali days when the greeting and fireworks show (India time). */
export const DIWALI_FROM = '2026-11-01';
export const DIWALI_TO = '2026-11-15';

const todayIST = (now = new Date()) => new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
export const isDiwaliTime = (now = new Date()) => {
  const d = todayIST(now);
  return d >= DIWALI_FROM && d <= DIWALI_TO;
};

const COLORS = ['#FDE68A', '#D4AF37', '#FFB347', '#FF6B35', '#FF4D8D', '#FFFFFF', '#7CFFB2'];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Rocket = { x: number; y: number; vy: number; targetY: number; color: string };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };

/**
 * Full-screen fireworks drawn on a canvas: rockets rise from the bottom and burst into
 * sparks, in a loop for as long as the page is open. It never blocks taps
 * (pointer-events: none), and browsers pause it while the tab is in the background.
 */
const Fireworks: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext?.('2d');
    if (!canvas || !ctx) return undefined;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const rockets: Rocket[] = [];
    const sparks: Spark[] = [];
    let lastLaunch = 0;
    let frame = 0;
    const w = () => window.innerWidth;
    const h = () => window.innerHeight;
    const pick = () => COLORS[Math.floor(Math.random() * COLORS.length)];

    const burst = (x: number, y: number, color: string) => {
      const count = 50 + Math.floor(Math.random() * 30);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 1.5 + Math.random() * 3.5;
        sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color: Math.random() < 0.7 ? color : pick(), size: 1.5 + Math.random() * 1.8 });
      }
    };

    const tick = (now: number) => {
      // A rocket every ~0.5-1 s: lively, but the page stays readable.
      if (now - lastLaunch > 500 + Math.random() * 600) {
        lastLaunch = now;
        rockets.push({ x: w() * (0.12 + Math.random() * 0.76), y: h(), vy: -(9 + Math.random() * 4), targetY: h() * (0.15 + Math.random() * 0.35), color: pick() });
      }
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(0, 0, w(), h());
      ctx.globalCompositeOperation = 'lighter';

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.y += r.vy;
        r.vy *= 0.985;
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
        if (r.y <= r.targetY || r.vy > -2) {
          burst(r.x, r.y, r.color);
          rockets.splice(i, 1);
        }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.05; // gravity
        s.vx *= 0.985;
        s.vy *= 0.985;
        s.life -= 0.012;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, s.life);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return createPortal(
    <canvas ref={canvasRef} data-testid="diwali-fireworks" aria-hidden="true" className="fixed inset-0 w-full h-full z-[75] pointer-events-none" />,
    document.body,
  );
};

/** A glowing clay lamp (diya). */
const Diya: React.FC<{ delay?: number }> = ({ delay = 0 }) => (
  <svg viewBox="0 0 48 40" className="w-9 h-8 sm:w-11 sm:h-10" aria-hidden="true">
    <ellipse cx="24" cy="10" rx="9" ry="9" fill="#FDE68A" opacity="0.25" className="diya-glow" style={{ animationDelay: `${delay}s` }} />
    <path d="M24 2 C27 7 28 11 24 15 C20 11 21 7 24 2 Z" fill="#FFB347" className="diya-flame" style={{ animationDelay: `${delay}s` }} />
    <path d="M24 6 C25.5 9 25.5 11 24 13 C22.5 11 22.5 9 24 6 Z" fill="#FFF7D6" />
    <path d="M4 18 H44 C42 30 34 36 24 36 C14 36 6 30 4 18 Z" fill="#B8541E" />
    <path d="M4 18 H44 C43.5 20.5 42.8 22.5 41.8 24 H6.2 C5.2 22.5 4.5 20.5 4 18 Z" fill="#D4AF37" />
    <circle cx="14" cy="29" r="1.6" fill="#FDE68A" />
    <circle cx="24" cy="31" r="1.6" fill="#FDE68A" />
    <circle cx="34" cy="29" r="1.6" fill="#FDE68A" />
  </svg>
);

/**
 * Diwali greeting card with diyas, plus fireworks over the page in a loop while it is
 * open during the festival. Closing the card stops them. Hidden outside the Diwali days.
 */
export const DiwaliCelebration: React.FC<{ name?: string | null; now?: Date }> = ({ name, now }) => {
  const [hidden, setHidden] = useState(false);
  const reduced = prefersReducedMotion();
  const active = isDiwaliTime(now);

  if (!active || hidden) return null;
  const first = name?.trim().split(/\s+/)[0];

  return (
    <>
      <style>{`
        @keyframes diya-flicker { 0%,100% { transform: scaleY(1) translateY(0); } 50% { transform: scaleY(1.12) translateY(-0.6px); } }
        @keyframes diya-pulse { 0%,100% { opacity: .18; } 50% { opacity: .45; } }
        .diya-flame { transform-origin: 24px 15px; animation: diya-flicker 1.1s ease-in-out infinite; }
        .diya-glow { animation: diya-pulse 1.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .diya-flame, .diya-glow { animation: none; } }
      `}</style>
      <section
        aria-label="Happy Diwali"
        className="relative overflow-clip rounded-3xl border border-gym-primary/50 bg-gradient-to-br from-[#2a1606] via-[#1a1208] to-[#2b0f1d] p-5 sm:p-6"
      >
        <div className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-orange-500/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-pink-500/15 blur-3xl" aria-hidden="true" />
        <button
          type="button"
          onClick={() => setHidden(true)}
          aria-label="Close Diwali greeting"
          className="absolute top-3 right-3 w-8 h-8 rounded-full text-gym-muted hover:text-white hover:bg-white/10 flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 pr-8">
            <p className="text-xs font-heading text-gym-primary uppercase tracking-widest">Shubh Deepavali</p>
            <h2 className="text-2xl sm:text-3xl font-heading text-white uppercase tracking-wide mt-1">
              Happy <span className="text-gym-primary">Diwali</span>
              {first ? `, ${first}` : ''}! 🪔
            </h2>
            <p className="text-sm text-gym-muted mt-1">May this festival of lights bring you strength, health and happiness. – Team RV Fitness</p>
          </div>
          <div className="flex items-end gap-1 shrink-0">
            <Diya />
            <Diya delay={0.3} />
            <Diya delay={0.6} />
          </div>
        </div>
      </section>
      {!reduced && <Fireworks />}
    </>
  );
};

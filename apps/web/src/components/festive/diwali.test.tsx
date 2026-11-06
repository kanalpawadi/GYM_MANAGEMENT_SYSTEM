import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiwaliCelebration, isDiwaliTime } from './DiwaliCelebration';

const DURING = new Date('2026-11-06T10:00:00+05:30');
const AFTER = new Date('2026-11-20T10:00:00+05:30');
let frames: FrameRequestCallback[] = [];

beforeEach(() => {
  frames = [];
  // jsdom has no canvas: give it a do-nothing drawing context and collect animation frames.
  const ctx = new Proxy({}, { get: () => () => undefined, set: () => true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    frames.push(cb);
    return frames.length;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

/** Runs the queued animation frames, like the browser does every ~16 ms. */
const runFrames = (count: number, startMs: number) => {
  for (let i = 0; i < count; i++) {
    const next = frames.shift();
    next?.(startMs + i * 16);
  }
};

describe('Diwali celebration', () => {
  it('only during the Diwali days (India time)', () => {
    expect(isDiwaliTime(DURING)).toBe(true);
    expect(isDiwaliTime(new Date('2026-10-31T23:00:00+05:30'))).toBe(false);
    expect(isDiwaliTime(new Date('2026-11-15T23:30:00+05:30'))).toBe(true);
    expect(isDiwaliTime(AFTER)).toBe(false);
  });

  it('shows the Happy Diwali message and fireworks, without balloons or a button', () => {
    render(<DiwaliCelebration name="Prashant Kanal" now={DURING} />);
    expect(screen.getByRole('heading', { name: /happy\s*diwali.*prashant/i })).toBeInTheDocument();
    expect(screen.getByText(/festival of lights/i)).toBeInTheDocument();
    expect(screen.getByTestId('diwali-fireworks')).toHaveClass('pointer-events-none');
    expect(screen.queryByTestId('diwali-balloons')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /light a firecracker/i })).not.toBeInTheDocument();
  });

  it('the fireworks keep going in a loop (still running after a minute)', () => {
    render(<DiwaliCelebration name="Prashant" now={DURING} />);
    // 60 s of frames at ~16 ms each.
    runFrames(3750, 0);
    expect(frames.length).toBe(1);
    expect(screen.getByTestId('diwali-fireworks')).toBeInTheDocument();
  });

  it('closing the greeting also stops the fireworks', async () => {
    render(<DiwaliCelebration name="Prashant" now={DURING} />);
    await userEvent.setup().click(screen.getByRole('button', { name: /close diwali greeting/i }));
    expect(screen.queryByRole('region', { name: /happy diwali/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('diwali-fireworks')).not.toBeInTheDocument();
  });

  it('appears on the public home page too, without a name', () => {
    render(<DiwaliCelebration now={DURING} />);
    const heading = screen.getByRole('heading', { name: /happy\s*diwali/i });
    expect(heading.textContent).not.toContain(',');
  });

  it('shows nothing after the festival', () => {
    const { container } = render(<DiwaliCelebration name="Prashant" now={AFTER} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('diwali-fireworks')).not.toBeInTheDocument();
  });

  it('no fireworks for people who turned off motion in their phone settings', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((q) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }) as never);
    render(<DiwaliCelebration name="Prashant" now={DURING} />);
    expect(screen.getByRole('heading', { name: /happy\s*diwali/i })).toBeInTheDocument();
    expect(screen.queryByTestId('diwali-fireworks')).not.toBeInTheDocument();
  });
});

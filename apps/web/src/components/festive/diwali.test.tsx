import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiwaliCelebration, isDiwaliTime } from './DiwaliCelebration';

const DURING = new Date('2026-11-06T10:00:00+05:30');
const AFTER = new Date('2026-11-20T10:00:00+05:30');

beforeEach(() => {
  localStorage.clear();
  // jsdom has no canvas: give it a do-nothing drawing context and hold the animation frames.
  const ctx = new Proxy({}, { get: () => () => undefined, set: () => true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
});
afterEach(() => vi.restoreAllMocks());

describe('Diwali celebration', () => {
  it('only during the Diwali days (India time)', () => {
    expect(isDiwaliTime(DURING)).toBe(true);
    expect(isDiwaliTime(new Date('2026-10-31T23:00:00+05:30'))).toBe(false);
    expect(isDiwaliTime(new Date('2026-11-15T23:30:00+05:30'))).toBe(true);
    expect(isDiwaliTime(AFTER)).toBe(false);
  });

  it('greets the member and plays fireworks once a day', () => {
    const first = render(<DiwaliCelebration name="Prashant Kanal" now={DURING} />);
    expect(screen.getByRole('heading', { name: /happy\s*diwali.*prashant/i })).toBeInTheDocument();
    expect(screen.getByTestId('diwali-fireworks')).toBeInTheDocument();
    expect(screen.getByTestId('diwali-balloons').querySelectorAll('svg')).toHaveLength(12);
    first.unmount();

    render(<DiwaliCelebration name="Prashant Kanal" now={DURING} />);
    expect(screen.queryByTestId('diwali-fireworks')).not.toBeInTheDocument();
  });

  it('"Light a firecracker" plays them again, and the card can be closed', async () => {
    localStorage.setItem('rv_diwali_fireworks_seen', '2026-11-06');
    render(<DiwaliCelebration name="Prashant" now={DURING} />);
    const user = userEvent.setup();
    expect(screen.queryByTestId('diwali-fireworks')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /light a firecracker/i }));
    expect(screen.getByTestId('diwali-fireworks')).toBeInTheDocument();
    expect(screen.getByTestId('diwali-fireworks')).toHaveClass('pointer-events-none');

    await user.click(screen.getByRole('button', { name: /close diwali greeting/i }));
    expect(screen.queryByRole('region', { name: /happy diwali/i })).not.toBeInTheDocument();
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
    expect(screen.getByRole('heading', { name: /happy diwali/i })).toBeInTheDocument();
    expect(screen.queryByTestId('diwali-fireworks')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /light a firecracker/i })).not.toBeInTheDocument();
  });
});

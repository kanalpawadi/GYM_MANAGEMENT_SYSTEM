import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HealthAssistant } from './HealthAssistant';
import { makeProfile, signInAs } from '../../test/supabaseMock';
import { renderPortal } from '../../test/renderPortal';

const asha = makeProfile('member', { id: 'asha', full_name: 'Asha Patil', approval_status: 'approved' });
const apiReply = (reply: string) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ success: true, reply }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
  localStorage.clear();
});

describe('Coach RV speaks English, Hindi and Marathi', () => {
  it('starts in English as a trainer', () => {
    signInAs(asha);
    renderPortal(<HealthAssistant />);
    expect(screen.getByText(/I'm Coach RV, your RV Fitness AI trainer/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'English' })).toHaveAttribute('aria-checked', 'true');
  });

  it('switching to Hindi changes the greeting and asks the trainer in Hindi', async () => {
    signInAs(asha);
    const fetchSpy = apiReply('रोज़ 2.5–3 लीटर पानी पिएँ।');
    renderPortal(<HealthAssistant />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('radio', { name: 'हिंदी' }));
    expect(screen.getByText(/मैं कोच RV हूँ/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'दिन में कितना पानी पीना चाहिए?' }));

    expect(await screen.findByText('रोज़ 2.5–3 लीटर पानी पिएँ।')).toBeInTheDocument();
    expect(JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string).language).toBe('hi');
  });

  it('Marathi is remembered for next time', async () => {
    signInAs(asha);
    const fetchSpy = apiReply('रोज ८ ग्लास पाणी प्या.');
    const first = renderPortal(<HealthAssistant />);
    await userEvent.setup().click(screen.getByRole('radio', { name: 'मराठी' }));
    first.unmount();

    renderPortal(<HealthAssistant />);
    expect(screen.getByRole('radio', { name: 'मराठी' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/मी कोच RV, तुमचा RV Fitness AI ट्रेनर/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('तुमच्या ट्रेनरला विचारा')).toBeInTheDocument();

    await userEvent.setup().type(screen.getByLabelText(/ask the ai trainer/i), 'पाणी किती?{Enter}');
    await screen.findByText('रोज ८ ग्लास पाणी प्या.');
    expect(JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string).language).toBe('mr');
  });
});

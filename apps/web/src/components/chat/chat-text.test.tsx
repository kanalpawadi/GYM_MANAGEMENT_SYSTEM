import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatText } from './ChatText';
import { HealthAssistant } from './HealthAssistant';
import { makeProfile, signInAs } from '../../test/supabaseMock';
import { renderPortal } from '../../test/renderPortal';

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
  localStorage.clear();
});

describe('AI trainer reply formatting', () => {
  it('shows bold and bullet points instead of ** and - symbols', () => {
    const { container } = render(
      <ChatText text={'Aim for **1.6 g protein per kg** each day.\n\n- Eggs or paneer at breakfast\n- Dal and chicken at lunch\n\nKeep pushing!'} />,
    );
    expect(screen.getByText('1.6 g protein per kg').tagName).toBe('STRONG');
    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Eggs or paneer at breakfast', 'Dal and chicken at lunch']);
    expect(container.textContent).not.toContain('**');
    expect(screen.getByText('Keep pushing!')).toBeInTheDocument();
  });

  it('numbered steps become a numbered list', () => {
    render(<ChatText text={'1. Squats - 3 x 12\n2. Push-ups - 3 x 10'} />);
    expect(screen.getByRole('list').tagName).toBe('OL');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('headings and tables are turned into simple lines', () => {
    const { container } = render(
      <ChatText text={'**Protein guide**\n## Tips\n| Meal | Veg |\n|------|-----|\n| Breakfast | Paneer |'} />,
    );
    expect(container.textContent).not.toMatch(/[#|]|---/);
    expect(screen.getByText('Tips').tagName).toBe('STRONG');
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Meal · Veg', 'Breakfast · Paneer']);
  });

  it('never inserts HTML from the reply', () => {
    const { container } = render(<ChatText text={'<img src=x onerror=alert(1)> hello'} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror=alert(1)> hello');
  });
});

describe('Chat with the AI trainer', () => {
  const reply = (text: string) => new Response(JSON.stringify({ success: true, reply: text }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  it('shows the answer formatted, and a follow-up after a long answer still works', async () => {
    signInAs(makeProfile('member', { id: 'asha', approval_status: 'approved' }));
    const long = `Aim for **1.6 g per kg**.
- ${'Eat dal and paneer. '.repeat(80)}`;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(reply(long)).mockResolvedValueOnce(reply('Yes, **2 eggs** a day is fine.'));
    renderPortal(<HealthAssistant />);
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Ask a health question'), 'How much protein?{Enter}');
    expect((await screen.findByText('1.6 g per kg')).tagName).toBe('STRONG');

    await user.type(screen.getByPlaceholderText('Ask a health question'), 'Are eggs good?{Enter}');
    expect(await screen.findByText('2 eggs')).toBeInTheDocument();
    const sent = JSON.parse((fetchSpy.mock.calls[1][1] as RequestInit).body as string);
    expect(sent.messages[1].role).toBe('assistant');
    expect(sent.messages[1].content.length).toBeLessThanOrEqual(1000);
    expect(screen.queryByText(/up to 1000 characters/)).not.toBeInTheDocument();
  });
});

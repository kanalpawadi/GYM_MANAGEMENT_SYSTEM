import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PublicHealthAssistant } from './PublicHealthAssistant';
import { makeProfile, signInAs } from '../../test/supabaseMock';
import { renderPortal } from '../../test/renderPortal';
import { renderWithProviders } from '../../test/renderWithProviders';

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

const openAssistant = async () => {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: /open health assistant/i }));
  return screen.getByRole('dialog', { name: 'Health assistant' });
};

describe('Health assistant on the public website', () => {
  it('asks a signed-out visitor to sign in instead of chatting', async () => {
    renderWithProviders(<PublicHealthAssistant />);
    const dialog = await openAssistant();
    expect(within(dialog).getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(within(dialog).getByRole('link', { name: /become a member/i })).toHaveAttribute('href', '/plans');
    expect(within(dialog).queryByPlaceholderText('Ask a health question')).not.toBeInTheDocument();
  });

  it('lets an approved member chat', async () => {
    signInAs(makeProfile('member', { id: 'asha', approval_status: 'approved' }));
    renderPortal(<PublicHealthAssistant />);
    const dialog = await openAssistant();
    expect(await within(dialog).findByPlaceholderText('Ask a health question')).toBeInTheDocument();
  });

  it('keeps it locked for a member waiting for approval', async () => {
    signInAs(makeProfile('member', { id: 'new', approval_status: 'pending' }));
    renderPortal(<PublicHealthAssistant />);
    const dialog = await openAssistant();
    expect(await within(dialog).findByText(/once the gym approves your registration/i)).toBeInTheDocument();
    expect(within(dialog).queryByPlaceholderText('Ask a health question')).not.toBeInTheDocument();
  });
});

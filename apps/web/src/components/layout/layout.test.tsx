import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { FloatingActions } from './FloatingActions';

describe('Navbar', () => {
  it('shows the brand, location and a callable phone number', () => {
    renderWithProviders(<Navbar />);
    expect(screen.getAllByText('Narsobawadi').length).toBeGreaterThan(0);
    const phone = screen.getByRole('link', { name: '+91 96233 72426' });
    expect(phone).toHaveAttribute('href', 'tel:+919623372426');
  });

  it('opens and closes the mobile menu', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Navbar />);
    const toggle = screen.getByRole('button', { name: /toggle navigation/i });
    const desktopLinks = screen.getAllByRole('link', { name: 'Contact' }).length;
    await user.click(toggle);
    expect(screen.getAllByRole('link', { name: 'Contact' }).length).toBe(desktopLinks + 1);
    await user.click(toggle);
    expect(screen.getAllByRole('link', { name: 'Contact' }).length).toBe(desktopLinks);
  });

  it('marks the current page as active', () => {
    renderWithProviders(<Navbar />, { route: '/plans' });
    const plansLink = screen.getAllByRole('link', { name: 'Plans' })[0];
    expect(plansLink.className).toContain('text-gym-primary');
  });
});

describe('Footer', () => {
  it('shows real contact details and the founder', () => {
    renderWithProviders(<Footer />);
    expect(screen.getByText(/founded by Rushikesh Arvind Vagare/i)).toBeInTheDocument();
    expect(screen.getByText('Rushikesh Arvind Vagare')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'rvfitness.narsobawadi@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:rvfitness.narsobawadi@gmail.com',
    );
    expect(screen.getByRole('link', { name: '+91 96233 72426' })).toHaveAttribute('href', 'tel:+919623372426');
    expect(screen.getByText('Narsobawadi, Maharashtra, India')).toBeInTheDocument();
  });

  it('does not show a GSTIN', () => {
    renderWithProviders(<Footer />);
    expect(screen.queryByText(/GSTIN/i)).not.toBeInTheDocument();
  });

  it('hides the Instagram link while no handle is configured', () => {
    renderWithProviders(<Footer />);
    expect(screen.queryByRole('link', { name: /instagram/i })).not.toBeInTheDocument();
  });

  it('confirms newsletter subscription', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Footer />);
    await user.type(screen.getByPlaceholderText(/enter your email/i), 'member@example.com');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));
    expect(screen.getByText(/subscribed successfully/i)).toBeInTheDocument();
  });

  it('shows the gym name in the copyright line', () => {
    renderWithProviders(<Footer />);
    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()} RV Fitness, Narsobawadi`))).toBeInTheDocument();
  });
});

describe('FloatingActions', () => {
  it('links call and WhatsApp buttons to the gym number', () => {
    renderWithProviders(<FloatingActions />);
    expect(screen.getByRole('link', { name: /call rv fitness/i })).toHaveAttribute('href', 'tel:+919623372426');
    const wa = screen.getByRole('link', { name: /chat on whatsapp/i });
    expect(wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/919623372426\?text=/);
    expect(wa).toHaveAttribute('target', '_blank');
    expect(wa).toHaveAttribute('rel', expect.stringContaining('noopener'));
    within(wa).getByText(/whatsapp us/i);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { seed } from '../../test/supabaseMock';
import { Home } from './Home';
import { Plans } from './Plans';
import { About } from './About';
import { Contact } from './Contact';
import { FAQ } from './FAQ';
import { Policies } from './Policies';
import { Programs } from './Programs';
import { Trainers } from './Trainers';
import { Schedule } from './Schedule';
import { Gallery } from './Gallery';
import { Transformations } from './Transformations';
import { Blog } from './Blog';
import { NotFound } from './NotFound';

const mockFetch = (body: unknown, ok = true) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok, json: async () => body } as Response);

describe('every public page renders without crashing', () => {
  const pages: [string, React.FC][] = [
    ['Home', Home],
    ['Plans', Plans],
    ['About', About],
    ['Contact', Contact],
    ['FAQ', FAQ],
    ['Policies', Policies],
    ['Programs', Programs],
    ['Trainers', Trainers],
    ['Schedule', Schedule],
    ['Gallery', Gallery],
    ['Transformations', Transformations],
    ['Blog', Blog],
    ['NotFound', NotFound],
  ];

  it.each(pages)('%s', (_name, Page) => {
    const { container } = renderWithProviders(<Page />);
    expect(container.querySelector('h1, h2')).not.toBeNull();
    expect(container.textContent).not.toMatch(/98765 43210|Sector 18|Metro City|27AAAAA0000A1Z5/);
  });
});

describe('Home page', () => {
  it('shows the client hero copy', () => {
    renderWithProviders(<Home />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(/BUILD YOUR\s*STRENGTH\.\s*DEFINE YOURSELF\./);
    expect(screen.getAllByText(/Train with purpose\. Transform with discipline\./).length).toBeGreaterThan(0);
  });

  it('shows the three real plans with prices', () => {
    renderWithProviders(<Home />);
    for (const price of ['₹1,500', '₹7,500', '₹12,000']) {
      expect(screen.getAllByText(price).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole('button', { name: /join monthly/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join six month/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join yearly/i })).toBeInTheDocument();
  });

  it('shows the philosophy principles and highlights', () => {
    renderWithProviders(<Home />);
    expect(screen.getByText('Strength is built through consistency.')).toBeInTheDocument();
    expect(screen.getByText('Your transformation starts with you.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Progress Tracking' })).toBeInTheDocument();
  });

  it('points the map at Narsobawadi', () => {
    renderWithProviders(<Home />);
    const map = screen.getByTitle(/location map/i);
    expect(map.getAttribute('src')).toContain('Narsobawadi');
  });

  it('shows sliding gym photos instead of the visit booking form', () => {
    renderWithProviders(<Home />);
    expect(screen.getByRole('button', { name: /next photo/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /show photo \d/i }).length).toBeGreaterThanOrEqual(5);
    expect(screen.queryByRole('button', { name: /book my visit/i })).not.toBeInTheDocument();
  });

  it('moves the slider with the arrows', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Home />);
    expect(screen.getByRole('button', { name: 'Show photo 1' })).toHaveAttribute('aria-current', 'true');
    await user.click(screen.getByRole('button', { name: /next photo/i }));
    expect(screen.getByRole('button', { name: 'Show photo 2' })).toHaveAttribute('aria-current', 'true');
  });
});

describe('Plans page', () => {
  it('renders each plan with its description and features', () => {
    renderWithProviders(<Plans />);
    expect(screen.getByText('Flexible monthly membership with full gym access.')).toBeInTheDocument();
    expect(screen.getByText(/save with a 6-month plan/)).toBeInTheDocument();
    expect(screen.getByText('Maximum savings with a full year of transformation.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /join now/i })).toHaveLength(3);
  });

  it('builds a comparison table from the plan features', () => {
    renderWithProviders(<Plans />);
    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader').map((th) => th.textContent);
    expect(headers).toEqual(['Feature', 'Monthly', 'Six Month', 'Yearly']);
    const row = within(table).getByText('Priority trainer support').closest('tr')!;
    // Only the Yearly column has a check (green icon); the others show an X.
    expect(row.querySelectorAll('.text-gym-success')).toHaveLength(1);
  });

  it('does not add GST on top of the listed prices', () => {
    renderWithProviders(<Plans />);
    expect(screen.queryByText(/GST/)).not.toBeInTheDocument();
  });

  it('shows normal prices while the discount is off', async () => {
    renderWithProviders(<Plans />);
    expect((await screen.findAllByText('₹1,500')).length).toBeGreaterThan(0);
    expect(screen.queryByText(/% OFF all plans/i)).not.toBeInTheDocument();
  });

  it('shows the admin discount on every plan when it is on', async () => {
    seed('settings', [{ key: 'discount', value: { enabled: true, percent: 20, label: 'Diwali Offer' } }]);
    renderWithProviders(<Plans />);
    expect(await screen.findByText('Diwali Offer: 20% OFF all plans')).toBeInTheDocument();
    expect(screen.getAllByText('₹1,200').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹6,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹9,600').length).toBeGreaterThan(0);
  });
});

describe('About page', () => {
  it('credits the founder and shows the four forces', () => {
    renderWithProviders(<About />);
    expect(screen.getAllByText(/Rushikesh Arvind Vagare/).length).toBeGreaterThan(0);
    for (const force of ['Strength', 'Discipline', 'Power', 'Transformation']) {
      expect(screen.getByRole('heading', { name: force })).toBeInTheDocument();
    }
  });
});

describe('Contact page', () => {
  it('shows the real contact details', () => {
    renderWithProviders(<Contact />);
    expect(screen.getByRole('link', { name: '+91 96233 72426' })).toHaveAttribute('href', 'tel:+919623372426');
    expect(screen.getByRole('link', { name: 'rvfitness.narsobawadi@gmail.com' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /chat on whatsapp/i }).getAttribute('href')).toContain('wa.me/919623372426');
    expect(screen.getByText('Narsobawadi, Maharashtra, India')).toBeInTheDocument();
  });

  it('submits an enquiry and clears the form', async () => {
    const user = userEvent.setup();
    const fetchSpy = mockFetch({ message: 'Thanks, we will call you.' });
    renderWithProviders(<Contact />);

    await user.type(screen.getByLabelText(/your full name/i), 'Rahul Patil');
    await user.type(screen.getByLabelText(/mobile phone/i), '9822012345');
    await user.click(screen.getByRole('button', { name: /submit enquiry/i }));

    expect(await screen.findByText('Thanks, we will call you.')).toBeInTheDocument();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/leads$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject({ name: 'Rahul Patil', phone: '9822012345', website_honeypot: '' });
  });

  it('shows a readable error when the network fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network down'));
    renderWithProviders(<Contact />);

    await user.type(screen.getByLabelText(/your full name/i), 'Rahul Patil');
    await user.type(screen.getByLabelText(/mobile phone/i), '9822012345');
    await user.click(screen.getByRole('button', { name: /submit enquiry/i }));

    await waitFor(() => expect(screen.getByText('Network down')).toBeInTheDocument());
  });
});

describe('FAQ page', () => {
  it('describes what each real plan includes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FAQ />);
    await user.type(screen.getByPlaceholderText(/search/i), 'included');
    // The only match is first in the filtered list, which opens by default.
    expect(screen.getByText('What is included in each membership plan?')).toBeInTheDocument();
    expect(screen.getByText(/Six Month plan adds diet guidance/)).toBeInTheDocument();
  });
});

describe('Contact page visit booking', () => {
  it('books a gym visit through the API', async () => {
    const user = userEvent.setup();
    const fetchSpy = mockFetch({ message: 'Visit booked for Asha.' });
    renderWithProviders(<Contact />);
    const form = screen.getByRole('region', { name: /book your gym visit/i });

    await user.type(within(form).getByLabelText(/full name/i), 'Asha Patil');
    await user.type(within(form).getByLabelText(/mobile number/i), '9623372426');
    await user.type(within(form).getByLabelText(/visit date/i), '2030-01-15');
    await user.click(within(form).getByRole('button', { name: /book my visit/i }));

    expect(await screen.findByText('Visit booked for Asha.')).toBeInTheDocument();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/trial-bookings$/);
    expect(JSON.parse(init.body as string)).toMatchObject({ name: 'Asha Patil', phone: '9623372426' });
  });

  it('shows the API error when booking fails', async () => {
    const user = userEvent.setup();
    mockFetch({ error: { message: 'Please enter a valid phone' } }, false);
    renderWithProviders(<Contact />);
    const form = screen.getByRole('region', { name: /book your gym visit/i });

    await user.type(within(form).getByLabelText(/full name/i), 'Asha Patil');
    await user.type(within(form).getByLabelText(/mobile number/i), '1234');
    await user.type(within(form).getByLabelText(/visit date/i), '2030-01-15');
    await user.click(within(form).getByRole('button', { name: /book my visit/i }));

    expect(await screen.findByText('Please enter a valid phone')).toBeInTheDocument();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { DEFAULT_CONTENT, SECTIONS } from './sections';
import { mergeContent } from './ContentContext';
import { Home } from '../pages/public/Home';
import { Trainers } from '../pages/public/Trainers';
import { Footer } from '../components/layout/Footer';
import { AdminContent } from '../pages/admin/AdminContent';
import { makeProfile, resetSupabaseMock, seed, signInAs, table, uploads, failNextWrite } from '../test/supabaseMock';
import { renderPortal } from '../test/renderPortal';

vi.mock('../lib/supabase', async () => ({ supabase: (await import('../test/supabaseMock')).supabaseMock }));

beforeEach(() => {
  resetSupabaseMock();
  localStorage.clear();
});

describe('mergeContent', () => {
  it('returns the built-in content when nothing is saved', () => {
    expect(mergeContent({})).toEqual(DEFAULT_CONTENT);
  });

  it('applies saved fields and keeps unsaved ones', () => {
    const merged = mergeContent({ home: { heroTitleLead: 'TRAIN HARD' } });
    expect(merged.home.heroTitleLead).toBe('TRAIN HARD');
    expect(merged.home.heroTitleTail).toBe(DEFAULT_CONTENT.home.heroTitleTail);
  });

  it('never lets saved content change plan prices or durations', () => {
    const merged = mergeContent({
      plans: { items: [{ id: 'monthly', title: 'Starter', price: 1, months: 99 }] },
    });
    const monthly = merged.plans.items.find((p) => p.id === 'monthly')!;
    expect(monthly.title).toBe('Starter');
    expect(monthly.price).toBe(1500);
    expect(monthly.months).toBe(1);
    expect(merged.plans.items).toHaveLength(DEFAULT_CONTENT.plans.items.length);
  });

  it('has an editor section for every content section', () => {
    expect(SECTIONS.map((s) => s.key).sort()).toEqual(Object.keys(DEFAULT_CONTENT).sort());
  });
});

describe('public pages read saved content', () => {
  it('shows the edited home banner and image', async () => {
    seed('site_content', [{ key: 'home', value: { heroTitleLead: 'LIFT', heroTitleHighlight: 'HEAVY.', heroTitleTail: 'STAY STRONG.', heroImage: 'https://cdn.test/hero.jpg' } }]);
    const { container } = renderPortal(<Home />);
    expect(await screen.findByRole('heading', { level: 1, name: /LIFT\s*HEAVY\.\s*STAY STRONG\./ })).toBeInTheDocument();
    expect(container.innerHTML).toContain('https://cdn.test/hero.jpg');
  });

  it('shows the edited trainer list', async () => {
    seed('site_content', [{ key: 'trainers', value: { items: [{ name: 'Sanket More', specialization: 'Powerlifting', experience: '3 Years', rating: '5.0 ★', category: 'Powerlifting', bio: 'Coach', photo: 'https://cdn.test/sanket.jpg' }] } }]);
    renderPortal(<Trainers />);
    expect(await screen.findByText('Sanket More')).toBeInTheDocument();
    expect(screen.queryByText('Vikram Sharma')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Powerlifting' })).toBeInTheDocument();
  });

  it('shows edited contact details in the footer', async () => {
    seed('site_content', [{ key: 'site', value: { email: 'hello@rvfit.test', phone: '9000000001' } }]);
    renderPortal(<Footer />);
    expect(await screen.findByText('hello@rvfit.test')).toBeInTheDocument();
    expect(screen.getByText('+91 90000 00001')).toBeInTheDocument();
  });
});

describe('Website Editor', () => {
  const renderEditor = () => renderPortal(<Routes><Route path="*" element={<AdminContent />} /></Routes>);

  it('lets the super admin change home page text and saves it to Supabase', async () => {
    const admin = makeProfile('super_admin');
    signInAs(admin);
    renderEditor();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Home Page' }));
    const lead = await screen.findByLabelText('Headline – first part');
    await user.clear(lead);
    await user.type(lead, 'TRAIN WITH RV');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/home page saved/i)).toBeInTheDocument();
    const row = table('site_content').find((r) => r.key === 'home');
    expect(row?.value.heroTitleLead).toBe('TRAIN WITH RV');
    expect(row?.updated_by).toBe(admin.id);
    expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled();
  });

  it('uploads a new image to Supabase Storage and uses its link', async () => {
    signInAs(makeProfile('super_admin'));
    renderEditor();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Home Page' }));
    const file = new File(['img'], 'hero.png', { type: 'image/png' });
    await user.upload(await screen.findByLabelText('Upload Banner background image'), file);

    expect(uploads()).toHaveLength(1);
    expect(uploads()[0].bucket).toBe('site-media');
    expect(uploads()[0].path).toMatch(/^home\/.+\.png$/);
    expect(await screen.findByDisplayValue(/^https:\/\/storage\.test\/site-media\/home\//)).toBeInTheDocument();
  });

  it('rejects files that are not images', async () => {
    signInAs(makeProfile('super_admin'));
    renderEditor();
    const user = userEvent.setup({ applyAccept: false });
    await user.click(await screen.findByRole('button', { name: 'Home Page' }));
    await user.upload(await screen.findByLabelText('Upload Banner background image'), new File(['x'], 'notes.txt', { type: 'text/plain' }));
    expect(await screen.findByText(/choose an image file/i)).toBeInTheDocument();
    expect(uploads()).toHaveLength(0);
  });

  it('adds a gallery photo', async () => {
    signInAs(makeProfile('super_admin'));
    renderEditor();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Gallery' }));
    await user.click(await screen.findByRole('button', { name: 'Add Photo' }));
    await user.type(screen.getByLabelText('Caption'), 'New Squat Rack');
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    await screen.findByText(/gallery saved/i);
    const items = table('site_content').find((r) => r.key === 'gallery')!.value.items;
    expect(items).toHaveLength(DEFAULT_CONTENT.gallery.items.length + 1);
    expect(items[items.length - 1].title).toBe('New Squat Rack');
  });

  it('shows plan prices as fixed and offers no add/remove for plans', async () => {
    signInAs(makeProfile('super_admin'));
    renderEditor();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Membership Plans' }));
    await user.click(await screen.findByRole('button', { name: /▸ Monthly/ }));
    expect(screen.getByText('1500')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Plan' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove monthly/i })).not.toBeInTheDocument();
  });

  it('resets a section back to the original content', async () => {
    seed('site_content', [{ key: 'faq', value: { items: [{ q: 'Custom?', a: 'Yes', category: 'General' }] } }]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    signInAs(makeProfile('super_admin'));
    renderEditor();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'FAQ' }));
    expect(await screen.findByRole('button', { name: /▸ Custom\?/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /reset to original/i }));
    expect(await screen.findByText(/faq reset/i)).toBeInTheDocument();
    expect(table('site_content').find((r) => r.key === 'faq')).toBeUndefined();
  });

  it('shows the database error when saving is refused', async () => {
    signInAs(makeProfile('super_admin'));
    renderEditor();
    const user = userEvent.setup();
    const name = await screen.findByLabelText('Short name');
    await user.type(name, '!');
    failNextWrite('site_content', 'permission denied for table site_content');
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(await screen.findByText(/permission denied/i)).toBeInTheDocument();
  });

  it('warns before discarding unsaved changes when switching section', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    signInAs(makeProfile('super_admin'));
    renderEditor();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Short name'), ' Gym');
    await user.click(screen.getByRole('button', { name: 'FAQ' }));
    expect(confirm).toHaveBeenCalled();
    expect(within(screen.getByRole('heading', { level: 2 })).getByText('Gym Details')).toBeInTheDocument();
  });
});

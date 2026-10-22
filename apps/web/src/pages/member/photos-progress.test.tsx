import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { MemberProfile } from './MemberProfile';
import { MemberProgress } from './MemberProgress';
import { MemberPlans } from './MemberPlans';
import { MemberPortalLayout } from './MemberPortalLayout';
import { TrainerDashboard } from '../trainer/TrainerDashboard';
import { failNextUpload, failNextWrite, makeProfile, removedFiles, resetSupabaseMock, seed, signInAs, table, uploads } from '../../test/supabaseMock';
import { renderPortal } from '../../test/renderPortal';

vi.mock('../../lib/supabase', async () => ({ supabase: (await import('../../test/supabaseMock')).supabaseMock }));

const coach = makeProfile('trainer', { id: 'coach-1', full_name: 'Coach Arjun', phone: '9822011111', avatar_url: 'https://cdn.test/arjun.jpg' });
const asha = makeProfile('member', { id: 'asha', full_name: 'Asha Patil', email: 'asha@example.com', assigned_trainer_id: 'coach-1' });

const png = (name = 'me.png') => new File(['img'], name, { type: 'image/png' });
const page = (el: React.ReactElement) => renderPortal(<Routes><Route path="*" element={el} /></Routes>);

/** Choosing a photo opens the crop window; confirm it. */
async function chooseAndCrop(user: ReturnType<typeof userEvent.setup>, file: File) {
  await user.upload(await screen.findByLabelText('Upload profile photo'), file);
  const dialog = await screen.findByRole('dialog', { name: /crop your photo/i });
  await user.click(within(dialog).getByRole('button', { name: /use photo/i }));
}

beforeEach(() => {
  resetSupabaseMock();
  localStorage.clear();
  seed('profiles', [coach]);
});

describe('Profile photo', () => {
  it('uploads a member photo to their own avatars folder and shows it in the portal header', async () => {
    signInAs(asha);
    page(<MemberPortalLayout><MemberProfile /></MemberPortalLayout>);
    const user = userEvent.setup();
    await chooseAndCrop(user, png());

    expect(uploads()[0]).toMatchObject({ bucket: 'avatars' });
    expect(uploads()[0].path).toMatch(/^asha\/.+\.png$/);
    const saved = table('profiles').find((p) => p.id === 'asha')!.avatar_url;
    expect(saved).toMatch(/^https:\/\/storage\.test\/avatars\/asha\//);
    // Header + profile card both switch to the new photo.
    expect(await screen.findAllByAltText("Asha Patil's photo")).toHaveLength(2);
  });

  it('rejects non-image files and very large photos', async () => {
    signInAs(asha);
    page(<MemberProfile />);
    const user = userEvent.setup({ applyAccept: false });
    await user.upload(await screen.findByLabelText('Upload profile photo'), new File(['x'], 'cv.pdf', { type: 'application/pdf' }));
    expect(await screen.findByText(/choose a jpg, png or webp/i)).toBeInTheDocument();

    const huge = new File([new Uint8Array(16 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText('Upload profile photo'), huge);
    expect(await screen.findByText(/larger than 15 mb/i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /crop your photo/i })).not.toBeInTheDocument();
    expect(uploads()).toHaveLength(0);
  });

  it('shows an error if the upload fails', async () => {
    signInAs(asha);
    page(<MemberProfile />);
    failNextUpload('avatars', 'new row violates row-level security policy');
    const user = userEvent.setup();
    await chooseAndCrop(user, png());
    expect(await screen.findByRole('alert')).toHaveTextContent(/row-level security/);
  });

  it('lets a trainer set their own photo from the trainer panel', async () => {
    signInAs(makeProfile('trainer', { id: 'coach-2', full_name: 'Coach Neha' }));
    page(<TrainerDashboard />);
    const user = userEvent.setup();
    await chooseAndCrop(user, png('neha.jpg'));
    expect(uploads()[0].path).toMatch(/^coach-2\//);
    expect(await screen.findByAltText("Coach Neha's photo")).toBeInTheDocument();
  });

  it('shows member photos on the trainer\'s member cards', async () => {
    seed('profiles', [{ ...asha, avatar_url: 'https://cdn.test/asha.jpg' }]);
    signInAs(coach);
    page(<TrainerDashboard />);
    expect(await screen.findByAltText("Asha Patil's photo")).toHaveAttribute('src', 'https://cdn.test/asha.jpg');
  });
});

describe('My Profile details', () => {
  it('loads and saves contact, date of birth, blood group, height, weight and medicines', async () => {
    signInAs({ ...asha, phone: '9822012345', health_notes: 'Knee pain' });
    page(<MemberProfile />);
    const user = userEvent.setup();
    expect(await screen.findByDisplayValue('9822012345')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Knee pain')).toBeInTheDocument();
    // Emergency contact is no longer asked for.
    expect(screen.queryByLabelText(/contact person name/i)).not.toBeInTheDocument();

    const dob = screen.getByLabelText(/date of birth/i);
    await user.clear(dob);
    await user.type(dob, '1995-05-01');
    expect(screen.getByLabelText('Age')).toHaveTextContent(/\d+ years/);
    await user.selectOptions(screen.getByLabelText(/blood group/i), 'O+');
    await user.type(screen.getByLabelText(/height/i), '172');
    await user.type(screen.getByLabelText(/weight/i), '70.5');
    await user.type(screen.getByLabelText(/medicines currently taking/i), 'None');
    await user.click(screen.getByRole('button', { name: /save details/i }));

    expect(await screen.findByText(/details saved/i)).toBeInTheDocument();
    expect(table('profiles').find((p) => p.id === 'asha')).toMatchObject({
      phone: '9822012345',
      dob: '1995-05-01',
      blood_group: 'O+',
      height_cm: 172,
      weight_kg: 70.5,
      medicines: 'None',
      health_notes: 'Knee pain',
    });
  });

  it('rejects an invalid mobile number', async () => {
    signInAs(asha);
    page(<MemberProfile />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/contact number/i), '12345');
    await user.click(screen.getByRole('button', { name: /save details/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/valid 10-digit/i);
  });

  it('rejects an impossible height', async () => {
    signInAs(asha);
    page(<MemberProfile />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/height/i), '900');
    await user.click(screen.getByRole('button', { name: /save details/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/height should be between/i);
  });

  it('explains a duplicate phone number in plain words', async () => {
    signInAs(asha);
    page(<MemberProfile />);
    failNextWrite('profiles', 'duplicate key value violates unique constraint "profiles_phone_key"');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/contact number/i), '9822012345');
    await user.click(screen.getByRole('button', { name: /save details/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This mobile number is already used by another account.');
  });
});

describe('My Trainer card', () => {
  it('shows the assigned trainer\'s photo, name and phone', async () => {
    signInAs(asha);
    page(<MemberPlans />);
    const card = await screen.findByLabelText('My trainer');
    expect(await within(card).findByText('Coach Arjun')).toBeInTheDocument();
    expect(within(card).getByAltText("Coach Arjun's photo")).toHaveAttribute('src', 'https://cdn.test/arjun.jpg');
    expect(within(card).getByRole('link', { name: /\+91 98220 11111/ })).toHaveAttribute('href', 'tel:+919822011111');
    expect(within(card).getByRole('link', { name: /whatsapp/i })).toHaveAttribute('href', expect.stringContaining('wa.me/919822011111'));
  });

  it('tells members without a trainer what to do', async () => {
    signInAs({ ...asha, assigned_trainer_id: null });
    page(<MemberPlans />);
    const card = await screen.findByLabelText('My trainer');
    expect(await within(card).findByText(/no trainer assigned yet/i)).toBeInTheDocument();
  });
});

describe('Private body progress photos', () => {
  async function logProgress(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole('button', { name: /log progress & photos/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/weight \(kg\)/i), '72.5');
    await user.type(within(dialog).getByLabelText(/waist \(cm\)/i), '84');
    await user.upload(within(dialog).getByLabelText('Upload Front photo'), png('front.png'));
    await user.upload(within(dialog).getByLabelText('Upload Side photo'), png('side.png'));
    await user.click(within(dialog).getByRole('button', { name: /save progress/i }));
  }

  it('saves measurements and uploads photos to the private bucket under the member\'s folder', async () => {
    signInAs(asha);
    page(<MemberProgress />);
    const user = userEvent.setup();
    await logProgress(user);

    expect(await screen.findByText('72.5')).toBeInTheDocument();
    expect(uploads().map((u) => u.bucket)).toEqual(['progress-photos', 'progress-photos']);
    expect(uploads().every((u) => u.path.startsWith('asha/'))).toBe(true);
    const row = table('progress_logs')[0];
    expect(row).toMatchObject({ member_id: 'asha', weight_kg: 72.5, waist_cm: 84 });
    // Stores the private storage path, never a public link.
    expect(row.front_photo_url).toMatch(/^asha\/.+\.png$/);
    expect(await screen.findByAltText('Asha Patil front photo')).toHaveAttribute('src', expect.stringContaining('https://signed.test/progress-photos/asha/'));
  });

  it('requires at least a weight or a photo', async () => {
    signInAs(asha);
    page(<MemberProgress />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /log progress & photos/i }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /save progress/i }));
    expect(await screen.findByText(/add at least your weight or a photo/i)).toBeInTheDocument();
    expect(table('progress_logs')).toHaveLength(0);
  });

  it('lets the member delete an entry and its photos', async () => {
    seed('progress_logs', [{ id: 'p1', member_id: 'asha', date: '2026-10-01', weight_kg: 75, front_photo_url: 'asha/f.png', side_photo_url: null }]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    signInAs(asha);
    page(<MemberProgress />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /delete entry from/i }));
    expect(table('progress_logs')).toHaveLength(0);
    expect(removedFiles()).toEqual([{ bucket: 'progress-photos', path: 'asha/f.png' }]);
  });

  it('lets the assigned trainer view the member\'s progress photos', async () => {
    seed('profiles', [asha]);
    seed('progress_logs', [
      { id: 'p1', member_id: 'asha', date: '2026-09-01', weight_kg: 78, front_photo_url: 'asha/sept.png', side_photo_url: null },
      { id: 'p2', member_id: 'asha', date: '2026-10-01', weight_kg: 75, front_photo_url: 'asha/oct.png', side_photo_url: null },
    ]);
    signInAs(coach);
    page(<TrainerDashboard />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'View progress for Asha Patil' }));
    const dialog = await screen.findByRole('dialog', { name: /progress · asha patil/i });
    const entries = await within(dialog).findAllByRole('article');
    expect(entries).toHaveLength(2);
    // Newest first.
    expect(within(entries[0]).getByText('75')).toBeInTheDocument();
    const photos = await within(dialog).findAllByAltText('Asha Patil front photo');
    expect(photos[0]).toHaveAttribute('src', expect.stringContaining('asha/oct.png'));
    // Trainers can look but not delete.
    expect(within(dialog).queryByRole('button', { name: /delete entry/i })).not.toBeInTheDocument();
  });
});

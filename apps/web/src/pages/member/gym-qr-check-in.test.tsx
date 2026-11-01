import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { GymCheckIn } from './GymCheckIn';
import { MemberAttendance } from './MemberAttendance';
import { AttendanceScanner } from '../staff/AttendanceScanner';
import { gymQrLink, gymTokenFromScan } from '../../services/gym';
import { NotificationBell, notificationLink } from '../../components/account/NotificationBell';
import { Registration } from './Registration';
import { CurrentPath } from '../../test/renderPortal';
import { makeProfile, seed, signInAs, supabaseMock, table } from '../../test/supabaseMock';
import { renderPortal } from '../../test/renderPortal';

// Stand-in for the html5-qrcode library: lets tests "show" a QR to the camera.
const qr = vi.hoisted(() => ({ onScan: null as null | ((text: string) => void), fileText: '' }));
vi.mock('html5-qrcode', () => ({
  Html5QrcodeSupportedFormats: { QR_CODE: 0 },
  Html5Qrcode: class {
    static async getCameras() {
      return [];
    }
    async start(_camera: unknown, _config: unknown, onScan: (t: string) => void) {
      qr.onScan = onScan;
    }
    async stop() {}
    async scanFile() {
      return qr.fileText;
    }
    clear() {}
  },
}));

const coach = makeProfile('trainer', { id: 'coach', full_name: 'Coach Amit' });
const asha = makeProfile('member', { id: 'asha', full_name: 'Asha Patil', approval_status: 'approved' });
const link = gymQrLink('RVFG1.coach.1.sig', 'https://rv-fitness-five.vercel.app');

beforeEach(() => {
  qr.onScan = null;
  qr.fileText = '';
});

describe('Trainer shows the check-in QR', () => {
  it('shows a QR that opens the check-in page, and lists who checked in', async () => {
    seed('profiles', [asha]);
    seed('attendance', [{ id: 'a1', member_id: 'asha', check_in: new Date().toISOString(), method: 'gym_qr', member: { full_name: 'Asha Patil' } }]);
    signInAs(coach);
    renderPortal(<Routes><Route path="*" element={<AttendanceScanner />} /></Routes>);
    await userEvent.setup().click(screen.getByRole('button', { name: /show check-in qr/i }));
    expect(await screen.findByTestId('gym-qr')).toBeInTheDocument();
    expect(supabaseMock.rpc).toHaveBeenCalledWith('my_gym_qr_token');
    expect(screen.getByText(/new code in 20s/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /full screen/i })).toBeInTheDocument();
  });

  it('full screen mode for a tablet at the desk', async () => {
    signInAs(coach);
    renderPortal(<Routes><Route path="*" element={<AttendanceScanner />} /></Routes>);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /show check-in qr/i }));
    await user.click(await screen.findByRole('button', { name: /^full screen/i }));
    // Rendered at page level, not trapped inside the card (its blur effect broke "fixed").
    const dialog = screen.getByRole('dialog', { name: 'Check-in QR' });
    expect(dialog.parentElement).toBe(document.body);
    expect(document.body.style.overflow).toBe('hidden');
    await user.click(screen.getByRole('button', { name: /exit full screen/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');

    await user.click(screen.getByRole('button', { name: /^full screen/i }));
    await user.click(screen.getByRole('button', { name: /close full screen/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^full screen/i }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('the old member-pass scanner is still there', async () => {
    signInAs(coach);
    renderPortal(<Routes><Route path="*" element={<AttendanceScanner />} /></Routes>);
    expect(screen.getByRole('button', { name: /start camera/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Find member')).toBeInTheDocument();
  });
});

describe('Member scans the gym QR', () => {
  it('reading the QR text works with the web address or the bare code', () => {
    expect(link).toBe('https://rv-fitness-five.vercel.app/portal/check-in?t=RVFG1.coach.1.sig');
    expect(gymTokenFromScan(link)).toBe('RVFG1.coach.1.sig');
    expect(gymTokenFromScan(' RVFG1.coach.1.sig ')).toBe('RVFG1.coach.1.sig');
  });

  it('Attendance page has a Scan gym QR button', async () => {
    signInAs(asha);
    renderPortal(<Routes><Route path="*" element={<MemberAttendance />} /></Routes>);
    expect(await screen.findByRole('link', { name: /scan gym qr/i })).toHaveAttribute('href', '/portal/check-in');
    expect(screen.queryByRole('link', { name: /show qr to a trainer/i })).not.toBeInTheDocument();
  });

  it('scanning with the in-app camera checks the member in', async () => {
    seed('profiles', [coach]);
    signInAs(asha);
    renderPortal(<Routes><Route path="*" element={<GymCheckIn />} /></Routes>);
    await userEvent.setup().click(screen.getByRole('button', { name: /start camera/i }));
    await screen.findByRole('button', { name: /stop camera/i });
    qr.onScan!(link);
    expect(await screen.findByText('Checked in! Have a great workout.')).toBeInTheDocument();
    expect(screen.getByText('QR shown by Coach Amit')).toBeInTheDocument();
    expect(table('attendance')).toHaveLength(1);
    expect(table('attendance')[0]).toMatchObject({ member_id: 'asha', method: 'gym_qr', verified_by: 'coach' });
  });

  it('opening the QR link from the phone camera app checks in straight away', async () => {
    seed('profiles', [coach]);
    signInAs(asha);
    renderPortal(<Routes><Route path="/portal/check-in" element={<GymCheckIn />} /></Routes>, { route: '/portal/check-in?t=RVFG1.coach.1.sig' });
    expect(await screen.findByText('Checked in! Have a great workout.')).toBeInTheDocument();
    expect(table('attendance')).toHaveLength(1);
  });

  it('a second scan the same day says already checked in', async () => {
    seed('attendance', [{ id: 'a1', member_id: 'asha', check_in: new Date().toISOString(), method: 'qr' }]);
    signInAs(asha);
    renderPortal(<Routes><Route path="/portal/check-in" element={<GymCheckIn />} /></Routes>, { route: '/portal/check-in?t=RVFG1.coach.1.sig' });
    expect(await screen.findByText('You are already checked in today.')).toBeInTheDocument();
    expect(table('attendance')).toHaveLength(1);
  });

  it('an old photo of the QR is refused', async () => {
    signInAs(asha);
    renderPortal(<Routes><Route path="/portal/check-in" element={<GymCheckIn />} /></Routes>, { route: '/portal/check-in?t=RVFG1.coach.1.old' });
    expect(await screen.findByRole('alert')).toHaveTextContent(/this qr has expired/i);
    expect(table('attendance')).toHaveLength(0);
  });

  it('with geofencing on, the location is sent too', async () => {
    seed('settings', [{ key: 'geofence', value: { enabled: true, lat: 18.52, lng: 73.85, radius_m: 100 } }]);
    const getCurrentPosition = vi.fn((ok: PositionCallback) => ok({ coords: { latitude: 18.5201, longitude: 73.8501 } } as GeolocationPosition));
    Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true });
    signInAs(asha);
    renderPortal(<Routes><Route path="/portal/check-in" element={<GymCheckIn />} /></Routes>, { route: '/portal/check-in?t=RVFG1.coach.1.sig' });
    expect(await screen.findByText('Checked in! Have a great workout.')).toBeInTheDocument();
    expect(getCurrentPosition).toHaveBeenCalled();
    expect(table('attendance')[0]).toMatchObject({ latitude: 18.5201 });
  });
});

describe('Notifications open their section', () => {
  it('links by type and by panel', () => {
    expect(notificationLink('payment', '/portal/dashboard')).toBe('/portal/payments');
    expect(notificationLink('notice', '/portal/plans')).toBe('/portal/notices');
    expect(notificationLink('renewal_reminder', '/portal/dashboard')).toBe('/portal/checkout');
    expect(notificationLink('registration', '/admin/dashboard')).toBe('/admin/requests');
    expect(notificationLink('plan_request', '/admin/members')).toBe('/admin/requests');
    expect(notificationLink('content', '/admin/dashboard')).toBe('/admin/content');
    expect(notificationLink('notice', '/trainer/dashboard')).toBe('/trainer/notices');
    expect(notificationLink('something_new', '/admin/x')).toBe('/admin/dashboard');
  });

  it('tapping a notification goes to that page', async () => {
    seed('notifications', [{ id: 'n1', user_id: 'asha', title: 'Payment due', message: 'Protein: ₹2000', type: 'payment', is_read: false, created_at: new Date().toISOString() }]);
    signInAs(asha);
    renderPortal(<Routes><Route path="*" element={<><NotificationBell /><CurrentPath /></>} /></Routes>, { route: '/portal/dashboard' });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /notifications \(1 new\)/i }));
    await user.click(screen.getByRole('button', { name: /payment due/i }));
    expect(screen.getByTestId('path')).toHaveTextContent('/portal/payments');
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
  });
});

describe('First registration form', () => {
  it('does not ask about medicines', async () => {
    signInAs({ ...asha, approval_status: 'incomplete' });
    renderPortal(<Routes><Route path="*" element={<Registration />} /></Routes>, { route: '/register' });
    expect(await screen.findByRole('button', { name: /submit for approval/i })).toBeInTheDocument();
    expect(screen.queryByText(/medicines/i)).not.toBeInTheDocument();
  });
});

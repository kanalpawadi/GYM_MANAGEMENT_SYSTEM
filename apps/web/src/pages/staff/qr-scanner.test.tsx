import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { AttendanceScanner, cameraErrorMessage, qrBox } from './AttendanceScanner';
import { makeProfile, seed, signInAs, supabaseMock, table } from '../../test/supabaseMock';
import { renderPortal } from '../../test/renderPortal';

// Stand-in for the html5-qrcode library: records how it was started and lets tests "show" a QR.
const qr = vi.hoisted(() => ({
  onScan: null as null | ((text: string) => void),
  config: null as any,
  boxVisibleAtStart: null as null | boolean,
  startError: null as unknown,
  fileText: 'RVF1.asha.1.sig' as string | null,
  cameras: [] as { id: string; label: string }[],
  startedWith: null as unknown,
}));
vi.mock('html5-qrcode', () => ({
  Html5QrcodeSupportedFormats: { QR_CODE: 0 },
  Html5Qrcode: class {
    static async getCameras() {
      return qr.cameras;
    }
    constructor(private id: string) {}
    async start(camera: unknown, config: unknown, onScan: (t: string) => void) {
      qr.startedWith = camera;
      if (qr.startError) throw qr.startError;
      const box = document.getElementById(this.id)!;
      qr.boxVisibleAtStart = !box.className.split(/\s+/).includes('hidden');
      qr.config = config;
      qr.onScan = onScan;
    }
    async stop() {}
    async scanFile() {
      if (!qr.fileText) throw new Error('No MultiFormat Readers were able to detect the code.');
      return qr.fileText;
    }
    clear() {}
  },
}));

const asha = makeProfile('member', { id: 'asha', full_name: 'Asha Patil', member_code: 'RVF-0007', approval_status: 'approved' });
const page = () => renderPortal(<Routes><Route path="*" element={<AttendanceScanner />} /></Routes>);

beforeEach(() => {
  qr.onScan = null;
  qr.cameras = [];
  qr.startedWith = null;
  localStorage.clear();
  qr.config = null;
  qr.boxVisibleAtStart = null;
  qr.startError = null;
  qr.fileText = 'RVF1.asha.1.sig';
});

describe('QR attendance scanner', () => {
  it('shows the camera box before the scanner starts (a hidden box made scanning impossible)', async () => {
    signInAs(makeProfile('trainer'));
    page();
    await userEvent.setup().click(screen.getByRole('button', { name: /start camera/i }));
    await screen.findByRole('button', { name: /stop camera/i });
    expect(qr.boxVisibleAtStart).toBe(true);
    expect(typeof qr.config.qrbox).toBe('function');
  });

  it('scanning a member pass checks them in', async () => {
    seed('profiles', [asha]);
    signInAs(makeProfile('trainer'));
    page();
    await userEvent.setup().click(screen.getByRole('button', { name: /start camera/i }));
    await screen.findByRole('button', { name: /stop camera/i });

    qr.onScan!('RVF1.asha.1.sig');
    expect(await screen.findByText('Asha Patil')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/checked in/i);
    expect(supabaseMock.rpc).toHaveBeenCalledWith('check_in_by_qr', { p_token: 'RVF1.asha.1.sig' });
    expect(table('attendance')).toHaveLength(1);
  });

  it('explains why the camera could not start', async () => {
    qr.startError = Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' });
    signInAs(makeProfile('trainer'));
    page();
    await userEvent.setup().click(screen.getByRole('button', { name: /start camera/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/camera permission was blocked/i);
    expect(screen.getByTestId('qr-camera').className).toContain('hidden');
  });

  it('can read the QR from a photo when the live camera does not work', async () => {
    seed('profiles', [asha]);
    signInAs(makeProfile('receptionist'));
    page();
    const file = new File(['img'], 'pass.jpg', { type: 'image/jpeg' });
    await userEvent.setup().upload(screen.getByLabelText(/scan qr from photo/i), file);
    expect(await screen.findByText('Asha Patil')).toBeInTheDocument();
    expect(table('attendance')).toHaveLength(1);
  });

  it('says so when the photo has no QR code', async () => {
    qr.fileText = null;
    signInAs(makeProfile('trainer'));
    page();
    await userEvent.setup().upload(screen.getByLabelText(/scan qr from photo/i), new File(['x'], 'blurry.jpg', { type: 'image/jpeg' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/no qr code found/i);
  });
});

describe('scanner helpers', () => {
  it('the scan box fits any camera view', () => {
    expect(qrBox(640, 480)).toEqual({ width: 336, height: 336 });
    expect(qrBox(300, 300)).toEqual({ width: 210, height: 210 });
    expect(qrBox(100, 100)).toEqual({ width: 120, height: 120 });
  });

  it.each([
    [{ name: 'NotAllowedError' }, /permission was blocked/],
    [{ name: 'NotFoundError' }, /no camera was found/i],
    [{ name: 'NotReadableError' }, /another app/],
    ['something odd', /could not open the camera/i],
  ])('camera error %o', (err, expected) => {
    expect(cameraErrorMessage(err)).toMatch(expected);
  });
});

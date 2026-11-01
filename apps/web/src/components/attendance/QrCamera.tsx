import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, ImageUp } from 'lucide-react';
import { Button } from '../ui/Button';

/** Scan box: 70% of the camera view (a fixed size breaks on small or not-yet-sized views). */
export const qrBox = (width: number, height: number) => {
  const side = Math.max(120, Math.floor(Math.min(width, height) * 0.7));
  return { width: side, height: side };
};

const CAMERA_KEY = 'rv_scanner_camera';

/**
 * Picks the phone's main back camera. Samsung and other phones list several back lenses
 * (ultra-wide, telephoto, macro); the ultra-wide can't focus close enough to read a QR.
 */
export function pickBackCamera(cameras: { id: string; label: string }[]): string | null {
  if (!cameras.length) return null;
  const back = cameras.filter((c) => /back|rear|environment|facing back/i.test(c.label));
  const plain = back.filter((c) => !/ultra|wide|tele|depth|macro|zoom/i.test(c.label));
  // Samsung names them "camera2 0, facing back", "camera2 2, facing back"...: the lowest number is the main lens.
  const lens = (label: string) => Number(/camera\d*\s+(\d+)/i.exec(label)?.[1] ?? /(\d+)/.exec(label)?.[1] ?? 99);
  const byIndex = (list: typeof cameras) => [...list].sort((a, b) => lens(a.label) - lens(b.label));
  return (byIndex(plain)[0] ?? byIndex(back)[0] ?? cameras[cameras.length - 1]).id;
}

/** Plain-language reason why the camera could not start. */
export function cameraErrorMessage(err: unknown): string {
  const text = `${(err as { name?: string })?.name ?? ''} ${(err as { message?: string })?.message ?? err ?? ''}`;
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return 'The camera only works on a secure (https://) website. Open the live site, or use the name search below.';
  }
  if (/NotAllowed|Permission|denied/i.test(text)) {
    return 'Camera permission was blocked. Allow the camera for this site in the browser settings (lock icon in the address bar), then press Start camera again.';
  }
  if (/NotFound|no camera|Requested device not found|OverconstrainedError/i.test(text)) {
    return 'No camera was found on this device. Use "Scan from photo" or the name search below.';
  }
  if (/NotReadable|in use|Could not start video source/i.test(text)) {
    return 'The camera is being used by another app. Close it and press Start camera again.';
  }
  return 'Could not open the camera. Use "Scan from photo" or the name search below.';
}

interface QrCameraProps {
  /** Called with the text of each QR read. Scanning pauses until it finishes, plus 2.5 s. */
  onToken: (text: string) => Promise<void> | void;
  /** Camera or photo problems, in plain language ('' clears the message). */
  onError: (message: string) => void;
  /** Called when a new scan starts, so the page can clear the last result. */
  onReset?: () => void;
  hint?: string;
  /** Stops the camera (e.g. after a successful check-in). */
  stopSignal?: number;
  idPrefix?: string;
}

/** Live camera QR reader with a camera picker and a "Scan from photo" fallback. */
export const QrCamera: React.FC<QrCameraProps> = ({ onToken, onError, onReset, hint, stopSignal, idPrefix = 'rv-qr' }) => {
  const readerId = `${idPrefix}-reader`;
  const photoReaderId = `${idPrefix}-photo-reader`;
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [cameraId, setCameraId] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const busyRef = useRef(false);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(
    () => () => {
      scannerRef.current?.stop?.().catch(() => undefined);
    },
    [],
  );

  const stopCamera = async () => {
    await scannerRef.current?.stop?.().catch(() => undefined);
    scannerRef.current = null;
    setScanning(false);
  };

  useEffect(() => {
    if (stopSignal) void stopCamera();
  }, [stopSignal]);

  const handleText = async (text: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await onTokenRef.current(text);
    } finally {
      // Small pause so one QR isn't scanned many times in a row.
      setTimeout(() => (busyRef.current = false), 2500);
    }
  };

  const startCamera = async (wanted?: string) => {
    onError('');
    onReset?.();
    // Show the camera box first: the scanner measures it when it starts, and a hidden
    // (0 px wide) box gives it nothing to read, so QR codes are never detected.
    setStarting(true);
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      // Listing cameras asks for permission once; then we can choose the main back lens.
      const list = await Html5Qrcode.getCameras().catch(() => [] as { id: string; label: string }[]);
      setCameras(list);
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(CAMERA_KEY);
      } catch {
        // storage unavailable
      }
      const chosen = wanted ?? (saved && list.some((c) => c.id === saved) ? saved : pickBackCamera(list));
      setCameraId(chosen);

      const scanner = new Html5Qrcode(readerId, {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        // Uses Android's built-in QR reader when available: much better on Samsung phones.
        useBarCodeDetectorIfSupported: true,
      });
      scannerRef.current = scanner;
      const sharp = { width: { ideal: 1280 }, height: { ideal: 720 }, advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] };
      await scanner.start(
        chosen ?? { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: qrBox,
          videoConstraints: chosen ? { deviceId: { exact: chosen }, ...sharp } : { facingMode: 'environment', ...sharp },
        },
        (text: string) => void handleText(text),
        () => undefined,
      );
      setScanning(true);
    } catch (err) {
      scannerRef.current = null;
      onError(cameraErrorMessage(err));
      setScanning(false);
    } finally {
      setStarting(false);
    }
  };

  // Fallback when the live camera doesn't work: take or pick a photo of the QR.
  const scanPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    onError('');
    onReset?.();
    if (scanning) await stopCamera();
    let text: string;
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const reader = new Html5Qrcode(photoReaderId, false);
      text = await reader.scanFile(file, false);
      reader.clear();
    } catch {
      onError('No QR code found in that photo. Hold the phone closer so the QR fills the picture, and try again.');
      return;
    }
    busyRef.current = false;
    await handleText(text);
  };

  return (
    <>
      <div
        id={readerId}
        data-testid="qr-camera"
        className={`w-full max-w-sm mx-auto rounded-xl overflow-hidden bg-black ${scanning || starting ? 'block min-h-[260px]' : 'hidden'}`}
      />
      <div id={photoReaderId} className="hidden" />
      {scanning && cameras.length > 1 && (
        <label className="flex flex-col gap-1 text-xs text-gym-muted">
          Camera (try another if the QR isn't read)
          <select
            aria-label="Camera"
            value={cameraId ?? ''}
            onChange={async (e) => {
              const id = e.target.value;
              try {
                localStorage.setItem(CAMERA_KEY, id);
              } catch {
                // storage unavailable
              }
              await stopCamera();
              await startCamera(id);
            }}
            className="min-h-[40px] bg-black text-white border border-gym-border rounded-xl px-3 text-sm focus:outline-none focus:border-gym-primary"
          >
            {cameras.map((c, i) => (
              <option key={c.id} value={c.id}>
                {c.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}
      {scanning ? (
        <Button variant="outline" onClick={stopCamera} leftIcon={<CameraOff className="w-4 h-4" />}>Stop camera</Button>
      ) : (
        <Button variant="primary" onClick={() => startCamera()} isLoading={starting} leftIcon={<Camera className="w-4 h-4" />}>Start camera</Button>
      )}
      <label className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-gym-border text-sm font-heading text-white hover:border-gym-primary cursor-pointer">
        <ImageUp className="w-4 h-4 text-gym-primary" /> Scan from photo
        <input type="file" accept="image/*" className="sr-only" onChange={scanPhoto} aria-label="Scan QR from photo" />
      </label>
      {scanning && hint && <p className="text-xs text-gym-muted text-center">{hint}</p>}
    </>
  );
};

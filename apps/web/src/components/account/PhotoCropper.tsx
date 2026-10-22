import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

const VIEW = 280; // crop circle size on screen (px)
const OUTPUT = 512; // saved image size (px)

interface Props {
  file: File | null;
  onCancel: () => void;
  onCrop: (cropped: File) => void;
}

/** Drag to position and zoom to fit; saves a square JPEG of the circle area. */
export const PhotoCropper: React.FC<Props> = ({ file, onCancel, onCrop }) => {
  const [src, setSrc] = useState('');
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    const image = new Image();
    image.onload = () => setImg(image);
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Image scale so its shorter side exactly fills the circle at zoom 1.
  const base = img ? VIEW / Math.min(img.naturalWidth || VIEW, img.naturalHeight || VIEW) : 1;
  const scale = base * zoom;
  const w = (img?.naturalWidth || VIEW) * scale;
  const h = (img?.naturalHeight || VIEW) * scale;

  const clamp = (o: { x: number; y: number }, s = scale) => {
    const maxX = Math.max(0, ((img?.naturalWidth || VIEW) * s - VIEW) / 2);
    const maxY = Math.max(0, ((img?.naturalHeight || VIEW) * s - VIEW) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, o.x)), y: Math.min(maxY, Math.max(-maxY, o.y)) };
  };

  const setZoomClamped = (z: number) => {
    const next = Math.min(4, Math.max(1, z));
    setZoom(next);
    setOffset((o) => clamp(o, base * next));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOffset(clamp({ x: drag.current.ox + e.clientX - drag.current.x, y: drag.current.oy + e.clientY - drag.current.y }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const save = async () => {
    if (!file) return;
    // If the photo can't be drawn (very old browser), upload it as chosen.
    if (!img || !img.naturalWidth) return onCrop(file);
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return onCrop(file);
    // Visible circle (VIEW x VIEW) in image pixels.
    const sx = (img.naturalWidth - VIEW / scale) / 2 - offset.x / scale;
    const sy = (img.naturalHeight - VIEW / scale) / 2 - offset.y / scale;
    ctx.drawImage(img, sx, sy, VIEW / scale, VIEW / scale, 0, 0, OUTPUT, OUTPUT);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
    onCrop(new File([blob ?? file], 'profile.jpg', { type: 'image/jpeg' }));
  };

  return (
    <Modal isOpen={!!file} onClose={onCancel} title="CROP YOUR PHOTO" maxWidth="md">
      <div className="flex flex-col items-center gap-4">
        <div
          className="relative overflow-hidden rounded-full border-2 border-gym-primary bg-black touch-none cursor-grab active:cursor-grabbing select-none"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={(e) => setZoomClamped(zoom - e.deltaY / 500)}
          aria-label="Drag to position your photo"
        >
          {src && (
            <img
              src={src}
              alt="Photo to crop"
              draggable={false}
              className="absolute max-w-none pointer-events-none"
              style={{ width: w, height: h, left: (VIEW - w) / 2 + offset.x, top: (VIEW - h) / 2 + offset.y }}
            />
          )}
        </div>
        <div className="flex items-center gap-3 w-full max-w-[280px]">
          <ZoomOut className="w-4 h-4 text-gym-muted" />
          <input
            type="range"
            min={1}
            max={4}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoomClamped(Number(e.target.value))}
            className="flex-1 accent-gym-primary"
            aria-label="Zoom"
          />
          <ZoomIn className="w-4 h-4 text-gym-muted" />
        </div>
        <p className="text-xs text-gym-muted">Drag to move · slide to zoom</p>
        <div className="flex gap-2 w-full">
          <Button variant="ghost" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" className="flex-1" onClick={save}>Use Photo</Button>
        </div>
      </div>
    </Modal>
  );
};

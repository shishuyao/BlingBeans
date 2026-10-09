import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';

type Props = {
  file: File;
  aspect?: number;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

type Pt = { x: number; y: number };

export function ImageCropper({ file, aspect = 4 / 3, onCancel, onConfirm }: Props) {
  const { t } = useI18n();
  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const pointers = useRef(new Map<number, Pt>());
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);
  const dragStart = useRef<Pt | null>(null);

  const [src, setSrc] = useState('');
  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [view, setView] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Pt>({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      setView({ w, h: w / aspect });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect]);

  const cover = nat.w && view.w ? Math.max(view.w / nat.w, view.h / nat.h) : 1;
  const scale = cover * zoom;

  const clampOffset = (ox: number, oy: number, nextZoom: number) => {
    if (!nat.w || !view.w) return { x: ox, y: oy };
    const s = cover * nextZoom;
    const maxX = Math.max(0, (nat.w * s - view.w) / 2);
    const maxY = Math.max(0, (nat.h * s - view.h) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, ox)),
      y: Math.min(maxY, Math.max(-maxY, oy)),
    };
  };

  const changeZoom = (next: number) => {
    const z = Math.min(3, Math.max(1, next));
    setZoom(z);
    setOffset((o) => clampOffset(o.x, o.y, z));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
      pinchStart.current = null;
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      dragStart.current = null;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchStart.current.dist > 0) {
        changeZoom(pinchStart.current.zoom * (dist / pinchStart.current.dist));
      }
      return;
    }
    if (dragStart.current && pointers.current.size === 1) {
      setOffset(clampOffset(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y, zoom));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 1) {
      const pt = [...pointers.current.values()][0];
      dragStart.current = { x: pt.x - offset.x, y: pt.y - offset.y };
    } else {
      dragStart.current = null;
    }
  };

  const confirm = () => {
    const img = imgRef.current;
    if (!img || !nat.w || !view.w || busy) return;
    setBusy(true);
    const outW = 900;
    const outH = Math.round(outW / aspect);
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setBusy(false);
      return;
    }
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, outW, outH);

    const imgLeft = (view.w - nat.w * scale) / 2 + offset.x;
    const imgTop = (view.h - nat.h * scale) / 2 + offset.y;
    const sx = -imgLeft / scale;
    const sy = -imgTop / scale;
    const sw = view.w / scale;
    const sh = view.h / scale;

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
    canvas.toBlob(
      (blob) => {
        setBusy(false);
        if (!blob) return;
        onConfirm(new File([blob], 'reward.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.88
    );
  };

  const dw = nat.w * scale;
  const dh = nat.h * scale;

  return (
    <div className="crop-overlay" role="dialog" aria-modal aria-label={t('cropTitle')}>
      <div className="crop-card">
        <h3>{t('cropTitle')}</h3>
        <p className="crop-sub">{t('cropSub')}</p>
        <div
          ref={viewportRef}
          className="crop-viewport"
          style={{ aspectRatio: `${aspect}` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {src ? (
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              className="crop-img"
              style={{
                width: dw || undefined,
                height: dh || undefined,
                left: view.w ? (view.w - dw) / 2 + offset.x : 0,
                top: view.h ? (view.h - dh) / 2 + offset.y : 0,
              }}
              onLoad={(e) => {
                const el = e.currentTarget;
                setNat({ w: el.naturalWidth, h: el.naturalHeight });
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
            />
          ) : null}
          <div className="crop-grid" />
        </div>
        <label className="crop-zoom">
          <span>{t('zoom')}</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => changeZoom(Number(e.target.value))}
          />
        </label>
        <div className="form-inline">
          <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>
            {t('cancel')}
          </button>
          <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={confirm} disabled={busy || !nat.w}>
            {busy ? t('processing') : t('done')}
          </button>
        </div>
      </div>
    </div>
  );
}

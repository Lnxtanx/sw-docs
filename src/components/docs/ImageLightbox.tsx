/**
 * ImageLightbox — click-to-expand image preview with zoom + pan.
 *
 * Usage: render once in DocPage, pass open/src/alt via state.
 * Controls:
 *  - Scroll wheel   → zoom in / out
 *  - Click & drag   → pan when zoomed
 *  - +/- buttons    → zoom in / out
 *  - Reset button   → back to fit
 *  - Backdrop click → close
 *  - Escape key     → close
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import './ImageLightbox.css';

interface Props {
  src: string;
  alt: string;
  onClose: () => void;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.3;

export function ImageLightbox({ src, alt, onClose }: Props) {
  const [scale, setScale]       = useState(1);
  const [offset, setOffset]     = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const dragStart  = useRef<{ x: number; y: number } | null>(null);
  const offsetSnap = useRef({ x: 0, y: 0 });
  const wrapRef    = useRef<HTMLDivElement>(null);

  // ── Close on Escape ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Prevent body scroll while open ───────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ── Scroll-wheel zoom (centred on cursor) ─────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    setScale(s => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta)));
  }, []);

  // ── Drag / pan ────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    dragStart.current  = { x: e.clientX, y: e.clientY };
    offsetSnap.current = { ...offset };
    setDragging(true);
  }, [scale, offset]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({ x: offsetSnap.current.x + dx, y: offsetSnap.current.y + dy });
  }, [dragging]);

  const onMouseUp = useCallback(() => {
    setDragging(false);
    dragStart.current = null;
  }, []);

  // ── Zoom helpers ──────────────────────────────────────────────────────────
  const zoomIn    = () => setScale(s => Math.min(MAX_SCALE, s + ZOOM_STEP));
  const zoomOut   = () => setScale(s => Math.max(MIN_SCALE, s - ZOOM_STEP));
  const zoomReset = () => { setScale(1); setOffset({ x: 0, y: 0 }); };

  const zoomPct = Math.round(scale * 100);

  return (
    <div
      className="lb-backdrop"
      onClick={onClose}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Toolbar */}
      <div className="lb-toolbar" onClick={e => e.stopPropagation()}>
        <button className="lb-btn" onClick={zoomOut}  title="Zoom out">−</button>
        <span   className="lb-zoom-pct">{zoomPct}%</span>
        <button className="lb-btn" onClick={zoomIn}   title="Zoom in">+</button>
        <button className="lb-btn lb-btn-reset" onClick={zoomReset} title="Reset">↺</button>
        <button className="lb-btn lb-btn-close" onClick={onClose}   title="Close (Esc)">✕</button>
      </div>

      {/* Image wrapper — stop click from closing when interacting with image */}
      <div
        ref={wrapRef}
        className={`lb-img-wrap ${dragging ? 'lb-dragging' : ''} ${scale > 1 ? 'lb-zoomable' : ''}`}
        onClick={e => e.stopPropagation()}
        onMouseDown={onMouseDown}
        onWheel={onWheel}
      >
        <img
          src={src}
          alt={alt}
          className="lb-img"
          style={{
            transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
          }}
          draggable={false}
        />
      </div>

      {/* Alt text caption */}
      {alt && <div className="lb-caption" onClick={e => e.stopPropagation()}>{alt}</div>}
    </div>
  );
}

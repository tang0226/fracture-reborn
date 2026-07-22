import { V, useState, bindStore } from '../lmnt.js';
import { store } from '../store.js';

function formatCoord(v, step) {
  const d = Math.min(16, Math.max(2, Math.ceil(-Math.log10(step)) + 2));
  if (v === 0) return (0).toFixed(d);
  const absV = Math.abs(v);
  if (absV < 1e-4 || absV >= 1e6) {
    const exp = Math.floor(Math.log10(absV));
    return v.toExponential(Math.min(14, Math.max(1, d + exp)));
  }
  return v.toFixed(d);
}

export function CoordOverlay() {
  const mouse = useState(null); // { px, py } in window pixels

  bindStore(store, {
    select: s => s.viewport,
    shouldUpdate: (n, p) => n.center !== p.center || n.size !== p.size || n.flipYAxis !== p.flipYAxis,
  });

  window.addEventListener('mousemove', (e) => {
    mouse.set({ px: e.clientX, py: e.clientY });
  });

  window.addEventListener('mouseleave', () => mouse.set(null));

  return () => {
    const m = mouse.get();
    if (!m) return V('div', { style: 'display:none' });
    const { center, size, flipYAxis } = store.getState().viewport;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const re = center.re + (m.px / w - 0.5) * size;
    const im = center.im + (m.py / h - 0.5) * size * (h / w) * (flipYAxis ? 1 : -1);
    const step = size / w;
    const sign = im < 0 ? ' − ' : ' + ';
    return V('div', { class: 'info-chip' }, `${formatCoord(re, step)}${sign}${formatCoord(Math.abs(im), step)}i`);
  };
}

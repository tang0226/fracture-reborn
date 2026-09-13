import { V, useState, bindStore } from '../lmnt.js';
import { store } from '../store.js';
import { dapCtx } from '../dap-ctx.js';

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

// Format a DAP coordinate string for display, trimming to the precision
// warranted by the current step size (one pixel width in complex space).
// maxD caps total decimal places shown (use dapPrecision to match stored precision).
function formatDapStr(dapStr, step, maxD) {
  if (dapStr === '0') return '0';
  const d = Math.min(maxD, Math.max(3, Math.ceil(-Math.log10(Math.max(1e-300, step))) + 3));
  const dot = dapStr.indexOf('.');
  if (dot === -1) return dapStr;
  return dapStr.slice(0, dot + 1 + d);
}

export function CoordOverlay() {
  const mouse = useState(null); // { px, py } in window pixels

  bindStore(store, {
    select: s => ({ viewport: s.viewport, engine: s.engine }),
    shouldUpdate: (n, p) =>
      n.viewport.center !== p.viewport.center ||
      n.viewport.size !== p.viewport.size ||
      n.viewport.flipYAxis !== p.viewport.flipYAxis ||
      n.engine.useArbitraryPrecision !== p.engine.useArbitraryPrecision ||
      n.engine.useDoubleDouble !== p.engine.useDoubleDouble,
  });

  window.addEventListener('mousemove', (e) => {
    mouse.set({ px: e.clientX, py: e.clientY });
  });

  window.addEventListener('mouseleave', () => mouse.set(null));

  return () => {
    const m = mouse.get();
    if (!m) return V('div', { style: 'display:none' });
    const { center, size, flipYAxis } = store.getState().viewport;
    const { engine } = store.getState();
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (engine.useArbitraryPrecision || engine.useDoubleDouble) {
      // High-precision coordinate display using DAP arithmetic.
      // Also used for DD mode: center strings have 30+ digit precision because
      // ControlsCanvas.getUseAP() returns true for DD mode during zoom.
      const cx = dapCtx.n(center.re);
      const cy = dapCtx.n(center.im);
      const sz = dapCtx.n(size);
      const reOff = m.px / w - 0.5;
      const imOff = (m.py / h - 0.5) * (h / w) * (flipYAxis ? 1 : -1);
      const re = dapCtx.add(cx, dapCtx.mul(dapCtx.n(reOff), sz));
      const im = dapCtx.add(cy, dapCtx.mul(dapCtx.n(imOff), sz));
      const reStr = dapCtx.toString(re);
      const imStr = dapCtx.toString(im);
      const step = parseFloat(size) / w;
      const maxD = engine.dapPrecision;
      const sign = imStr.startsWith('-') ? ' − ' : ' + ';
      return V('div', { class: 'info-chip' },
        `${formatDapStr(reStr, step, maxD)}${sign}${formatDapStr(imStr.replace(/^-/, ''), step, maxD)}i`
      );
    } else {
      // Float64 path
      const cr = parseFloat(center.re);
      const ci = parseFloat(center.im);
      const sz = parseFloat(size);
      const re = cr + (m.px / w - 0.5) * sz;
      const im = ci + (m.py / h - 0.5) * sz * (h / w) * (flipYAxis ? 1 : -1);
      const step = sz / w;
      const sign = im < 0 ? ' − ' : ' + ';
      return V('div', { class: 'info-chip' }, `${formatCoord(re, step)}${sign}${formatCoord(Math.abs(im), step)}i`);
    }
  };
}

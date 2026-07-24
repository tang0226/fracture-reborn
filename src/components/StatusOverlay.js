import { V, bindStore } from '../lmnt.js';
import { store } from '../store.js';

export function StatusOverlay() {
  bindStore(store, { select: s => s.renderStatus });

  return () => {
    const { phase, tilesDone, tilesTotal, elapsed, fromCache } = store.getState().renderStatus;
    if (phase === 'idle') return V('div', { style: 'display:none' });
    const secs = (elapsed / 1000).toFixed(1);
    const pct = tilesTotal > 0 ? Math.floor(tilesDone / tilesTotal * 100) : 0;
    const label = fromCache ? 'Rendering from cache…' : 'Rendering…';
    const text = phase === 'rendering'
      ? `${label} ${pct}% (${secs}s)`
      : `Done — ${secs}s`;
    return V('div', { class: 'info-chip' }, text);
  };
}

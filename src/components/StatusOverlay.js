import { V, bindStore } from '../lmnt.js';
import { store } from '../store.js';

export function StatusOverlay() {
  bindStore(store, { select: s => s.renderStatus });

  return () => {
    const { phase, tilesDone, tilesTotal, elapsed } = store.getState().renderStatus;
    if (phase === 'idle') return V('div', { style: 'display:none' });
    const secs = (elapsed / 1000).toFixed(1);
    const pct = tilesTotal > 0 ? Math.floor(tilesDone / tilesTotal * 100) : 0;
    const text = phase === 'rendering'
      ? `Rendering… ${pct}% (${secs}s)`
      : `Done — ${secs}s`;
    return V('div', { class: 'info-chip' }, text);
  };
}

import { V, bindStore, useStyle } from '../lmnt.js';
import { store } from '../store.js';

export function StatusOverlay() {
  bindStore(store, { select: s => s.renderStatus });

  useStyle(`
    & {
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 3;
      background: var(--panel-bg);
      color: var(--panel-text);
      font-size: 12px;
      font-family: monospace;
      padding: 5px 10px;
      border-radius: var(--panel-radius);
      pointer-events: none;
      opacity: 0.85;
    }
  `);

  return () => {
    const { phase, tilesDone, tilesTotal, elapsed } = store.getState().renderStatus;
    if (phase === 'idle') return V('div', { style: 'display:none' });
    const secs = (elapsed / 1000).toFixed(1);
    const pct = tilesTotal > 0 ? Math.floor(tilesDone / tilesTotal * 100) : 0;
    const text = phase === 'rendering'
      ? `Rendering… ${pct}% (${secs}s)`
      : `Done — ${secs}s`;
    return V('div', {}, text);
  };
}

import { V, bindStore } from '../lmnt.js';
import { store } from '../store.js';

function formatSize(s) {
  if (s >= 0.01 && s < 10000) return s.toPrecision(4);
  return s.toExponential(3);
}

export function ZoomOverlay() {
  bindStore(store, {
    select: s => s.viewport,
    shouldUpdate: (n, p) => n.size !== p.size,
  });

  return () => {
    const { size } = store.getState().viewport;
    return V('div', { class: 'info-chip' }, `Width: ${formatSize(size)}`);
  };
}

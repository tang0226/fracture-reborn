import { V, useStyle } from '../lmnt.js';
import { CoordOverlay } from './CoordOverlay.js';
import { ZoomOverlay } from './ZoomOverlay.js';
import { StatusOverlay } from './StatusOverlay.js';

export function InfoOverlays() {
  useStyle(`
    & {
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 3;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
      pointer-events: none;
    }
    & .info-chip {
      background: var(--panel-bg);
      color: var(--panel-text);
      font-size: 12px;
      font-family: monospace;
      padding: 5px 10px;
      border-radius: var(--panel-radius);
      opacity: 0.85;
    }
  `);

  return () => V('div', {},
    V(CoordOverlay),
    V(ZoomOverlay),
    V(StatusOverlay),
  );
}

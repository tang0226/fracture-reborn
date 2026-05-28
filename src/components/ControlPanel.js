import { V, useState, useStyle, bindStore } from "../lmnt.js";
import { store } from "../store.js";

export function ControlPanel() {

  const open = useState(true);
  bindStore(store, { select: s => s.iteration });

  useStyle(`
    & {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 2;
    }
    & .panel {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      width: 400px;
      background: var(--panel-bg);
      transition: transform 0.25s ease;
      pointer-events: auto;
    }
    &.closed .panel {
      transform: translateX(-100%);
    }
    & .toggle-btn {
      position: absolute;
      top: 12px;
      left: 12px;
      width: 30px;
      background: var(--panel-bg);
      border: none;
      color: var(--panel-text);
      cursor: pointer;
      font-size: 20px;
      padding: 6px 0;
      border-radius: var(--panel-radius);
      pointer-events: auto;
      text-align: center;
    }
    & .toggle-btn:hover {
      background: var(--panel-surface-hover);
    }
    & .toggle-btn:active {
      background: var(--panel-surface-active);
    }
  `);

  return () => {
    const isOpen = open.get();
    return V('div', { class: isOpen ? '' : 'closed' },
      V('div', { class: 'panel' }),
      V('button', { class: 'toggle-btn', onClick: () => open.set(!isOpen) },
        isOpen ? '«' : '☰'
      ),
    );
  };
}

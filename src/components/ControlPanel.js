import { V, useState, useStyle } from "../lmnt.js";
import { store } from "../store.js";
import { render } from "../render.js";

import { ZoomSection } from './ZoomSection.js';
import { FractalSection } from './FractalSection.js';
import { IterationSection } from './IterationSection.js';
import { ColoringSection } from './ColoringSection.js';
import { RenderSection } from './RenderSection.js';
import { ExportSection } from './ExportSection.js';

export function ControlPanel() {

  const open = useState(true);

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
      padding: 60px 20px 20px 20px;
      overflow-y: auto;
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
      background: var(--panel-btn-hover);
    }
    & .toggle-btn:active {
      background: var(--panel-btn-active);
    }
    & .standalone-btn {
      align-self: flex-start;
      background: var(--panel-surface);
      border: 1px solid var(--panel-border);
      color: var(--panel-text);
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      padding: 5px 14px;
      border-radius: var(--panel-radius);
    }
    & .standalone-btn:hover {
      background: var(--panel-surface-hover);
    }
    & .standalone-btn:active {
      background: var(--panel-surface-active);
    }
    & .render-btn {
      position: absolute;
      top: 12px;
      right: 12px;
    }
  `);

  return () => {
    const isOpen = open.get();
    return V('div', { class: isOpen ? '' : 'closed' },
      V('div', { class: 'panel' },
        V('button', { class: 'render-btn standalone-btn', onClick: () => render(store.getState()) }, 'Render'),
        V(ZoomSection),
        V(FractalSection),
        V(IterationSection),
        V(ColoringSection),
        V(RenderSection),
        V(ExportSection),
      ),
      V('button', { class: 'toggle-btn', onClick: () => open.set(!isOpen) },
        isOpen ? '«' : '☰'
      ),
    );
  };
}

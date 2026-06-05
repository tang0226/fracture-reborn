import { V, useState, useStyle, bindStore } from "../lmnt.js";
import { store } from "../store.js";
import { render } from "../render.js";

import { CollapsibleSection } from './CollapsibleSection.js';
import { LogSlider } from "./LogSlider.js";
import { CheckboxInput } from "./CheckboxInput.js";
import { PaletteEditor } from "./PaletteEditor.js";
import { SelectInput } from "./SelectInput.js";
import { Slider } from "./Slider.js";

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function ControlPanel() {

  const open = useState(true);
  bindStore(store, { select: s => s.iteration });
  bindStore(store, { select: s => s.coloring });
  bindStore(store, { select: s => s.render });

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
    & .solid-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    & .swatch {
      width: 22px;
      height: 22px;
      border-radius: var(--panel-radius);
      border: 1px solid var(--panel-border);
      overflow: hidden;
      position: relative;
      flex-shrink: 0;
      cursor: pointer;
    }
    & .swatch input[type="color"] {
      position: absolute;
      width: 200%;
      height: 200%;
      top: -50%;
      left: -50%;
      border: none;
      padding: 0;
      cursor: pointer;
    }
    & .solid-label {
      color: var(--panel-text-muted);
      font-size: var(--text-base);
    }
  `);

  return () => {
    const isOpen = open.get();
    const { iteration, coloring, render: renderCfg } = store.getState();
    const { exterior, interior, orbitTrap } = coloring;

    return V('div', { class: isOpen ? '' : 'closed' },
      V('div', { class: 'panel' },
        V('button', { class: 'render-btn standalone-btn', onClick: () => render(store.getState()) }, 'Render'),

        V(CollapsibleSection, { title: 'Zoom' },
          V(SelectInput, {
            label: 'Click zoom factor',
            value: '4',
            options: [
              { value: '1.5', label: '1.5' },
              { value: '2', label: '2' },
              { value: '4', label: '4' },
              { value: '8', label: '8' },
              { value: '16', label: '16' },
            ],
            onChange: v => store.dispatch({ type: 'viewport/setClickZoomFactor', payload: Number(v) }),
          }),
          V('button', {
            class: 'standalone-btn',
            onClick: () => {
              let state = store.getState();
              store.dispatch({
                type: 'viewport/resetZoom',
                payload: {
                  formulaKey: state.fractal.formula,
                  params: state.fractal.params,
                }
              });
              render(store.getState());
            },
          }, 'Reset zoom'),
          V(CheckboxInput, {
            label: 'Flip y-axis',
            checked: store.getState().viewport.flipYAxis,
            onChange: v => store.dispatch({ type: 'viewport/setFlipYAxis', payload: v })
          })
        ),

        V(CollapsibleSection, { title: 'Iteration' },
          V(LogSlider, {
            label: 'Max iterations',
            value: iteration.maxIter,
            min: 1, max: 100000, integer: true,
            onChange: v => store.dispatch({ type: 'iteration/setMaxIter', payload: v }),
          }),
          V(CheckboxInput, {
            label: 'Smoothing',
            checked: iteration.smoothing,
            onChange: checked => store.dispatch({ type: 'iteration/setSmoothing', payload: checked }),
          }),
        ),

        V(CollapsibleSection, { title: 'Coloring' },

          V(SelectInput, {
            label: 'Exterior',
            value: exterior.method,
            options: [
              { value: 'smoothIter', label: 'Smooth iteration' },
              { value: 'orbitTrap',  label: 'Orbit trap' },
              { value: 'solid',      label: 'Solid' },
            ],
            onChange: m => store.dispatch({ type: 'coloring/setExteriorMethod', payload: m }),
          }),

          exterior.method === 'smoothIter' ? V(PaletteEditor, {
            stops: exterior.smoothIter.stops,
            onChange: stops => store.dispatch({ type: 'coloring/setSmoothIterStops', payload: stops }),
          }) : null,
          exterior.method === 'smoothIter' ? (exterior.smoothIter.logScale
            ? V(Slider, {
                label: 'Period',
                value: exterior.smoothIter.period,
                min: 0.1, max: 20, step: 0.1,
                onChange: v => store.dispatch({ type: 'coloring/setSmoothIter', payload: { period: v } }),
              })
            : V(LogSlider, {
                label: 'Period',
                value: exterior.smoothIter.period,
                min: 1, max: 10000, step: 1,
                onChange: v => store.dispatch({ type: 'coloring/setSmoothIter', payload: { period: v } }),
              })
          ) : null,
          exterior.method === 'smoothIter' ? V(Slider, {
            label: 'Offset',
            value: exterior.smoothIter.offset,
            min: -1, max: 1, step: 0.01,
            onChange: v => store.dispatch({ type: 'coloring/setSmoothIter', payload: { offset: v } }),
          }) : null,
          exterior.method === 'smoothIter' ? V(CheckboxInput, {
            label: 'Log scale',
            checked: exterior.smoothIter.logScale,
            onChange: c => store.dispatch({ type: 'coloring/setSmoothIter', payload: { logScale: c, period: c ? 1 : 200 } }),
          }) : null,

          exterior.method === 'orbitTrap' ? V(PaletteEditor, {
            stops: orbitTrap.stops,
            onChange: stops => store.dispatch({ type: 'coloring/setOrbitTrapStops', payload: stops }),
          }) : null,
          exterior.method === 'orbitTrap' ? V(LogSlider, {
            label: 'Scale',
            value: orbitTrap.scale,
            min: 0.001, max: 100, step: 0.01,
            onChange: v => store.dispatch({ type: 'coloring/setOrbitTrap', payload: { scale: v } }),
          }) : null,
          exterior.method === 'orbitTrap' ? V(Slider, {
            label: 'Offset',
            value: orbitTrap.offset,
            min: -1, max: 1, step: 0.01,
            onChange: v => store.dispatch({ type: 'coloring/setOrbitTrap', payload: { offset: v } }),
          }) : null,
          exterior.method === 'orbitTrap' ? V(CheckboxInput, {
            label: 'Log scale',
            checked: orbitTrap.logScale,
            onChange: c => store.dispatch({ type: 'coloring/setOrbitTrap', payload: { logScale: c } }),
          }) : null,

          exterior.method === 'solid' ? V('div', { class: 'solid-row' },
            V('div', { class: 'swatch' },
              V('input', {
                type: 'color',
                value: rgbToHex(exterior.solid.r, exterior.solid.g, exterior.solid.b),
                onInput: e => {
                  const { r, g, b } = hexToRgb(e.target.value);
                  store.dispatch({ type: 'coloring/setExteriorSolid', payload: { r, g, b } });
                },
              }),
            ),
            V('span', { class: 'solid-label' }, 'Solid color'),
          ) : null,

          V('hr'),

          V(SelectInput, {
            label: 'Interior',
            value: interior.method,
            options: [
              { value: 'solid',     label: 'Solid' },
              { value: 'orbitTrap', label: 'Orbit trap' },
            ],
            onChange: m => store.dispatch({ type: 'coloring/setInteriorMethod', payload: m }),
          }),

          interior.method === 'solid' ? V('div', { class: 'solid-row' },
            V('div', { class: 'swatch' },
              V('input', {
                type: 'color',
                value: rgbToHex(interior.solid.r, interior.solid.g, interior.solid.b),
                onInput: e => {
                  const { r, g, b } = hexToRgb(e.target.value);
                  store.dispatch({ type: 'coloring/setInteriorSolid', payload: { r, g, b } });
                },
              }),
            ),
            V('span', { class: 'solid-label' }, 'Solid color'),
          ) : null,

          interior.method === 'orbitTrap' ? V(PaletteEditor, {
            stops: orbitTrap.stops,
            onChange: stops => store.dispatch({ type: 'coloring/setOrbitTrapStops', payload: stops }),
          }) : null,
          interior.method === 'orbitTrap' ? V(LogSlider, {
            label: 'Scale',
            value: orbitTrap.scale,
            min: 0.001, max: 100, step: 0.01,
            onChange: v => store.dispatch({ type: 'coloring/setOrbitTrap', payload: { scale: v } }),
          }) : null,
          interior.method === 'orbitTrap' ? V(Slider, {
            label: 'Offset',
            value: orbitTrap.offset,
            min: -1, max: 1, step: 0.01,
            onChange: v => store.dispatch({ type: 'coloring/setOrbitTrap', payload: { offset: v } }),
          }) : null,
          interior.method === 'orbitTrap' ? V(CheckboxInput, {
            label: 'Log scale',
            checked: orbitTrap.logScale,
            onChange: c => store.dispatch({ type: 'coloring/setOrbitTrap', payload: { logScale: c } }),
          }) : null,

        ),

        V(CollapsibleSection, { title: 'Render' },
          V(Slider, {
            label: 'Workers',
            value: renderCfg.workerCount,
            min: 1, max: navigator.hardwareConcurrency, step: 1,
            onChange: v => store.dispatch({ type: 'render/setWorkerCount', payload: v }),
          }),
          V(SelectInput, {
            label: 'Tile size',
            value: String(renderCfg.tileSize),
            options: [16, 32, 64, 128, 256].map(n => ({ value: String(n), label: String(n) })),
            onChange: v => store.dispatch({ type: 'render/setTileSize', payload: +v }),
          }),
          V(CheckboxInput, {
            label: 'Anti-aliasing',
            checked: renderCfg.antiAliasing !== false,
            onChange: checked => store.dispatch({
              type: 'render/setAntiAliasing',
              payload: checked ? 2 : false,
            }),
          }),
          renderCfg.antiAliasing !== false ? V(Slider, {
            label: 'AA samples',
            value: renderCfg.antiAliasing,
            min: 2, max: 8, step: 1,
            onChange: v => store.dispatch({ type: 'render/setAntiAliasing', payload: v }),
          }) : null,
          V(CheckboxInput, {
            label: 'Progressive resolution',
            checked: renderCfg.progressive,
            onChange: checked => store.dispatch({ type: 'render/setProgressive', payload: checked }),
          }),
        ),
      ),
      V('button', { class: 'toggle-btn', onClick: () => open.set(!isOpen) },
        isOpen ? '«' : '☰'
      ),
    );
  };
}

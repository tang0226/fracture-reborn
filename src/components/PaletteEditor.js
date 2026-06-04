import { V, useState, useStyle } from "../lmnt.js";

function stopsToCSS(stops) {
  return [...stops]
    .sort((a, b) => a.pos - b.pos)
    .map(s => `rgb(${s.r},${s.g},${s.b}) ${(s.pos * 100).toFixed(2)}%`)
    .join(', ');
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function interpolateColor(stops, pos) {
  const sorted = [...stops].sort((a, b) => a.pos - b.pos);
  let i = 0;
  while (i + 1 < sorted.length - 1 && pos >= sorted[i + 1].pos) i++;
  const lo = sorted[i], hi = sorted[i + 1] ?? sorted[i];
  const range = hi.pos - lo.pos;
  const q = range > 0 ? (pos - lo.pos) / range : 0;
  return {
    r: Math.round(lo.r + q * (hi.r - lo.r)),
    g: Math.round(lo.g + q * (hi.g - lo.g)),
    b: Math.round(lo.b + q * (hi.b - lo.b)),
  };
}

export function PaletteEditor({}) {
  const selectedIdx = useState(-1);
  // Mutable ref updated each render so drag closures always see the latest stops/onChange
  const drag = { idx: -1, stops: null, onChange: null, barLeft: 0, barWidth: 0 };

  useStyle(`
    & {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
      user-select: none;
    }
    & .bar {
      height: 20px;
      border-radius: var(--panel-radius);
      border: 1px solid var(--panel-border);
      cursor: crosshair;
    }
    & .handles {
      position: relative;
      height: 14px;
    }
    & .handle {
      position: absolute;
      transform: translateX(-50%);
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid rgba(128,128,128,0.6);
      box-sizing: border-box;
      cursor: ew-resize;
    }
    & .handle.selected {
      border-color: var(--panel-text);
      box-shadow: 0 0 0 1px var(--panel-bg), 0 0 0 3px var(--panel-text);
    }
    & .color-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-top: 2px;
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
    & .stop-label {
      color: var(--panel-text-muted);
      font-size: 13px;
      flex: 1;
    }
    & .del-btn {
      background: transparent;
      border: 1px solid var(--panel-border);
      color: var(--panel-text-muted);
      font-size: 11px;
      padding: 2px 6px;
      border-radius: var(--panel-radius);
      cursor: pointer;
      line-height: 1.4;
    }
    & .del-btn:hover {
      color: var(--panel-text);
      border-color: var(--panel-text);
    }
    & .btn-row {
      display: flex;
      gap: 6px;
    }
    & .action-btn {
      flex: 1;
      background: var(--panel-surface);
      border: 1px solid var(--panel-border);
      color: var(--panel-text-muted);
      font-size: 11px;
      padding: 3px 0;
      border-radius: var(--panel-radius);
      cursor: pointer;
    }
    & .action-btn:hover {
      background: var(--panel-surface-hover);
      color: var(--panel-text);
    }
    & .action-btn:active {
      background: var(--panel-surface-active);
    }
  `);

  return ({ stops, onChange }) => {
    drag.stops = stops;
    drag.onChange = onChange;

    const sel = selectedIdx.get();
    const selStop = sel >= 0 && sel < stops.length ? stops[sel] : null;

    return V('div', {},
      V('div', {
        class: 'bar',
        style: `background: linear-gradient(to right, ${stopsToCSS(stops)})`,
        onClick: e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          const color = interpolateColor(stops, pos);
          const newStops = [...stops, { pos, ...color }];
          onChange(newStops);
          selectedIdx.set(newStops.length - 1);
        },
      }),
      V('div', { class: 'handles' },
        ...stops.map((stop, i) =>
          V('div', {
            key: i,
            class: i === sel ? 'handle selected' : 'handle',
            style: `left: ${stop.pos * 100}%; background: rgb(${stop.r},${stop.g},${stop.b})`,
            onMousedown: e => {
              e.stopPropagation();
              selectedIdx.set(i);
              drag.idx = i;
              const rect = e.currentTarget.parentElement.getBoundingClientRect();
              drag.barLeft = rect.left;
              drag.barWidth = rect.width;

              const onMove = e => {
                const pos = Math.max(0, Math.min(1, (e.clientX - drag.barLeft) / drag.barWidth));
                const newStops = drag.stops.map((s, si) => si === drag.idx ? { ...s, pos } : s);
                drag.onChange(newStops);
              };
              const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
              };
              document.addEventListener('mousemove', onMove);
              document.addEventListener('mouseup', onUp);
            },
          })
        ),
      ),
      V('div', { class: 'btn-row' },
        V('button', {
          class: 'action-btn',
          onClick: () => {
            const sorted = [...stops].sort((a, b) => a.pos - b.pos);
            onChange(sorted.map((s, i) => ({ ...s, pos: i / (sorted.length - 1) })));
          },
        }, 'Spread evenly'),
        V('button', {
          class: 'action-btn',
          onClick: () => {
            const sorted = [...stops].sort((a, b) => a.pos - b.pos);
            const { r, g, b } = sorted[0];
            const last = sorted[sorted.length - 1];
            onChange(stops.map(s => s === last ? { ...s, r, g, b, pos: 1 } : s));
          },
        }, 'Cycle'),
      ),
      selStop
        ? V('div', { class: 'color-row' },
            V('div', { class: 'swatch' },
              V('input', {
                type: 'color',
                value: rgbToHex(selStop.r, selStop.g, selStop.b),
                onInput: e => {
                  const { r, g, b } = hexToRgb(e.target.value);
                  onChange(stops.map((s, i) => i === sel ? { ...s, r, g, b } : s));
                },
              }),
            ),
            V('span', { class: 'stop-label' }, `${(selStop.pos * 100).toFixed(0)}%`),
            stops.length > 2
              ? V('button', {
                  class: 'del-btn',
                  onClick: () => {
                    onChange(stops.filter((_, i) => i !== sel));
                    selectedIdx.set(-1);
                  },
                }, '✕')
              : null,
          )
        : null,
    );
  };
}

import { V, useStyle } from "../lmnt.js";

function valueToT(value, min, max) {
  return Math.max(0, Math.min(1000,
    Math.round(Math.log(value / min) / Math.log(max / min) * 1000)
  ));
}

function tToValue(t, min, max, step) {
  const raw = min * (max / min) ** (t / 1000);
  return Math.round(raw / step) * step;
}

export function LogSlider({ min, max, step = 1 }) {

  useStyle(`
    & {
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: 100%;
    }
    & .top-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
    }
    & .label {
      color: var(--panel-text-muted);
      font-size: var(--text-base);
      white-space: nowrap;
    }
    & .readout {
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--panel-border);
      color: var(--panel-text);
      text-align: right;
      width: 80px;
      font-size: var(--text-base);
      padding: 2px 0;
    }
    & .readout:focus {
      outline: none;
      border-bottom-color: var(--panel-text);
    }
    & .slider {
      width: 100%;
      accent-color: var(--panel-text);
      cursor: pointer;
    }
  `);

  return ({ label, value, min, max, step = 1, onChange }) => {
    const t = valueToT(value, min, max);

    return V('div', {},
      V('div', { class: 'top-row' },
        V('span', { class: 'label' }, label),
        V('input', {
          class: 'readout',
          type: 'number',
          value,
          onChange: e => {
            const v = Math.max(1, +e.target.value || 1);
            onChange(Math.round(v / step) * step);
          },
        }),
      ),
      V('input', {
        class: 'slider',
        type: 'range', min: 0, max: 1000, value: t,
        onInput: e => onChange(tToValue(+e.target.value, min, max, step)),
      }),
    );
  };
}

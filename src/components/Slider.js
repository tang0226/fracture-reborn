import { V, useStyle } from "../lmnt.js";

export function Slider({}) {

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
    return V('div', {},
      V('div', { class: 'top-row' },
        V('span', { class: 'label' }, label),
        V('input', {
          class: 'readout',
          type: 'number',
          value: +value.toFixed(3),
          step,
          onChange: e => {
            const v = +e.target.value;
            if (!isNaN(v)) onChange(Math.max(min, v));
          },
        }),
      ),
      V('input', {
        class: 'slider',
        type: 'range', min, max, step, value,
        onInput: e => onChange(+e.target.value),
      }),
    );
  };
}

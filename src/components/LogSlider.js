import { V, useStyle } from "../lmnt.js";

function valueToT(value, min, max) {
  return Math.max(0, Math.min(1000,
    Math.round(Math.log(value / min) / Math.log(max / min) * 1000)
  ));
}

function tToValue(t, min, max) {
  return min * (max / min) ** (t / 1000);
}

export function LogSlider({ min, max, step = 1 }) {
  const kbT = { t: null }; // persists across renders; tracks keyboard t independently of rounded value

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
      -moz-appearance: textfield;
    }
    & .readout:focus {
      outline: none;
      border-bottom-color: var(--panel-text);
    }
    & .readout::-webkit-inner-spin-button,
    & .readout::-webkit-outer-spin-button {
      -webkit-appearance: none;
    }
    & .slider {
      width: 100%;
      accent-color: var(--panel-text);
      cursor: pointer;
    }
  `);

  return ({ label, value, min, max, onChange }) => {
    const t = valueToT(value, min, max);

    return V('div', {},
      V('div', { class: 'top-row' },
        V('span', { class: 'label' }, label),
        V('input', {
          class: 'readout',
          type: 'number',
          step: 'any',
          value: +value.toFixed(3),
          onChange: e => {
            const v = +e.target.value;
            if (!isNaN(v)) onChange(Math.max(min, v));
          },
          onKeydown: e => {
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
            e.preventDefault();
            const dir = e.key === 'ArrowUp' ? 1 : -1;
            if (kbT.t === null || valueToT(value, min, max) !== Math.round(kbT.t)) {
              kbT.t = valueToT(value, min, max);
            }
            kbT.t = Math.max(0, Math.min(1000, kbT.t + dir * (e.shiftKey ? 50 : 10)));
            onChange(tToValue(kbT.t, min, max));
          },
          onWheel: e => {
            e.preventDefault();
            const dir = e.deltaY < 0 ? 1 : -1;
            if (kbT.t === null || valueToT(value, min, max) !== Math.round(kbT.t)) {
              kbT.t = valueToT(value, min, max);
            }
            kbT.t = Math.max(0, Math.min(1000, kbT.t + dir * 5));
            onChange(tToValue(kbT.t, min, max));
          },
          onBlur: () => { kbT.t = null; },
        }),
      ),
      V('input', {
        class: 'slider',
        type: 'range', min: 0, max: 1000, value: t,
        onInput: e => { kbT.t = null; onChange(tToValue(+e.target.value, min, max)); },
      }),
    );
  };
}

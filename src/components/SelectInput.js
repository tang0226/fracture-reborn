import { V, useStyle } from "../lmnt.js";

export function SelectInput({}) {

  useStyle(`
    & {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }
    & .label {
      color: var(--panel-text-muted);
      font-size: var(--text-base);
      flex-shrink: 0;
    }
    & select {
      flex: 1;
      background: var(--panel-surface);
      border: 1px solid var(--panel-border);
      color: var(--panel-text);
      font-size: var(--text-base);
      padding: 4px 6px;
      border-radius: var(--panel-radius);
      cursor: pointer;
    }
    & select:focus {
      outline: none;
      border-color: var(--panel-text);
    }
  `);

  return ({ label, value, options, onChange }) => {
    return V('div', {},
      label ? V('span', { class: 'label' }, label) : null,
      V('select', {
        onChange: e => onChange(e.target.value),
      },
        ...options.map(opt =>
          V('option', { value: opt.value, selected: opt.value === value }, opt.label)
        ),
      ),
    );
  };
}

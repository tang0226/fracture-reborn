import { V, useStyle } from "../lmnt.js";

export function CheckboxInput({}) {

  useStyle(`
    & {
      width: 100%;
    }
    & .label {
      color: var(--panel-text-muted);
      font-size: var(--text-base);
      margin-right: 3px;
      cursor: pointer;
    }
  `);

  return ({ label, checked, onChange }) => {
    return V('div', {},
      V('div',
        V('span', {
          class: 'label',
          onClick: (e, self) => {
            const checkbox = self.el.nextElementSibling;
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
          },
        }, label),
        V('input', {
          type: 'checkbox',
          checked: checked ? true : undefined,
          onChange: (e, self) => {
            onChange(self.el.checked);
          },
        }),
      ),
    );
  };
}

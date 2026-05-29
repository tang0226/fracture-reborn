import { V, useState, useStyle } from "../lmnt.js";

export function CollapsibleSection({}) {

  const open = useState(true);

  useStyle(`
    & {
      width: 100%;
    }
    & .header {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      padding: 6px 0;
      color: var(--panel-text);
      font-size: var(--text-base);
      font-weight: 600;
      user-select: none;
    }
    & .arrow {
      font-size: 10px;
      color: var(--panel-text-muted);
      display: inline-block;
    }
    & .arrow.open {
      transform: rotate(90deg);
    }
    & .body {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-bottom: 8px;
    }
    & .body.closed {
      display: none;
    }
  `);

  return ({ title, children }) => {
    const isOpen = open.get();
    return V('div', {},
      V('div', {
        class: 'header',
        onClick: () => open.set(!isOpen),
      },
        V('span', { class: isOpen ? 'arrow open' : 'arrow' }, '▶'),
        title,
      ),
      V('div', { class: isOpen ? 'body' : 'body closed' },
        ...(children ?? []),
      ),
    );
  };
}

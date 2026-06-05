// Active keys currently held down. Use for modifier checks in mouse handlers.
export const keys = new Set();

const shortcuts = [];

document.addEventListener('keydown', e => {
  keys.add(e.key);
  for (const { ctrl, shift, alt, key, handler } of shortcuts) {
    if (
      !!ctrl === e.ctrlKey &&
      !!shift === e.shiftKey &&
      !!alt === e.altKey &&
      key === e.key
    ) {
      e.preventDefault();
      handler(e);
    }
  }
});

document.addEventListener('keyup', e => {
  keys.delete(e.key);
});

document.addEventListener('blur', e => {
  keys.clear();
});

// addShortcut({ ctrl, shift, alt, key }, handler)
export function addShortcut(combo, handler) {
  shortcuts.push({ ...combo, handler });
}

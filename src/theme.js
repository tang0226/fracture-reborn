const themes = {
  dark: `
    --panel-bg:            #111c;
    --panel-surface:       #ffffff12;
    --panel-surface-hover: #ffffff22;
    --panel-surface-active:#ffffff32;
    --panel-btn-hover:     #1e1e2a;
    --panel-btn-active:    #28283a;
    --panel-border:        #ffffff22;
    --panel-text:          #ffffff;
    --panel-text-muted:    #aaaaaa;
    --panel-radius:        4px;
  `,
  light: `
    --panel-bg:            #ffffffdd;
    --panel-surface:       #00000010;
    --panel-surface-hover: #00000020;
    --panel-surface-active:#00000035;
    --panel-btn-hover:     #e4e4e8ee;
    --panel-btn-active:    #d0d0d4ee;
    --panel-border:        #00000022;
    --panel-text:          #111111;
    --panel-text-muted:    #555555;
    --panel-radius:        4px;
  `,
};

let styleEl = null;

function inject() {
  if (styleEl) return;
  styleEl = document.createElement('style');
  document.head.appendChild(styleEl);
}

function buildCSS(name) {
  return `
    :root {
      ${themes[name]}
      --text-base: 14px;
    }
    * { box-sizing: border-box; }
    body { margin: 0; overflow: hidden; font-family: system-ui, sans-serif; }
  `;
}

export function setTheme(name = 'dark') {
  inject();
  styleEl.textContent = buildCSS(name);
}

const themes = {
  dark: `
    --panel-bg:            #111c;
    --panel-surface:       #ffffff12;
    --panel-surface-hover: #ffffff22;
    --panel-surface-active:#ffffff32;
    --panel-border:        #ffffff22;
    --panel-text:          #ffffff;
    --panel-text-muted:    #aaaaaa;
    --panel-radius:        4px;
  `,
  light: `
    --panel-bg:            #ffffffdd;
    --panel-surface:       #00000010;
    --panel-surface-hover: #00000018;
    --panel-surface-active:#00000028;
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
    :root { ${themes[name]} }
    * { box-sizing: border-box; }
    body { margin: 0; overflow: hidden; font-family: system-ui, sans-serif; }
  `;
}

export function setTheme(name = 'dark') {
  inject();
  styleEl.textContent = buildCSS(name);
}

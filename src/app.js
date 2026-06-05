import { createStore } from './lmnt.js';
import { V, L, mount } from './lmnt.js';
import { AppRoot } from './components/AppRoot.js';
import { store } from './store.js';
import { render } from './render.js';
import { setTheme } from './theme.js';
import { addShortcut } from './input.js';
import { palettes } from './palettes.js';

setTheme('light');

// Set initial viewport
let state = store.getState();
store.dispatch({
  type: 'viewport/resetZoom',
  payload: {
    formulaKey: state.fractal.formula,
    params: state.fractal.params,
  }
});

mount(L(V(AppRoot)), document.body);

addShortcut({ ctrl: true, key: 'Enter' }, () => render(store.getState()));

render(store.getState());

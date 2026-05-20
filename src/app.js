import { createStore } from './lmnt.js';
import { V, L, mount } from './lmnt.js';
import { AppRoot } from './components/AppRoot.js';
import {
  viewport,
  canvas,
  fractal,
  iteration,
} from './store.js';

const store = createStore({
  viewport,
  canvas,
  fractal,
  iteration,
});

mount(L(V(AppRoot)), document.body);

import { createIterator } from './kernel/iterator.js';

store.dispatch({ type: 'fractal/setIterStyle', payload: 'julia' });
store.dispatch({ type: 'fractal/setParam', payload: { param: 'jRe', value: 0 } });
store.dispatch({ type: 'fractal/setParam', payload: { param: 'jIm', value: 0.5 } });
store.dispatch({ type: 'iteration/addOrbitTrap', payload: { type: 'point', re: 0, im: 0 } });
console.log(createIterator(store.getState()).toString());

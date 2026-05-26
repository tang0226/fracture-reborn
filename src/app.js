import { createStore } from './lmnt.js';
import { V, L, mount } from './lmnt.js';
import { AppRoot } from './components/AppRoot.js';
import { store } from './store.js';
import { render } from './render.js';

mount(L(V(AppRoot)), document.body);

import { createFloat64Iterator } from './kernel/iterator.js';

store.dispatch({ type: 'iteration/addOrbitTrap', payload: { type: 'point', re: 0, im: 0 } });
store.dispatch({ type: 'iteration/setMaxIter', payload: 3000 });
let iterator = createFloat64Iterator(store.getState());

const buffer = new Float64Array(2 * 100);

iterator(0.27, 0, buffer, 0);
console.log(buffer);

console.log(iterator.toString());
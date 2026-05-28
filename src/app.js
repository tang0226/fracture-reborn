import { createStore } from './lmnt.js';
import { V, L, mount } from './lmnt.js';
import { AppRoot } from './components/AppRoot.js';
import { store } from './store.js';
import { render } from './render.js';

mount(L(V(AppRoot)), document.body);

import { createFloat64Iterator } from './kernel/iterator.js';


//store.dispatch({ type: 'fractal/setParam', payload: { param: 'e', value: 3 } })

/*
// mandelbrot
store.dispatch({ type: 'viewport/setViewport', payload: {
  center: { re: 0.2556187316239776, im: -0.0007347967317580581 },
  size: 0.0005064077289310631,
}});*/

const burningShipCentered = {
  center: { re: -0.5, im: -0.5 },
  size: 4.5,
};

const mandelbrotCentered = {
  center: { re: -0.5, im: 0 },
  size: 4,
};

const zeroCentered = {
  center: { re: 0, im: 0 },
  size: 4.5,
};

const bioluminescencePalette = [
  { pos: 0, r: 255, g: 255, b: 255 },
  { pos: 1/2000, r: 100, g: 100, b: 200 },
  { pos: 50/2000, r: 0, g: 0, b: 0 },
  { pos: 100/2000, r: 100, g: 200, b: 225 },
  { pos: 125/2000, r: 0, g: 255, b: 0 },
];

store.dispatch({ type: 'viewport/setViewport', payload: { center: { re: 0.004773316911407619, im: 0.8701807728639999 }, size: 0.004827007393185185 }});

store.dispatch({ type: 'viewport/setFlipYAxis', payload: true });

store.dispatch({ type: 'render/setAntiAliasing', payload: 4 });
store.dispatch({ type: 'render/setProgressive', payload: true });

store.dispatch({ type: 'fractal/setFormula', payload: 'burningShip'});
store.dispatch({ type: 'fractal/setParams', payload: { e: 4 }});
/*
store.dispatch({ type: 'iteration/addOrbitTrap', payload: { type: 'point', re: -1, im: -1 } });
store.dispatch({ type: 'iteration/addOrbitTrap', payload: { type: 'point', re: 1, im: 1 } });
store.dispatch({ type: 'iteration/addOrbitTrap', payload: { type: 'point', re: 0, im: 0 } });*/
store.dispatch({ type: 'iteration/addOrbitTrap', payload: { type: 'point', re: 0, im: 0 } });
//for (let i = 0; i < 100; i++) store.dispatch({ type: 'iteration/addOrbitTrap', payload: { type: 'point', re: Math.random() * 4 - 2, im: Math.random() * 4 - 2 } });

store.dispatch({ type: 'iteration/setMaxIter', payload: 2000 });
store.dispatch({ type: 'iteration/setSmoothing', payload: true });

store.dispatch({ type: 'coloring/setSmoothIter', payload: { logScale: false, period: 2000 } });
//store.dispatch({ type: 'coloring/setSmoothIterStops', payload: bioluminescencePalette });
//store.dispatch({ type: 'coloring/setSmoothIter', payload: { logScale: false, period: 300 } });
store.dispatch({ type: 'coloring/setExteriorMethod', payload: 'orbitTrap' });
store.dispatch({ type: 'coloring/setInteriorMethod', payload: 'orbitTrap' });
store.dispatch({ type: 'coloring/setOrbitTrap', payload: { offset: 0, scale: 0.5, logScale: true } });

/*store.dispatch({ type: 'coloring/setOrbitTrapStops', payload: [
  { pos: 0, r: 0, g: 0, b: 0 },
  { pos: 0.5, r: 255, g: 255, b: 255 },
  { pos: 1, r: 0, g: 0, b: 0 },
] });*/

//store.dispatch({ type: 'render/setWorkerCount', payload: 4 });

console.log(store.getState());
render(store.getState());

import { createStore } from './lmnt.js';
import { V, L, mount } from './lmnt.js';
import { AppRoot } from './components/AppRoot.js';
import { store } from './store.js';
import { render } from './render.js';
import { setTheme } from './theme.js';
import { addShortcut } from './input.js';

setTheme('light');

import { palettes } from './palettes.js';

mount(L(V(AppRoot)), document.body);


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



store.dispatch({ type: 'viewport/setViewport', payload: zeroCentered});

store.dispatch({ type: 'viewport/setFlipYAxis', payload: true });

store.dispatch({ type: 'render/setAntiAliasing', payload: 4 });
store.dispatch({ type: 'render/setProgressive', payload: true });

store.dispatch({ type: 'fractal/setFormula', payload: 'mandelbrot'});
store.dispatch({ type: 'fractal/setIterStyle', payload: 'mandelbrot' });
store.dispatch({ type: 'fractal/setParams', payload: { e: 2 }});
/*
store.dispatch({ type: 'iteration/addOrbitTrap', payload: { type: 'point', re: -1, im: -1 } });
store.dispatch({ type: 'iteration/addOrbitTrap', payload: { type: 'point', re: 1, im: 1 } });
store.dispatch({ type: 'iteration/addOrbitTrap', payload: { type: 'point', re: 0, im: 0 } });*/
store.dispatch({ type: 'iteration/addOrbitTrap', payload: { type: 'point', re: 0, im: 0 } });
//for (let i = 0; i < 100; i++) store.dispatch({ type: 'iteration/addOrbitTrap', payload: { type: 'point', re: Math.random() * 4 - 2, im: Math.random() * 4 - 2 } });
store.dispatch({ type: 'iteration/setMaxIter', payload: 1000 });
store.dispatch({ type: 'iteration/setSmoothing', payload: true });

store.dispatch({ type: 'coloring/setSmoothIter', payload: { logScale: false, period: 200 } });
store.dispatch({ type: 'coloring/setSmoothIterStops', payload: palettes.earthAndSky });
//store.dispatch({ type: 'coloring/setSmoothIter', payload: { logScale: false, period: 300 } });
store.dispatch({ type: 'coloring/setExteriorMethod', payload: 'smoothIter' });
store.dispatch({ type: 'coloring/setInteriorMethod', payload: 'solid' });
store.dispatch({ type: 'coloring/setOrbitTrap', payload: { offset: 0, scale: 0.2, logScale: false } });

store.dispatch({ type: 'coloring/setOrbitTrapStops', payload: palettes.bw });

//store.dispatch({ type: 'render/setWorkerCount', payload: 4 });

console.log(store.getState());


addShortcut({ ctrl: true, key: 'Enter' }, () => render(store.getState()));

render(store.getState());

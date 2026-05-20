import { V, useEffect, useStyle } from '../lmnt.js';

export function RenderCanvas() {

  let ctx;
  useEffect((self) => {
    ctx = self.el.getContext('2d');
  });

  useStyle(`
    & {
      position: absolute;
      left: 0;
      top: 0;
    }
  `);

  return () => {
    return V('canvas', {
      id: 'render-canvas',
      width: window.innerWidth,
      height: window.innerHeight,
    });
  };
}

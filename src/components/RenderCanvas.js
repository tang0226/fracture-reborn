import { V, useEffect, useStyle, bindStore } from '../lmnt.js';
import { store } from '../store.js';
import { colorizeWorker } from '../render.js';

export function RenderCanvas() {

  bindStore(store, { select: s => s.canvas });

  let ctx, offscreen, offCtx;
  useEffect((self) => {
    ctx = self.el.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    offscreen = new OffscreenCanvas(store.getState().render.tileSize, store.getState().render.tileSize);
    offCtx = offscreen.getContext('2d');
  });

  useStyle(`
    & {
      position: absolute;
      left: 0;
      top: 0;
    }
  `);

  colorizeWorker.onmessage = ({ data }) => {
    const { type, payload } = data;
    if (type === 'tileDone') {
      const { buf, tile } = payload;
      const imgData = new ImageData(buf, tile.w, tile.h);
      if (tile.stride === 1) {
        ctx.putImageData(imgData, tile.x, tile.y);
      } else {
        offCtx.putImageData(imgData, 0, 0);
        ctx.drawImage(offscreen, 0, 0, tile.w, tile.h, tile.x * tile.stride, tile.y * tile.stride, tile.w * tile.stride, tile.h * tile.stride);
      }
    } else if (type === 'newTileSize') {
      offscreen = new OffscreenCanvas(payload.tileSize, payload.tileSize);
      offCtx = offscreen.getContext('2d');
    }
  };

  return () => {
    const { width, height } = store.getState().canvas;
    return V('canvas', {
      id: 'render-canvas',
      width,
      height,
    });
  };
}

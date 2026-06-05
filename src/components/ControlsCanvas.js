import { V, useStyle, useEffect, bindStore } from '../lmnt.js';
import { store } from '../store.js';
import { render } from '../render.js';
import { keys } from '../input.js';

export function ControlsCanvas() {
  bindStore(store, { select: s => s.canvas });

  let ctx, width, height;
  useEffect((self) => {
    ctx = self.el.getContext('2d');
    width = self.el.width;
    height = self.el.height;

    ctx.lineWidth = 1;
  });

  let dragStartX = null, dragStartY = null, mouseDown = false;
  const onMouseDown = (e) => {
    dragStartX = e.offsetX;
    dragStartY = e.offsetY;
    mouseDown = true;
  };

  const onMouseUp = (e) => {
    if (mouseDown) {
      let dx = Math.abs(e.offsetX - dragStartX);
      let dy = Math.abs(e.offsetY - dragStartY);
      if (dx && dy) {
        store.dispatch({
          type: 'viewport/zoomFromDrag',
          payload: {
            width, height,
            reCoeff: dragStartX / width - 0.5,
            imCoeff: dragStartY / height - 0.5,
            sizeCoeff: Math.max(
              2 * dx / width,
              2 * dy / height,
            ),
          }
        });
        render(store.getState());
      } else {
        // Ctrl + click to center
        if (keys.has('Control')) {
          store.dispatch({
            type: 'viewport/centerFromClick',
            payload: {
              width, height,
              reCoeff: e.offsetX / width - 0.5,
              imCoeff: e.offsetY / height - 0.5,
            },
          });
          render(store.getState());
        } else if (keys.has('Shift')) {
          // Shift + Click to zoom out
          store.dispatch({
            type: 'viewport/zoomOutFromPointFromClick',
            payload: {
              width, height,
              reCoeff: e.offsetX / width - 0.5,
              imCoeff: e.offsetY / height - 0.5,
            },
          });
          render(store.getState());
        } else {
          // click to zoom
          store.dispatch({
            type: 'viewport/zoomInOnPointFromClick',
            payload: {
              width, height,
              reCoeff: e.offsetX / width - 0.5,
              imCoeff: e.offsetY / height - 0.5,
            },
          });
          render(store.getState());
        }
        
      }
    }
    ctx.clearRect(0, 0, width, height);
    mouseDown = false;
  };

  const onMouseOut = () => {
    dragStartX = null;
    dragStartY = null;
    mouseDown = false;
    ctx.clearRect(0, 0, width, height);
  };

  const onMouseMove = (e) => {
    if (mouseDown) {
      let dx = Math.abs(dragStartX - e.offsetX);
      let dy = Math.abs(dragStartY - e.offsetY);

      let rx = dragStartX - dx,
          ry = dragStartY - dy,
          rw = 2 * dx,
          rh = 2 * dy;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#FFF4';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.fillStyle = '#FFF';
      ctx.strokeRect(dragStartX - 1, dragStartY - 1, 3, 3);
    }
  }

  useStyle(`
    & {
      position: absolute;
      left: 0;
      top: 0;
      z-index: 1;
    }
  `);
  
  return () => {
    const { width: cw, height: ch } = store.getState().canvas;
    width = cw;
    height = ch;
    return V('canvas', {
      id: 'controls-canvas',
      width: cw,
      height: ch,
      onMouseDown,
      onMouseUp,
      onMouseOut,
      onMouseMove,
    });
  }
}
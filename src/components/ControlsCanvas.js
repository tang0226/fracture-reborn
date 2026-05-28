import { V, useStyle, useEffect } from "../lmnt.js";

export function ControlsCanvas() {
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
      let x = e.offsetX;
      let y = e.offsetY;
      if (dragStartX !== x || dragStartY !== y) {
        console.log(`drag ${dragStartX} ${dragStartY} - ${e.offsetX} ${e.offsetY}`)
      } else {
        console.log(`click ${e.offsetX} ${e.offsetY}`);
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
      let x = Math.min(dragStartX, e.offsetX);
      let y = Math.min(dragStartY, e.offsetY);
      let w = Math.abs(dragStartX - e.offsetX);
      let h = Math.abs(dragStartY - e.offsetY);

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#FFF4';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = '#FFF';
      ctx.strokeRect(Math.round(x + w / 2) - 1, Math.round(y + h / 2) - 1, 3, 3);
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
    return V('canvas', {
      id: 'controls-canvas',
      width: window.innerWidth,
      height: window.innerHeight,
      onMouseDown,
      onMouseUp,
      onMouseOut,
      onMouseMove,
    });
  }
}
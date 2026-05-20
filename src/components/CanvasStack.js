import { V } from '../lmnt.js';
import { RenderCanvas } from './RenderCanvas.js';
import { ControlsCanvas } from './ControlsCanvas.js';

export function CanvasStack() {
  return V('div',
    V(RenderCanvas),
    V(ControlsCanvas),
  );
}
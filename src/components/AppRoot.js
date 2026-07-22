import { V } from '../lmnt.js';
import { CanvasStack } from './CanvasStack.js';
import { ControlPanel } from './ControlPanel.js';
import { StatusOverlay } from './StatusOverlay.js';

export function AppRoot() {
  return V('div', {},
    V(CanvasStack),
    V(ControlPanel),
    V(StatusOverlay),
  );
}
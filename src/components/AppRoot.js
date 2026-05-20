import { V } from '../lmnt.js';
import { CanvasStack } from './CanvasStack.js';

export function AppRoot() {
  return V('div', {},
    V(CanvasStack)
  );
}
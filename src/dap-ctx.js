import { DapContext } from './dap/dap-context.js';

// Shared arbitrary-precision context for the main thread.
// Workers create their own instances since they can't share this one.
// ES module live binding: consumers that import dapCtx see the new instance
// immediately after setDapPrecision() reassigns it.
export let dapCtx = new DapContext(32);

export function setDapPrecision(prec) {
  dapCtx = new DapContext(prec);
}

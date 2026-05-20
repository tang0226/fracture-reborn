export function wrapIf(str, condition, front, back, frontElse = '', backElse = '') {
  if (condition) {
    return `${front}${str}${back}`;
  }
  return `${frontElse}${str}${backElse}`;
}
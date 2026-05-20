function shallowArrayEqual(a, b) {
  if (a === b) return true;
  return a.length === b.length && a.every((el, i) => el === b[i]);
}

function shallowObjectEqual(a, b) {
  if (a === b) return true;
  if (typeof obj1 !== 'object' || obj1 === null || 
      typeof obj2 !== 'object' || obj2 === null) {
    return false;
  }
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;

  for (let key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  
  return true;
}

export {
  shallowArrayEqual,
  shallowObjectEqual,
}
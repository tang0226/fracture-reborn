export const LUT_SIZE = 2048;

// Create lut based on stops
function createLUT(stops) {
  const lut = new Uint8ClampedArray(LUT_SIZE * 4);
  let i = 0;
  for (let j = 0; j < LUT_SIZE; j++) {
    const t = j / LUT_SIZE;
    while (i + 1 < stops.length - 1 && t >= stops[i + 1].pos) i++;
    const q = (t - stops[i].pos) / (stops[i + 1].pos - stops[i].pos);
    lut[j * 4]     = stops[i].r + q * (stops[i + 1].r - stops[i].r);
    lut[j * 4 + 1] = stops[i].g + q * (stops[i + 1].g - stops[i].g);
    lut[j * 4 + 2] = stops[i].b + q * (stops[i + 1].b - stops[i].b);
    lut[j * 4 + 3] = 255;
  }
  return lut;
}

function bakeMethodLUT(methodSettings) {
  const { stops, ...rest } = methodSettings;
  return { ...rest, lut: createLUT(stops) };
}

// Converts state to settings by baking palette stops into LUTs
export function buildColoringSettings(coloringState) {
  const { exterior, interior, orbitTrap } = coloringState;

  const extSettings = { ...exterior };
  if (exterior.method === 'smoothIter') {
    extSettings.smoothIter = bakeMethodLUT(exterior.smoothIter);
  }

  return {
    exterior: extSettings,
    interior,
    orbitTrap: bakeMethodLUT(orbitTrap),
  };
}


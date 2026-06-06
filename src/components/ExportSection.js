import { V, useState } from "../lmnt.js";

import { CollapsibleSection } from './CollapsibleSection.js';
import { SelectInput } from './SelectInput.js';

const FORMAT_OPTIONS = [
  { value: 'png',  label: 'PNG'  },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
];

export function ExportSection({}) {
  const format = useState('png');

  return () => {
    const fmt = format.get();
    return V(CollapsibleSection, { title: 'Export' },
      V(SelectInput, {
        label: 'Format',
        value: fmt,
        options: FORMAT_OPTIONS,
        onChange: v => format.set(v),
      }),
      V('button', {
        class: 'standalone-btn',
        onClick: () => {
          const canvas = document.getElementById('render-canvas');
          canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fractal.${fmt}`;
            a.click();
            URL.revokeObjectURL(url);
          }, `image/${fmt}`);
        },
      }, 'Download'),
    );
  };
}

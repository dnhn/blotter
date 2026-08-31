import * as THREE from "three";
import type { Mapping } from "../mapping/mapping";
import { yieldToMain } from "../utils/scheduling";

// One RGBA texel per text: the (x, y, w, h) of its atlas rectangle, with y
// converted to top-origin to match gl_FragCoord-derived lookups.
export function boundsDataForMapping(mapping: Mapping): Float32Array {
  const texts = mapping.texts;
  const data = new Float32Array(texts.length * 4);

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (!text) continue;
    const bounds = mapping.boundsForText(text);
    if (!bounds) continue;

    data[4 * i] = bounds.x;
    data[4 * i + 1] = mapping.height - (bounds.y + bounds.h);
    data[4 * i + 2] = bounds.w;
    data[4 * i + 3] = bounds.h;
  }

  return data;
}

export async function buildBoundsDataTexture(
  mapping: Mapping,
): Promise<THREE.DataTexture> {
  await yieldToMain();

  const data = boundsDataForMapping(mapping);
  const texture = new THREE.DataTexture(
    data,
    mapping.texts.length,
    1,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

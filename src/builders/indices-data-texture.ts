import * as THREE from "three";
import type { Mapping } from "../mapping/mapping";
import { yieldToMain } from "../utils/scheduling";

// Negative correlation between sample accuracy and generation speed; keep
// around 0.5 (legacy guidance).
const SAMPLE_ACCURACY = 0.5;

/**
 * A downsampled map of the atlas where every texel's red channel holds the
 * normalized index of the text covering that position (alpha 1 inside a
 * text's bounds, 0 outside).
 *
 * Rows are written top-down so the texture uploads with flipY = false —
 * CPU row order is the single flip authority (the legacy builder wrote
 * bottom-up and relied on DataTexture flipY, which is unreliable for
 * ArrayBufferView uploads in WebGL2).
 */
export function indicesDataForMapping(
  mapping: Mapping,
  width: number,
  height: number,
  sampleAccuracy: number,
): Float32Array {
  const ratio = mapping.ratio;
  const points = new Float32Array(width * height * 4);
  const indicesOffset = 1 / mapping.texts.length / 2;

  const boundsList = mapping.texts.map((text) => mapping.boundsForText(text));

  for (let i = 1; i < points.length / 4; i++) {
    // 1-based x/y over the sample grid, matching legacy loop arithmetic.
    const y = Math.ceil(i / width);
    const x = i - width * (y - 1);
    let refIndex = 0;
    let alpha = 0;

    for (let k = 0; k < boundsList.length; k++) {
      const bounds = boundsList[k];
      if (!bounds) continue;
      const bW = (bounds.w / ratio) * sampleAccuracy;
      const bH = (bounds.h / ratio) * sampleAccuracy;
      const bX = (bounds.x / ratio) * sampleAccuracy;
      const bY = (bounds.y / ratio) * sampleAccuracy;

      if (y >= bY && y <= bY + bH && x >= bX && x <= bX + bW) {
        refIndex = k / mapping.texts.length + indicesOffset;
        alpha = 1;
        break;
      }
    }

    // Legacy wrote row y at buffer row (y - 1) and uploaded with
    // flipY = true; writing to row (height - y) pre-flips instead.
    const flippedIndex = (height - y) * width + (x - 1);
    points[4 * flippedIndex] = refIndex;
    points[4 * flippedIndex + 1] = 0;
    points[4 * flippedIndex + 2] = 0;
    points[4 * flippedIndex + 3] = alpha;
  }

  return points;
}

export async function buildIndicesDataTexture(
  mapping: Mapping,
): Promise<THREE.DataTexture> {
  await yieldToMain();

  // Floored: fractional sizes made the legacy builder lean on a
  // widthStepModifier fudge and produced invalid texture dimensions.
  const width = Math.floor((mapping.width / mapping.ratio) * SAMPLE_ACCURACY);
  const height = Math.floor((mapping.height / mapping.ratio) * SAMPLE_ACCURACY);
  const data = indicesDataForMapping(mapping, width, height, SAMPLE_ACCURACY);

  const texture = new THREE.DataTexture(
    data,
    width,
    height,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  texture.flipY = false;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

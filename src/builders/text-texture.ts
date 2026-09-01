import * as THREE from 'three';
import type { Mapping } from '../mapping/mapping';

/**
 * Uploads the mapping's rendered (pre-flipped) canvas as a texture.
 * CanvasTexture with flipY = true reproduces the legacy
 * canvas → dataURL → TextureLoader path without the async round-trip.
 */
export async function buildTextTexture(
  mapping: Mapping,
): Promise<THREE.Texture> {
  const texture = new THREE.CanvasTexture(mapping.toCanvas());
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.flipY = true;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

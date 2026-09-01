import * as THREE from 'three';

let renderer: THREE.WebGLRenderer | null = null;

/**
 * The single WebGL context shared by every Blotter instance, created
 * lazily on first use so importing the package stays side-effect-free.
 */
export function sharedRenderer(): THREE.WebGLRenderer {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
    });
  }
  return renderer;
}

export function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl')),
    );
  } catch {
    return false;
  }
}

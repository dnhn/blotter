import * as THREE from "three";
import { Emitter } from "../core/event-emitter";
import { sharedRenderer } from "./webgl";

export type RendererEvents = { render: [] };

/**
 * Owns the requestAnimationFrame loop: renders the atlas quad into a
 * render target through the shared WebGL context, then reads the pixels
 * back into `imageData` for RenderScopes to copy from.
 */
export class Renderer extends Emitter<RendererEvents> {
  imageData?: ImageData;

  private scene = new THREE.Scene();
  private mesh: THREE.Mesh;
  private camera = new THREE.OrthographicCamera(0.5, 0.5, 0.5, 0.5, 0, 100);
  private renderTarget!: THREE.WebGLRenderTarget;
  private imageDataArray!: Uint8Array;
  private _width = 1;
  private _height = 1;
  private animationFrame: number | null = null;

  constructor() {
    super();
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial(), // Stub until a mapping material lands.
    );
    this.scene.add(this.mesh);
    this.setSize(1, 1);
  }

  set material(material: THREE.Material) {
    if (material instanceof THREE.Material) {
      this.mesh.material = material;
    }
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  setSize(width: number, height: number): void {
    this._width = Math.trunc(width) || 1;
    this._height = Math.trunc(height) || 1;

    this.mesh.scale.set(this._width, this._height, 1);

    this.camera.left = this._width / -2;
    this.camera.right = this._width / 2;
    this.camera.top = this._height / 2;
    this.camera.bottom = this._height / -2;
    this.camera.updateProjectionMatrix();

    this.renderTarget?.dispose();
    this.renderTarget = new THREE.WebGLRenderTarget(this._width, this._height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });
    this.renderTarget.texture.generateMipmaps = false;

    // One buffer, two views: Uint8Array for the GL readback and a clamped
    // view aliased into the ImageData that scopes copy from.
    const viewBuffer = new ArrayBuffer(this._width * this._height * 4);
    this.imageDataArray = new Uint8Array(viewBuffer);
    this.imageData = new ImageData(
      new Uint8ClampedArray(viewBuffer),
      this._width,
      this._height,
    );
  }

  start(): void {
    if (this.animationFrame === null) {
      this.loop();
    }
  }

  stop(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  teardown(): void {
    this.stop();
    this.renderTarget.dispose();
  }

  private loop = (): void => {
    const gl = sharedRenderer();

    gl.setRenderTarget(this.renderTarget);
    gl.render(this.scene, this.camera);
    gl.readRenderTargetPixels(
      this.renderTarget,
      0,
      0,
      this._width,
      this._height,
      this.imageDataArray,
    );
    gl.setRenderTarget(null);

    this.emit("render");

    this.animationFrame = requestAnimationFrame(this.loop);
  };
}

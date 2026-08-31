import type { Blotter } from "../blotter";
import { Emitter } from "../core/event-emitter";
import {
  UniformInterface,
  type UniformInterfaceMap,
} from "../core/uniform-interface";
import type { MappingMaterial } from "../mapping/mapping-material";
import type { Text } from "../text";
import {
  createHiDpiCanvas,
  type MousePosition,
  normalizedMousePosition,
  updateCanvasSize,
} from "../utils/canvas";

export type RenderScopeEvents = {
  ready: [];
  update: [];
  render: [frameCount: number];
  "update:uniform": [uniformName: string];
  mousedown: [position: MousePosition];
  mouseup: [position: MousePosition];
  mousemove: [position: MousePosition];
  mouseenter: [position: MousePosition];
  mouseleave: [position: MousePosition];
};

const MOUSE_EVENTS = [
  "mousedown",
  "mouseup",
  "mousemove",
  "mouseenter",
  "mouseleave",
] as const;

interface ScopeBounds {
  w: number;
  h: number;
  x: number;
  y: number;
}

/**
 * Per-text output: a canvas that copies this text's rectangle out of the
 * Blotter atlas each frame, plus per-text uniform overrides.
 */
export class RenderScope extends Emitter<RenderScopeEvents> {
  readonly text: Text;
  readonly domElement: HTMLCanvasElement;
  readonly material: { mainImage: string; uniforms: UniformInterfaceMap };

  playing: boolean;
  timeDelta = 0;
  frameCount = 0;

  /** @internal Assigned by Blotter during rebuilds. */
  mappingMaterial?: MappingMaterial;

  private blotter: Blotter;
  private context: CanvasRenderingContext2D | null;
  private bounds?: ScopeBounds;
  private lastDrawTime?: number;
  private lastUpdated?: number;
  private uniformUnsubscribers: (() => void)[] = [];

  constructor(text: Text, blotter: Blotter) {
    super();
    this.text = text;
    this.blotter = blotter;
    this.mappingMaterial = blotter.mappingMaterial;
    this.playing = blotter.autoplay;

    this.material = {
      mainImage: blotter.material.mainImage,
      uniforms: {},
    };

    this.domElement = createHiDpiCanvas(0, 0, blotter.ratio, {
      className: "b-canvas",
    });
    this.domElement.textContent = text.value;
    this.context = this.domElement.getContext("2d");
  }

  /**
   * @internal Re-derive canvas size, bounds, and uniform interfaces from
   * the current mapping material. Called by Blotter after each rebuild.
   */
  applyMapping(): void {
    const mappingMaterial = this.mappingMaterial;
    if (!mappingMaterial) return;
    const bounds = this.scopeBounds(mappingMaterial);
    if (!bounds) return;

    updateCanvasSize(
      this.domElement,
      bounds.w / this.blotter.ratio,
      bounds.h / this.blotter.ratio,
      this.blotter.ratio,
    );
    this.domElement.textContent = this.text.value;
    this.bounds = bounds;

    const previousUniforms = this.material.uniforms;
    this.material.uniforms = this.buildUniformInterfaces(
      mappingMaterial.uniforms,
    );
    this.material.mainImage = mappingMaterial.mainImage;
    this.transferInterfaceValues(previousUniforms, this.material.uniforms);

    this.emit(this.lastUpdated ? "update" : "ready");
    this.lastUpdated = Date.now();
  }

  play(): void {
    this.playing = true;
  }

  pause(): void {
    this.playing = false;
  }

  /** @internal Copy this text's atlas rectangle into the canvas. */
  render(): void {
    if (!this.bounds || !this.context) return;
    const imageData = this.blotter.imageData;
    if (!imageData) return;

    const now = Date.now();
    this.frameCount += 1;
    this.timeDelta = (now - (this.lastDrawTime || now)) / 1000;
    this.lastDrawTime = now;

    this.context.clearRect(0, 0, this.domElement.width, this.domElement.height);
    // The whole atlas is put at a negative offset so this text's region
    // lands at the canvas origin.
    this.context.putImageData(imageData, this.bounds.x, this.bounds.y);

    this.emit("render", this.frameCount);
  }

  appendTo(element: Element): this {
    element.appendChild(this.domElement);

    for (const eventName of MOUSE_EVENTS) {
      this.domElement.addEventListener(eventName, (event) => {
        this.emit(
          eventName,
          normalizedMousePosition(this.domElement, event as MouseEvent),
        );
      });
    }

    return this;
  }

  private scopeBounds(
    mappingMaterial: MappingMaterial,
  ): ScopeBounds | undefined {
    const bounds = mappingMaterial.boundsForText(this.text);
    if (!bounds) return undefined;
    return {
      w: bounds.w,
      h: bounds.h,
      x: -1 * Math.floor(bounds.x),
      y: -1 * Math.floor(mappingMaterial.height - (bounds.y + bounds.h)),
    };
  }

  private buildUniformInterfaces(
    uniforms: UniformInterfaceMap,
  ): UniformInterfaceMap {
    for (const unsubscribe of this.uniformUnsubscribers) unsubscribe();
    this.uniformUnsubscribers = [];

    const interfaces: UniformInterfaceMap = {};
    for (const [uniformName, source] of Object.entries(uniforms)) {
      const uniformInterface = new UniformInterface(
        source.toDescriptor(),
        "RenderScope",
      );
      this.uniformUnsubscribers.push(
        uniformInterface.on("update", () =>
          this.emit("update:uniform", uniformName),
        ),
      );
      interfaces[uniformName] = uniformInterface;
    }
    return interfaces;
  }

  // Carry user-set per-text values across a rebuild.
  private transferInterfaceValues(
    previous: UniformInterfaceMap,
    next: UniformInterfaceMap,
  ): void {
    for (const [uniformName, oldInterface] of Object.entries(previous)) {
      const newInterface = next[uniformName];
      if (
        newInterface &&
        newInterface.type === oldInterface.type &&
        newInterface.value !== oldInterface.value
      ) {
        newInterface.value = oldInterface.value;
      }
    }
  }
}

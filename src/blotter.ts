import { buildMapping } from "./builders/mapping-builder";
import { buildMappingMaterial } from "./builders/mapping-material-builder";
import { BlotterError, logError } from "./core/errors";
import { Emitter } from "./core/event-emitter";
import type { TextBounds } from "./mapping/mapping";
import type { MappingMaterial } from "./mapping/mapping-material";
import { Material } from "./material";
import { RenderScope } from "./rendering/render-scope";
import { Renderer } from "./rendering/renderer";
import { isWebGLSupported } from "./rendering/webgl";
import { filterTexts, type Text } from "./text";
import { pixelRatio } from "./utils/canvas";

export type BlotterEvents = { ready: []; update: []; render: [] };

export interface BlotterOptions {
  texts?: Text | Text[];
  /** Pixel ratio for all output canvases. Default: the device pixel ratio. */
  ratio?: number;
  /** Build the mapping immediately on construction. Default true. */
  autobuild?: boolean;
  /** Start the render loop automatically. Default true. */
  autostart?: boolean;
  /** New RenderScopes start in the playing state. Default true. */
  autoplay?: boolean;
}

/**
 * Orchestrator: packs all texts into one atlas, renders them through the
 * material's shader in a single draw call, and hands each text its own
 * output canvas via forText().
 */
export class Blotter extends Emitter<BlotterEvents> {
  readonly ratio: number;
  readonly autoplay: boolean;
  /** Resolves after the first successful build. */
  readonly ready: Promise<this>;

  autostart: boolean;
  autobuild: boolean;
  mappingMaterial?: MappingMaterial;

  private _material!: Material;
  private _texts: Text[] = [];
  private scopes: Record<string, RenderScope> = {};
  private renderer = new Renderer();

  private startTime = 0;
  private lastDrawTime = 0;
  private lastUpdated = 0;

  private textUnsubscribers: Record<string, (() => void)[]> = {};
  private materialUnsubscribers: (() => void)[] = [];
  private resolveReady!: (blotter: this) => void;
  private buildPromise: Promise<void> | null = null;
  private buildQueued = false;

  constructor(material: Material, options: BlotterOptions = {}) {
    super();
    if (!isWebGLSupported()) {
      throw new BlotterError(
        "Blotter",
        undefined,
        "device does not support webgl",
      );
    }

    this.ratio = options.ratio ?? pixelRatio();
    this.autobuild = options.autobuild ?? true;
    this.autostart = options.autostart ?? true;
    this.autoplay = options.autoplay ?? true;

    this.ready = new Promise((resolve) => {
      this.resolveReady = resolve;
    });

    this.setMaterial(material);
    this.addTexts(options.texts ?? []);

    this.renderer.on("render", () => this.onRendered());

    if (this.autobuild) {
      this.update().catch((error) => {
        logError("Blotter", "update", String(error));
      });
    }
    if (this.autostart) {
      this.start();
    }
  }

  get material(): Material {
    return this._material;
  }

  set material(material: Material) {
    this.setMaterial(material);
  }

  get texts(): Text[] {
    return this._texts;
  }

  get imageData(): ImageData | undefined {
    return this.renderer.imageData;
  }

  setMaterial(material: Material): void {
    if (!(material instanceof Material)) {
      throw new BlotterError(
        "Blotter",
        "setMaterial",
        "argument must be an instance of Material",
      );
    }

    for (const unsubscribe of this.materialUnsubscribers) unsubscribe();
    this._material = material;
    this.materialUnsubscribers = [
      material.on("update", () => {
        void this.update();
      }),
      material.on("update:uniform", (uniformName) =>
        this.updateUniformValue(uniformName),
      ),
    ];
  }

  addText(text: Text): void {
    this.addTexts(text);
  }

  addTexts(texts: Text | Text[]): void {
    const filtered = filterTexts(texts);
    const newTexts = filtered.filter((text) => !this._texts.includes(text));

    for (const text of newTexts) {
      this._texts.push(text);

      const scope = new RenderScope(text, this);
      this.scopes[text.id] = scope;

      this.textUnsubscribers[text.id] = [
        text.on("update", () => {
          void this.update();
        }),
        scope.on("update:uniform", (uniformName) =>
          this.updateTextUniformValue(text.id, uniformName),
        ),
      ];
    }
  }

  removeText(text: Text): void {
    this.removeTexts(text);
  }

  removeTexts(texts: Text | Text[]): void {
    const filtered = filterTexts(texts);
    const removed = this._texts.filter((text) => filtered.includes(text));

    for (const text of removed) {
      this._texts = this._texts.filter((existing) => existing !== text);
      for (const unsubscribe of this.textUnsubscribers[text.id] ?? []) {
        unsubscribe();
      }
      delete this.textUnsubscribers[text.id];
      delete this.scopes[text.id];
    }
  }

  /**
   * Rebuild the atlas and shader from the current texts and material.
   * Concurrent calls coalesce: one build runs at a time, with at most one
   * trailing rebuild queued. Emits "ready" on the first completion,
   * "update" on later ones.
   */
  update(): Promise<void> {
    if (this.buildPromise) {
      this.buildQueued = true;
      return this.buildPromise;
    }
    this.buildPromise = (async () => {
      try {
        do {
          this.buildQueued = false;
          await this.build();
        } while (this.buildQueued);
      } finally {
        this.buildPromise = null;
      }
    })();
    return this.buildPromise;
  }

  start(): void {
    this.autostart = true;
    this.startTime = Date.now();
    this.renderer.start();
  }

  stop(): void {
    this.autostart = false;
    this.renderer.stop();
  }

  teardown(): void {
    this.renderer.teardown();
    for (const unsubscribe of this.materialUnsubscribers) unsubscribe();
    for (const unsubscribers of Object.values(this.textUnsubscribers)) {
      for (const unsubscribe of unsubscribers) unsubscribe();
    }
    this.textUnsubscribers = {};
    this.removeAllListeners();
  }

  forText(text: Text): RenderScope | undefined {
    const scope = this.scopes[text.id];
    if (!scope) {
      logError("Blotter", "forText", "Text object not found in blotter");
      return undefined;
    }
    return scope;
  }

  boundsForText(text: Text): TextBounds | undefined {
    if (!this.scopes[text.id]) {
      logError("Blotter", "boundsForText", "Text object not found in blotter");
      return undefined;
    }
    return this.mappingMaterial?.boundsForText(text);
  }

  private async build(): Promise<void> {
    const mapping = await buildMapping(this._texts);
    mapping.ratio = this.ratio;

    const mappingMaterial = await buildMappingMaterial(mapping, this._material);
    this.mappingMaterial = mappingMaterial;

    this.renderer.stop();

    for (const scope of Object.values(this.scopes)) {
      scope.mappingMaterial = mappingMaterial;
      scope.applyMapping();
    }

    this.renderer.material = mappingMaterial.shaderMaterial;
    this.renderer.setSize(mapping.width, mapping.height);

    if (this.autostart) {
      this.start();
    }

    if (this.lastUpdated) {
      this.emit("update");
    } else {
      this.emit("ready");
      this.resolveReady(this);
    }
    this.lastUpdated = Date.now();
  }

  private onRendered(): void {
    const now = Date.now();
    const uniforms = this._material.uniforms;
    // Written through the uniform interfaces so the values propagate to the
    // mapping material's data texture like any other uniform update.
    if (uniforms.uTimeDelta) {
      uniforms.uTimeDelta.value = (now - (this.lastDrawTime || now)) / 1000;
    }
    if (uniforms.uGlobalTime) {
      uniforms.uGlobalTime.value = (now - this.startTime) / 1000;
    }
    this.lastDrawTime = now;

    for (const scope of Object.values(this.scopes)) {
      if (scope.playing) {
        scope.render();
      }
    }
    this.emit("render");
  }

  private updateUniformValue(uniformName: string): void {
    const target = this.mappingMaterial?.uniformInterface[uniformName];
    const source = this._material.uniforms[uniformName];
    if (target && source) {
      target.value = source.value;
    }
  }

  private updateTextUniformValue(textId: string, uniformName: string): void {
    const target =
      this.mappingMaterial?.textUniformInterface[textId]?.[uniformName];
    const source = this.scopes[textId]?.material.uniforms[uniformName];
    if (target && source) {
      target.value = source.value;
    }
  }
}

import { Emitter } from './core/event-emitter';
import {
  UniformInterface,
  type UniformInterfaceMap,
} from './core/uniform-interface';
import {
  createDefaultUniforms,
  extractValidUniforms,
  type UniformMap,
} from './core/uniforms';
import { pixelRatio } from './utils/canvas';

export type MaterialEvents = {
  update: [];
  'update:uniform': [uniformName: string];
};

export interface MaterialOptions {
  mainImage?: string;
  uniforms?: UniformMap;
}

const DEFAULT_MAIN_IMAGE = /* glsl */ `
void mainImage( out vec4 mainImage, in vec2 fragCoord ) {
    mainImage = textTexture(fragCoord / uResolution);
}
`;

export class Material extends Emitter<MaterialEvents> {
  private _mainImage!: string;
  private _uniforms!: UniformInterfaceMap;
  private uniformUnsubscribers: (() => void)[] = [];

  constructor(options: MaterialOptions = {}) {
    super();
    this.mainImage = options.mainImage;
    this.uniforms = options.uniforms ?? {};
  }

  get mainImage(): string {
    return this._mainImage;
  }

  // Shadertoy-style fragment body. Falsy restores the default passthrough.
  set mainImage(mainImage: string | undefined) {
    this._mainImage = mainImage || DEFAULT_MAIN_IMAGE;
  }

  get uniforms(): UniformInterfaceMap {
    return this._uniforms;
  }

  // Replaces all uniform interfaces. Required defaults (uResolution etc.)
  // always overwrite same-named user uniforms, matching legacy behavior —
  // their values are driven by the render pipeline.
  set uniforms(uniforms: UniformMap) {
    for (const unsubscribe of this.uniformUnsubscribers) unsubscribe();
    this.uniformUnsubscribers = [];

    const valid = extractValidUniforms({
      ...uniforms,
      ...createDefaultUniforms(pixelRatio()),
    });

    const interfaces: UniformInterfaceMap = {};
    for (const [name, descriptor] of Object.entries(valid)) {
      const uniformInterface = new UniformInterface(descriptor, 'Material');
      this.uniformUnsubscribers.push(
        uniformInterface.on('update', () => this.emit('update:uniform', name)),
      );
      interfaces[name] = uniformInterface;
    }
    this._uniforms = interfaces;
  }

  // Notify observers that the material changed structurally (e.g. after
  // assigning a new mainImage) so they rebuild their shader.
  update(): void {
    this.emit('update');
  }
}

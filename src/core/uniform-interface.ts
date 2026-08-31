import { logError } from "./errors";
import { Emitter } from "./event-emitter";
import {
  isValidUniformValue,
  type UniformDescriptor,
  type UniformType,
  type UniformValueMap,
} from "./uniforms";

/**
 * Live handle for one uniform: validated value writes emit "update" so
 * owners (Material, MappingMaterial, RenderScope) can propagate changes.
 * Consolidates the three duplicated ad-hoc interface objects from the
 * legacy codebase.
 */
export class UniformInterface<
  K extends UniformType = UniformType,
> extends Emitter<{ update: [] }> {
  readonly type: K;
  private _value: UniformValueMap[K];
  private context: string;

  constructor(
    descriptor: { type: K; value: UniformValueMap[K] },
    context = "blotter",
  ) {
    super();
    this.type = descriptor.type;
    this._value = descriptor.value;
    this.context = context;
  }

  get value(): UniformValueMap[K] {
    return this._value;
  }

  set value(value: UniformValueMap[K]) {
    if (!isValidUniformValue(this.type, value)) {
      logError(
        this.context,
        undefined,
        `uniform value not valid for uniform type: ${this.type}`,
      );
      return;
    }
    this._value = value;
    this.emit("update");
  }

  toDescriptor(): UniformDescriptor {
    return { type: this.type, value: this._value } as UniformDescriptor;
  }
}

export type UniformInterfaceMap = Record<string, UniformInterface>;

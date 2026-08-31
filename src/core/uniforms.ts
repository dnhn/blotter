import { BlotterError, logError } from "./errors";

export type UniformType = "1f" | "2f" | "3f" | "4f";

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];

export interface UniformValueMap {
  "1f": number;
  "2f": Vec2;
  "3f": Vec3;
  "4f": Vec4;
}

export type UniformDescriptor = {
  [K in UniformType]: { type: K; value: UniformValueMap[K] };
}[UniformType];

export type UniformMap = Record<string, UniformDescriptor>;

export const UNIFORM_TYPES: readonly UniformType[] = ["1f", "2f", "3f", "4f"];

const COMPONENT_COUNTS: Record<UniformType, number> = {
  "1f": 1,
  "2f": 2,
  "3f": 3,
  "4f": 4,
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isValidUniformValue<K extends UniformType>(
  type: K,
  value: unknown,
): value is UniformValueMap[K] {
  if (type === "1f") return isFiniteNumber(value);
  return (
    Array.isArray(value) &&
    value.length === COMPONENT_COUNTS[type] &&
    value.every(isFiniteNumber)
  );
}

export function glslDataType(
  type: UniformType,
): "float" | "vec2" | "vec3" | "vec4" {
  switch (type) {
    case "1f":
      return "float";
    case "2f":
      return "vec2";
    case "3f":
      return "vec3";
    case "4f":
      return "vec4";
  }
}

export function glslSwizzle(type: UniformType): "x" | "xy" | "xyz" | "xyzw" {
  switch (type) {
    case "1f":
      return "x";
    case "2f":
      return "xy";
    case "3f":
      return "xyz";
    case "4f":
      return "xyzw";
  }
}

// Return only the uniforms whose type and value are valid, logging and
// dropping the rest (matches the old permissive behavior for JS consumers).
export function extractValidUniforms(
  uniforms: UniformMap | undefined,
): UniformMap {
  const result: UniformMap = {};
  for (const [name, descriptor] of Object.entries(uniforms ?? {})) {
    if (!UNIFORM_TYPES.includes(descriptor.type)) {
      logError(
        "blotter",
        "extractValidUniforms",
        `uniforms must be one of type: ${UNIFORM_TYPES.join(", ")}`,
      );
      continue;
    }
    if (!isValidUniformValue(descriptor.type, descriptor.value)) {
      logError(
        "blotter",
        "extractValidUniforms",
        `uniform value for ${name} is incorrect for type: ${descriptor.type}`,
      );
      continue;
    }
    result[name] = {
      type: descriptor.type,
      value: descriptor.value,
    } as UniformDescriptor;
  }
  return result;
}

// Built fresh per call: uPixelRatio depends on the runtime device, and a
// module-level constant would force DOM access at import time.
export function createDefaultUniforms(pixelRatio = 1): UniformMap {
  return {
    uResolution: { type: "2f", value: [0, 0] },
    uGlobalTime: { type: "1f", value: 0 },
    uTimeDelta: { type: "1f", value: 0 },
    uBlendColor: { type: "4f", value: [1, 1, 1, 1] },
    uPixelRatio: { type: "1f", value: pixelRatio },
  };
}

export const DEFAULT_UNIFORM_NAMES = [
  "uResolution",
  "uGlobalTime",
  "uTimeDelta",
  "uBlendColor",
  "uPixelRatio",
] as const;

export function hasRequiredDefaultUniforms(uniforms: UniformMap): boolean {
  return DEFAULT_UNIFORM_NAMES.every((name) => name in uniforms);
}

export function ensureHasRequiredDefaultUniforms(
  uniforms: UniformMap,
  domain: string,
  method: string,
): void {
  if (!hasRequiredDefaultUniforms(uniforms)) {
    throw new BlotterError(
      domain,
      method,
      "uniforms object is missing required default uniforms",
    );
  }
}

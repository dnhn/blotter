import { describe, expect, it, vi } from "vitest";
import { BlotterError } from "../../src/core/errors";
import {
  createDefaultUniforms,
  ensureHasRequiredDefaultUniforms,
  extractValidUniforms,
  glslDataType,
  glslSwizzle,
  hasRequiredDefaultUniforms,
  isValidUniformValue,
  type UniformMap,
} from "../../src/core/uniforms";

describe("isValidUniformValue", () => {
  it.each([
    ["1f", 1.5, true],
    ["1f", 0, true],
    ["1f", Number.NaN, false],
    ["1f", Number.POSITIVE_INFINITY, false],
    ["1f", "1.5", false],
    ["1f", [1.5], false],
    ["2f", [1, 2], true],
    ["2f", [1], false],
    ["2f", [1, 2, 3], false],
    ["2f", [1, Number.NaN], false],
    ["3f", [1, 2, 3], true],
    ["3f", [1, 2], false],
    ["4f", [1, 2, 3, 4], true],
    ["4f", [1, 2, 3, "4"], false],
  ] as const)("type %s with %j is valid: %s", (type, value, expected) => {
    expect(isValidUniformValue(type, value)).toBe(expected);
  });
});

describe("glsl helpers", () => {
  it("maps types to GLSL data types and swizzles", () => {
    expect(glslDataType("1f")).toBe("float");
    expect(glslDataType("4f")).toBe("vec4");
    expect(glslSwizzle("1f")).toBe("x");
    expect(glslSwizzle("3f")).toBe("xyz");
    expect(glslSwizzle("4f")).toBe("xyzw");
  });
});

describe("extractValidUniforms", () => {
  it("keeps valid uniforms and drops invalid ones with a logged error", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const uniforms = {
      good: { type: "1f", value: 0.5 },
      badValue: { type: "2f", value: [1] },
      badType: { type: "t", value: 1 },
    } as unknown as UniformMap;

    const result = extractValidUniforms(uniforms);

    expect(Object.keys(result)).toEqual(["good"]);
    expect(errorSpy).toHaveBeenCalledTimes(2);
    errorSpy.mockRestore();
  });

  it("strips extra keys from descriptors", () => {
    const uniforms = {
      u: { type: "1f", value: 1, extra: "junk" },
    } as unknown as UniformMap;
    expect(extractValidUniforms(uniforms).u).toEqual({ type: "1f", value: 1 });
  });

  it("returns empty object for undefined input", () => {
    expect(extractValidUniforms(undefined)).toEqual({});
  });
});

describe("default uniforms", () => {
  it("createDefaultUniforms carries the given pixel ratio", () => {
    const uniforms = createDefaultUniforms(2);
    expect(uniforms.uPixelRatio).toEqual({ type: "1f", value: 2 });
    expect(uniforms.uResolution).toEqual({ type: "2f", value: [0, 0] });
    expect(hasRequiredDefaultUniforms(uniforms)).toBe(true);
  });

  it("ensureHasRequiredDefaultUniforms throws BlotterError when defaults missing", () => {
    expect(() =>
      ensureHasRequiredDefaultUniforms({}, "Test", "method"),
    ).toThrowError(BlotterError);
    expect(() =>
      ensureHasRequiredDefaultUniforms(
        createDefaultUniforms(),
        "Test",
        "method",
      ),
    ).not.toThrow();
  });
});

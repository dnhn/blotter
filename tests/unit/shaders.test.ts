import { describe, expect, it } from "vitest";
import * as shaders from "../../src/shaders";

const EXPECTED_CONTENT: Record<keyof typeof shaders, string> = {
  blending: "vec4 normalBlend",
  blinnPhongSpecular: "blinnPhongSpecular",
  easing: "float linear",
  gamma: "gamma",
  inf: "bool blotterIsInf",
  lineMath: "slopeForDegrees",
  map: "float map",
  noise: "float noise",
  noise2d: "float snoise",
  noise3d: "float snoise",
  noise4d: "float snoise",
  pi: "#define PI",
  random: "float random",
};

describe("shader assets", () => {
  it.each(Object.entries(EXPECTED_CONTENT))(
    "%s is a non-empty string containing %j",
    (name, needle) => {
      // biome-ignore lint/performance/noDynamicNamespaceImportAccess: test iterates all exports
      const source = shaders[name as keyof typeof shaders];
      expect(source).toBeTypeOf("string");
      expect(source.length).toBeGreaterThan(50);
      expect(source).toContain(needle);
    },
  );

  it("lineMath embeds the inf helper (legacy eval-time dependency)", () => {
    expect(shaders.lineMath).toContain("bool blotterIsInf");
  });

  it("no shader redeclares a GLSL ES 3.00 built-in (isinf broke on WebGL2)", () => {
    for (const [name, source] of Object.entries(shaders)) {
      expect(source, name).not.toMatch(/\bbool\s+isinf\s*\(/);
    }
  });
});

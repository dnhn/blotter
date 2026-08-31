import { describe, expect, it } from "vitest";
import {
  buildFragmentSource,
  buildVertexSource,
  type FragmentUniformEntry,
} from "../../src/builders/fragment-source";

const FIXTURE_UNIFORMS: Record<string, FragmentUniformEntry> = {
  uOffset: { descriptor: { type: "1f", value: 0.5 }, position: 0 },
  uPoint: { descriptor: { type: "2f", value: [1, 2] }, position: 2 },
};

function buildFixture(): string {
  return buildFragmentSource({
    userUniforms: FIXTURE_UNIFORMS,
    textsLength: 2,
    textureWidth: 4,
    mainImage:
      "void mainImage( out vec4 mainImage, in vec2 fragCoord ) { mainImage = vec4(1.0); }",
  });
}

describe("buildVertexSource", () => {
  it("passes uv through and applies MVP", () => {
    const source = buildVertexSource();
    expect(source).toContain("_vTexCoord = uv;");
    expect(source).toContain("projectionMatrix * modelViewMatrix");
  });
});

describe("buildFragmentSource", () => {
  it("matches the snapshot for a fixed fixture", () => {
    expect(buildFixture()).toMatchSnapshot();
  });

  it("contains no undefined content (legacy phantom TextTexture regression)", () => {
    expect(buildFixture()).not.toContain("undefined");
  });

  it("declares each user uniform with its GLSL type and swizzled definition", () => {
    const source = buildFixture();
    expect(source).toContain("float uOffset;");
    expect(source).toContain("vec2 uPoint;");
    expect(source).toMatch(
      /uOffset = texture2D\(_userUniformsTexture,.*\)\.x;/,
    );
    expect(source).toMatch(
      /uPoint = texture2D\(_userUniformsTexture,.*\)\.xy;/,
    );
  });

  it("includes pipeline plumbing, user mainImage, and alpha masking", () => {
    const source = buildFixture();
    for (const needle of [
      "uniform sampler2D _uSampler;",
      "uniform vec2 _uCanvasResolution;",
      "uniform sampler2D _uTextIndicesTexture;",
      "uniform sampler2D _uTextBoundsTexture;",
      "uniform sampler2D _userUniformsTexture;",
      "vec4 textTexture(vec2 coord)",
      "void mainImage(out vec4 mainImage, in vec2 fragCoord);",
      "mainImage = vec4(1.0);",
      "outColor.a = outColor.a * textAlpha;",
      "uResolution = _textBounds.zw;",
    ]) {
      expect(source, needle).toContain(needle);
    }
  });

  it("handles zero texture width without emitting Infinity", () => {
    const source = buildFragmentSource({
      userUniforms: {},
      textsLength: 0,
      textureWidth: 0,
      mainImage: "void mainImage( out vec4 mainImage, in vec2 fragCoord ) {}",
    });
    expect(source).not.toContain("Infinity");
    expect(source).not.toContain("NaN");
  });
});

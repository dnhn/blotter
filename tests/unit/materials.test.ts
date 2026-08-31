import { describe, expect, it } from "vitest";
import {
  ChannelSplitMaterial,
  FliesMaterial,
  LiquidDistortMaterial,
  RollingDistortMaterial,
  SlidingDoorMaterial,
} from "../../src/materials";

const CASES = [
  {
    Ctor: ChannelSplitMaterial,
    uniforms: ["uOffset", "uRotation", "uApplyBlur", "uAnimateNoise"],
    spot: { name: "uOffset", value: 0.05 },
  },
  {
    Ctor: FliesMaterial,
    uniforms: [
      "uPointCellWidth",
      "uPointRadius",
      "uDodge",
      "uDodgePosition",
      "uDodgeSpread",
      "uSpeed",
    ],
    spot: { name: "uPointCellWidth", value: 0.04 },
  },
  {
    Ctor: LiquidDistortMaterial,
    uniforms: ["uSpeed", "uVolatility", "uSeed"],
    spot: { name: "uVolatility", value: 0.15 },
  },
  {
    Ctor: RollingDistortMaterial,
    uniforms: [
      "uSineDistortSpread",
      "uSineDistortCycleCount",
      "uSineDistortAmplitude",
      "uNoiseDistortVolatility",
      "uNoiseDistortAmplitude",
      "uDistortPosition",
      "uRotation",
      "uSpeed",
    ],
    spot: { name: "uRotation", value: 170 },
  },
  {
    Ctor: SlidingDoorMaterial,
    uniforms: [
      "uDivisions",
      "uDivisionWidth",
      "uAnimateHorizontal",
      "uFlipAnimationDirection",
      "uSpeed",
    ],
    spot: { name: "uDivisions", value: 5 },
  },
] as const;

describe("effect materials", () => {
  it.each(CASES.map((c) => [c.Ctor.name, c] as const))(
    "%s exposes its uniforms with legacy defaults",
    (_name, { Ctor, uniforms, spot }) => {
      const material = new Ctor();
      for (const uniformName of uniforms) {
        expect(material.uniforms[uniformName], uniformName).toBeDefined();
      }
      expect(material.uniforms[spot.name]?.value).toEqual(spot.value);
      expect(material.mainImage).toContain("void mainImage(");
      expect(material.mainImage).not.toContain("undefined");
    },
  );

  it("FliesMaterial keeps vec2 uniform shape", () => {
    const material = new FliesMaterial();
    expect(material.uniforms.uDodgePosition?.type).toBe("2f");
    expect(material.uniforms.uDodgePosition?.value).toEqual([0.5, 0.5]);
  });
});

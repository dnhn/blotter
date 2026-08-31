import { describe, expect, it } from "vitest";
import { Blotter, type Material, Text } from "../../src/index";
import {
  ChannelSplitMaterial,
  FliesMaterial,
  LiquidDistortMaterial,
  RollingDistortMaterial,
  SlidingDoorMaterial,
} from "../../src/materials";

// One frame per material through the real WebGL pipeline: a GLSL compile
// error in a ported shader surfaces here as a blank canvas.
const CASES: [string, () => Material][] = [
  ["ChannelSplitMaterial", () => new ChannelSplitMaterial()],
  ["FliesMaterial", () => new FliesMaterial()],
  ["LiquidDistortMaterial", () => new LiquidDistortMaterial()],
  ["RollingDistortMaterial", () => new RollingDistortMaterial()],
  [
    "SlidingDoorMaterial",
    () => {
      const material = new SlidingDoorMaterial();
      // At t~0 the door animation legitimately shifts the text out of
      // bounds; uSpeed 0 takes the passthrough branch (the full shader
      // still compiles) so the frame is verifiable.
      const uSpeed = material.uniforms.uSpeed;
      if (uSpeed) uSpeed.value = 0;
      return material;
    },
  ],
];

describe("effect materials render", () => {
  it.each(CASES)(
    "%s renders non-transparent pixels",
    async (_name, createMaterial) => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      try {
        const text = new Text("Hello", {
          family: "monospace",
          size: 48,
          fill: "#ff0000",
        });
        const blotter = new Blotter(createMaterial(), { texts: text });
        await blotter.ready;

        const scope = blotter.forText(text);
        if (!scope) throw new Error("scope missing");
        scope.appendTo(container);

        await new Promise<void>((resolve) => {
          const unsubscribe = scope.on("render", (frameCount) => {
            if (frameCount >= 2) {
              unsubscribe();
              resolve();
            }
          });
        });

        const ctx = scope.domElement.getContext("2d");
        if (!ctx) throw new Error("no 2d context");
        const image = ctx.getImageData(
          0,
          0,
          scope.domElement.width,
          scope.domElement.height,
        );
        let visible = 0;
        for (let i = 3; i < image.data.length; i += 4) {
          if ((image.data[i] ?? 0) > 25) visible++;
        }
        expect(visible).toBeGreaterThan(20);

        blotter.teardown();
      } finally {
        container.remove();
      }
    },
    20_000,
  );
});

import { describe, expect, it } from "vitest";
import { buildMapping } from "../../src/builders/mapping-builder";
import { Text } from "../../src/text";

describe("buildMapping", () => {
  it("packs two texts into non-overlapping bounds", async () => {
    const a = new Text("Hello", { family: "monospace", size: 30 });
    const b = new Text("World!", { family: "monospace", size: 20 });
    const mapping = await buildMapping([a, b]);

    expect(mapping.width).toBeGreaterThan(0);
    expect(mapping.height).toBeGreaterThan(0);

    const boundsA = mapping.boundsForText(a);
    const boundsB = mapping.boundsForText(b);
    expect(boundsA).toBeTruthy();
    expect(boundsB).toBeTruthy();
    if (!boundsA || !boundsB) return;

    const overlaps =
      boundsA.x < boundsB.x + boundsB.w &&
      boundsB.x < boundsA.x + boundsA.w &&
      boundsA.y < boundsB.y + boundsB.h &&
      boundsB.y < boundsA.y + boundsA.h;
    expect(overlaps).toBe(false);
  });

  it("toCanvas renders non-blank pixels where text was drawn", async () => {
    const text = new Text("Hello", {
      family: "monospace",
      size: 40,
      fill: "#ff0000",
    });
    const mapping = await buildMapping(text);
    const canvas = mapping.toCanvas();

    const ctx = canvas.getContext("2d");
    expect(ctx).toBeTruthy();
    if (!ctx) return;

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let redPixels = 0;
    for (let i = 0; i < image.data.length; i += 4) {
      const r = image.data[i] ?? 0;
      const g = image.data[i + 1] ?? 0;
      const b = image.data[i + 2] ?? 0;
      if (r > 100 && r > g * 2 && r > b * 2) redPixels++;
    }
    expect(redPixels).toBeGreaterThan(20);
  });
});

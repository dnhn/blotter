import { describe, expect, it } from "vitest";
import { boundsDataForMapping } from "../../src/builders/bounds-data-texture";
import { indicesDataForMapping } from "../../src/builders/indices-data-texture";
import { Mapping } from "../../src/mapping/mapping";
import { Text } from "../../src/text";

function makeMapping(): { mapping: Mapping; a: Text; b: Text } {
  const a = new Text("A");
  const b = new Text("B");
  // 100x100 atlas: a occupies the top strip (bottom-origin y 60..100),
  // b the bottom-left block (y 0..60, x 0..80).
  const mapping = new Mapping(
    [a, b],
    {
      [a.id]: { x: 0, y: 60, w: 100, h: 40 },
      [b.id]: { x: 0, y: 0, w: 80, h: 60 },
    },
    100,
    100,
  );
  return { mapping, a, b };
}

describe("boundsDataForMapping", () => {
  it("packs one top-origin RGBA rect per text", () => {
    const { mapping } = makeMapping();
    const data = boundsDataForMapping(mapping);

    expect(data.length).toBe(8);
    // a: y flipped to top-origin: 100 - (60 + 40) = 0.
    expect([...data.slice(0, 4)]).toEqual([0, 0, 100, 40]);
    // b: 100 - (0 + 60) = 40.
    expect([...data.slice(4, 8)]).toEqual([0, 40, 80, 60]);
  });

  it("scales with mapping ratio", () => {
    const { mapping } = makeMapping();
    mapping.ratio = 2;
    const data = boundsDataForMapping(mapping);
    expect([...data.slice(0, 4)]).toEqual([0, 0, 200, 80]);
  });
});

describe("indicesDataForMapping", () => {
  it("writes rows top-down with normalized text indices", () => {
    const { mapping } = makeMapping();
    const width = 50;
    const height = 50;
    const data = indicesDataForMapping(mapping, width, height, 0.5);

    expect(data.length).toBe(width * height * 4);

    const texel = (bufferX: number, bufferY: number) => {
      const idx = (bufferY * width + bufferX) * 4;
      return { r: data[idx], a: data[idx + 3] };
    };

    // indicesOffset = (1/2)/2 = 0.25; text 0 (a) => 0.25, text 1 (b) => 0.75.
    // Grid y=50 (atlas top) is text a; with top-down rows it must land in
    // buffer row 0.
    expect(texel(10, 0)).toEqual({ r: 0.25, a: 1 });
    // Grid y=1 (atlas bottom) inside b's block (x <= 40) => last buffer row.
    expect(texel(10, height - 1)).toEqual({ r: 0.75, a: 1 });
    // Bottom row outside b's width (x > 40) => empty.
    expect(texel(45, height - 1)).toEqual({ r: 0, a: 0 });
  });
});

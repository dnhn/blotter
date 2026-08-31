import { describe, expect, it } from "vitest";
import {
  GrowingPacker,
  type PackerBlock,
} from "../../src/utils/growing-packer";

describe("GrowingPacker", () => {
  it("packs a single block at origin", () => {
    const packer = new GrowingPacker();
    const blocks: PackerBlock[] = [{ w: 100, h: 50 }];
    packer.fit(blocks);
    expect(blocks[0]?.fit).toMatchObject({ x: 0, y: 0 });
    expect(packer.root).toMatchObject({ w: 100, h: 50 });
  });

  it("packs equal squares deterministically without overlap", () => {
    const packer = new GrowingPacker();
    const blocks: PackerBlock[] = [
      { w: 100, h: 100 },
      { w: 100, h: 100 },
      { w: 100, h: 100 },
      { w: 100, h: 100 },
    ];
    packer.fit(blocks);

    const rects = blocks.map((b) => {
      expect(b.fit).toBeTruthy();
      return { x: b.fit?.x ?? 0, y: b.fit?.y ?? 0, w: b.w, h: b.h };
    });
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        if (!a || !b) continue;
        const overlaps =
          a.x < b.x + b.w &&
          b.x < a.x + a.w &&
          a.y < b.y + b.h &&
          b.y < a.y + a.h;
        expect(overlaps).toBe(false);
      }
    }
    // 4 equal squares grow into a 2x2 arrangement.
    expect(packer.root.w).toBe(200);
    expect(packer.root.h).toBe(200);
  });

  it("grows to fit sorted mixed sizes, all blocks placed", () => {
    const packer = new GrowingPacker();
    const blocks: PackerBlock[] = [
      { w: 120, h: 80 },
      { w: 100, h: 60 },
      { w: 80, h: 40 },
      { w: 40, h: 40 },
    ];
    packer.fit(blocks);
    for (const block of blocks) {
      expect(block.fit).toBeTruthy();
    }
  });

  it("cannot place a block wider and taller than the root", () => {
    const packer = new GrowingPacker();
    const blocks: PackerBlock[] = [
      { w: 50, h: 50 },
      { w: 200, h: 200 },
    ];
    packer.fit(blocks);
    expect(blocks[0]?.fit).toBeTruthy();
    expect(blocks[1]?.fit).toBeNull();
  });

  it("handles empty input", () => {
    const packer = new GrowingPacker();
    packer.fit([]);
    expect(packer.root).toMatchObject({ w: 0, h: 0 });
  });
});

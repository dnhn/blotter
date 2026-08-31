import { Mapping, type TextBoundsMap } from "../mapping/mapping";
import { filterTexts, type Text } from "../text";
import { GrowingPacker, type PackerBlock } from "../utils/growing-packer";
import { yieldToMain } from "../utils/scheduling";
import { sizeForText } from "../utils/text-measurement";

interface SizedBlock extends PackerBlock {
  text: Text;
}

/**
 * Measures every text and bin-packs them into a single atlas. Bounds are
 * stored bottom-origin (y flipped from the packer's top-origin output).
 * The returned Mapping has ratio 1; the caller applies its own ratio.
 */
export async function buildMapping(
  texts: Text | Text[] | undefined,
): Promise<Mapping> {
  await yieldToMain();

  const filtered = filterTexts(texts);
  const blocks: SizedBlock[] = filtered.map((text) => {
    const size = sizeForText(text.value, text.properties);
    return { text, w: size.w, h: size.h };
  });

  // Pack larger texts first for tighter atlases.
  blocks.sort((a, b) => b.w * b.h - a.w * a.h);
  const packer = new GrowingPacker();
  packer.fit(blocks);

  const textBounds: TextBoundsMap = {};
  for (const block of blocks) {
    if (!block.fit) continue;
    textBounds[block.text.id] = {
      w: block.w,
      h: block.h,
      x: block.fit.x,
      y: packer.root.h - (block.fit.y + block.h),
    };
  }

  return new Mapping(filtered, textBounds, packer.root.w, packer.root.h);
}

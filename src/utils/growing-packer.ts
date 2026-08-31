// Growing binary-tree bin packer, ported from Jake Gordon's bin-packing
// (https://github.com/jakesgordon/bin-packing, MIT). Starts at the size of
// the first block and grows right or down, preferring whichever keeps the
// root roughly square. Sort blocks by max(w, h) descending for best results;
// a block both wider and taller than the current root cannot be placed.

export interface PackerNode {
  x: number;
  y: number;
  w: number;
  h: number;
  used?: boolean;
  down?: PackerNode;
  right?: PackerNode;
}

export interface PackerBlock {
  w: number;
  h: number;
  fit?: PackerNode | null;
}

export class GrowingPacker {
  root: PackerNode = { x: 0, y: 0, w: 0, h: 0 };

  fit(blocks: PackerBlock[]): void {
    const first = blocks[0];
    this.root = { x: 0, y: 0, w: first?.w ?? 0, h: first?.h ?? 0 };
    for (const block of blocks) {
      const node = this.findNode(this.root, block.w, block.h);
      block.fit = node
        ? this.splitNode(node, block.w, block.h)
        : this.growNode(block.w, block.h);
    }
  }

  private findNode(root: PackerNode, w: number, h: number): PackerNode | null {
    if (root.used) {
      return (
        (root.right && this.findNode(root.right, w, h)) ||
        (root.down && this.findNode(root.down, w, h)) ||
        null
      );
    }
    if (w <= root.w && h <= root.h) return root;
    return null;
  }

  private splitNode(node: PackerNode, w: number, h: number): PackerNode {
    node.used = true;
    node.down = { x: node.x, y: node.y + h, w: node.w, h: node.h - h };
    node.right = { x: node.x + w, y: node.y, w: node.w - w, h };
    return node;
  }

  private growNode(w: number, h: number): PackerNode | null {
    const canGrowDown = w <= this.root.w;
    const canGrowRight = h <= this.root.h;

    const shouldGrowRight = canGrowRight && this.root.h >= this.root.w + w;
    const shouldGrowDown = canGrowDown && this.root.w >= this.root.h + h;

    if (shouldGrowRight) return this.growRight(w, h);
    if (shouldGrowDown) return this.growDown(w, h);
    if (canGrowRight) return this.growRight(w, h);
    if (canGrowDown) return this.growDown(w, h);
    return null;
  }

  private growRight(w: number, h: number): PackerNode | null {
    this.root = {
      used: true,
      x: 0,
      y: 0,
      w: this.root.w + w,
      h: this.root.h,
      down: this.root,
      right: { x: this.root.w, y: 0, w, h: this.root.h },
    };
    const node = this.findNode(this.root, w, h);
    return node ? this.splitNode(node, w, h) : null;
  }

  private growDown(w: number, h: number): PackerNode | null {
    this.root = {
      used: true,
      x: 0,
      y: 0,
      w: this.root.w,
      h: this.root.h + h,
      down: { x: 0, y: this.root.h, w: this.root.w, h },
      right: this.root,
    };
    const node = this.findNode(this.root, w, h);
    return node ? this.splitNode(node, w, h) : null;
  }
}

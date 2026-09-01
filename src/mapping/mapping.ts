import { BlotterError } from '../core/errors';
import type { Text } from '../text';
import { createHiDpiCanvas } from '../utils/canvas';
import { lineHeightPixels } from '../utils/text-measurement';

export interface TextBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type TextBoundsMap = Record<string, TextBounds>;

/**
 * The packed atlas layout: which rectangle of the shared texture each text
 * occupies. Bounds are stored bottom-origin (WebGL convention) at ratio 1;
 * public accessors scale by the current ratio.
 */
export class Mapping {
  readonly texts: Text[];
  private textBounds: TextBoundsMap;
  private _width: number;
  private _height: number;
  private _ratio = 1;

  constructor(
    texts: Text[],
    textBounds: TextBoundsMap,
    width: number,
    height: number,
  ) {
    this.texts = texts;
    this.textBounds = textBounds;
    this._width = width;
    this._height = height;
  }

  get ratio(): number {
    return this._ratio;
  }

  set ratio(ratio: number) {
    this._ratio = ratio || 1;
  }

  get width(): number {
    return this._width * this._ratio;
  }

  get height(): number {
    return this._height * this._ratio;
  }

  boundsForText(text: Text): TextBounds | undefined {
    const bounds = this.textBounds[text.id];
    if (!bounds) return undefined;
    return {
      w: bounds.w * this._ratio,
      h: bounds.h * this._ratio,
      x: bounds.x * this._ratio,
      y: bounds.y * this._ratio,
    };
  }

  /**
   * Draws all texts into a canvas, Y-flipped for WebGL upload (same output
   * as the legacy dataURL round-trip, but synchronous via a second canvas).
   */
  toCanvas(): HTMLCanvasElement {
    const canvas = createHiDpiCanvas(this._width, this._height, this._ratio);
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new BlotterError('Mapping', 'toCanvas', '2d context unavailable');
    }

    ctx.textBaseline = 'middle';

    for (const text of this.texts) {
      const bounds = this.textBounds[text.id];
      if (!bounds) continue;
      const properties = text.properties;
      const halfLineHeight =
        lineHeightPixels(properties.size, properties.leading) / 2;

      ctx.font = `${properties.style} ${properties.weight} ${properties.size}px ${properties.family}`;
      ctx.save();
      ctx.translate(
        bounds.x + properties.paddingLeft,
        this._height - (bounds.y + bounds.h) + properties.paddingTop,
      );
      ctx.fillStyle = properties.fill;
      ctx.fillText(text.value, 0, Math.round(halfLineHeight));
      ctx.restore();
    }

    const flipped = createHiDpiCanvas(this._width, this._height, this._ratio);
    const flippedCtx = flipped.getContext('2d', { alpha: false });
    if (!flippedCtx) {
      throw new BlotterError('Mapping', 'toCanvas', '2d context unavailable');
    }
    flippedCtx.save();
    flippedCtx.scale(1, -1);
    flippedCtx.drawImage(
      canvas,
      0,
      this._height * -1,
      this._width,
      this._height,
    );
    flippedCtx.restore();

    return flipped;
  }
}

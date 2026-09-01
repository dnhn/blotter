import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TEXT_PROPERTIES,
  ensurePropertyValues,
  lineHeightPixels,
  stringifiedPadding,
} from '../../src/utils/text-measurement';

describe('ensurePropertyValues', () => {
  it('fills missing values with defaults', () => {
    const p = ensurePropertyValues({ size: 40 });
    expect(p.size).toBe(40);
    expect(p.family).toBe(DEFAULT_TEXT_PROPERTIES.family);
    expect(p.leading).toBe(1.5);
  });

  it('returns full defaults for no input', () => {
    expect(ensurePropertyValues()).toEqual(DEFAULT_TEXT_PROPERTIES);
  });
});

describe('stringifiedPadding', () => {
  it('uses per-side values when set', () => {
    expect(
      stringifiedPadding({
        paddingTop: 1,
        paddingRight: 2,
        paddingBottom: 3,
        paddingLeft: 4,
      }),
    ).toBe('1px 2px 3px 4px');
  });

  it('falls back to blanket padding per side (fixes legacy paddingTop bug)', () => {
    expect(stringifiedPadding({ padding: 10, paddingLeft: 4 })).toBe(
      '10px 10px 10px 4px',
    );
  });

  it('defaults to zero padding', () => {
    expect(stringifiedPadding()).toBe('0px 0px 0px 0px');
  });
});

describe('lineHeightPixels', () => {
  it('multiplies numeric leading by size', () => {
    expect(lineHeightPixels(20, 1.5)).toBe(30);
  });

  it('uses px leading directly', () => {
    expect(lineHeightPixels(20, '36px')).toBe(36);
  });

  it('treats % leading as a fraction of size', () => {
    expect(lineHeightPixels(20, '150%')).toBe(30);
  });

  it('parses bare numeric strings as multipliers', () => {
    expect(lineHeightPixels(20, '2')).toBe(40);
  });

  it('defaults to the default leading', () => {
    expect(lineHeightPixels(20)).toBe(30);
  });
});

import { describe, expect, it } from 'vitest';
import { Mapping } from '../../src/mapping/mapping';
import { Text } from '../../src/text';

function makeMapping(): { mapping: Mapping; a: Text; b: Text } {
  const a = new Text('A');
  const b = new Text('B');
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

describe('Mapping', () => {
  it('scales width/height/bounds by ratio', () => {
    const { mapping, a } = makeMapping();
    expect(mapping.width).toBe(100);
    expect(mapping.height).toBe(100);

    mapping.ratio = 2;
    expect(mapping.width).toBe(200);
    expect(mapping.height).toBe(200);
    expect(mapping.boundsForText(a)).toEqual({ x: 0, y: 120, w: 200, h: 80 });
  });

  it('falsy ratio resets to 1', () => {
    const { mapping } = makeMapping();
    mapping.ratio = 0;
    expect(mapping.ratio).toBe(1);
  });

  it('returns undefined bounds for unknown text', () => {
    const { mapping } = makeMapping();
    expect(mapping.boundsForText(new Text('other'))).toBeUndefined();
  });
});

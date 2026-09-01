import { describe, expect, it } from 'vitest';
import { BlotterError } from '../../src/core/errors';

describe('BlotterError', () => {
  it('is a real Error with formatted message and fields', () => {
    const error = new BlotterError(
      'Blotter',
      'setMaterial',
      'argument must be a Material',
    );
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('BlotterError');
    expect(error.message).toBe(
      'Blotter#setMaterial: argument must be a Material',
    );
    expect(error.domain).toBe('Blotter');
    expect(error.method).toBe('setMaterial');
  });

  it('formats without a method', () => {
    const error = new BlotterError(
      'Blotter',
      undefined,
      'device does not support webgl',
    );
    expect(error.message).toBe('Blotter: device does not support webgl');
  });
});

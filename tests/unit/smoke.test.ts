import { expect, it } from 'vitest';

it('package entry imports in node without DOM or WebGL side effects', async () => {
  // No jsdom here: any import-time document/window/WebGL access throws.
  const module = await import('../../src/index');
  expect(module.Blotter).toBeTypeOf('function');
  expect(module.Text).toBeTypeOf('function');
  expect(module.Material).toBeTypeOf('function');
  expect(module.ShaderMaterial).toBeTypeOf('function');
  expect(module.shaders.pi).toContain('PI');
});

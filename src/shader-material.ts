import { Material, type MaterialOptions } from './material';

// Convenience Material for a one-off fragment shader without subclassing.
export class ShaderMaterial extends Material {
  constructor(
    mainImage: string,
    options: Omit<MaterialOptions, 'mainImage'> = {},
  ) {
    super({ ...options, mainImage });
  }
}

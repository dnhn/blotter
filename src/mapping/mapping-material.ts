import type * as THREE from 'three';
import {
  UniformInterface,
  type UniformInterfaceMap,
} from '../core/uniform-interface';
import type { UniformDescriptor } from '../core/uniforms';
import type { Material } from '../material';
import type { Text } from '../text';
import type { Mapping, TextBounds } from './mapping';

export interface UserUniformEntry {
  descriptor: UniformDescriptor;
  position: number;
}

export interface UserUniformDataTextureObjects {
  data: Float32Array;
  texture: THREE.DataTexture;
  userUniforms: Record<string, UserUniformEntry>;
}

// Write one uniform value into its RGBA slot of the data texture buffer.
function setValueAtIndex(
  data: Float32Array,
  i: number,
  descriptor: UniformDescriptor,
): void {
  const base = 4 * i;
  const value =
    descriptor.type === '1f' ? [descriptor.value] : descriptor.value;
  data[base] = value[0] ?? 0;
  data[base + 1] = value[1] ?? 0;
  data[base + 2] = value[2] ?? 0;
  data[base + 3] = value[3] ?? 0;
}

/**
 * The built, renderable form of a Material for one Mapping: the composed
 * THREE.ShaderMaterial plus live uniform interfaces. `uniformInterface`
 * fans a value out to every text; `textUniformInterface[textId]` writes a
 * single text's slot in the user uniforms data texture.
 */
export class MappingMaterial {
  readonly mapping: Mapping;
  readonly material: Material;
  readonly shaderMaterial: THREE.ShaderMaterial;
  readonly textUniformInterface: Record<string, UniformInterfaceMap>;
  readonly uniformInterface: UniformInterfaceMap;

  constructor(
    mapping: Mapping,
    material: Material,
    shaderMaterial: THREE.ShaderMaterial,
    userUniformDataTextureObjects: UserUniformDataTextureObjects,
  ) {
    this.mapping = mapping;
    this.material = material;
    this.shaderMaterial = shaderMaterial;

    const { data, texture, userUniforms } = userUniformDataTextureObjects;

    this.textUniformInterface = {};
    mapping.texts.forEach((text, textIndex) => {
      const interfaces: UniformInterfaceMap = {};
      for (const [uniformName, entry] of Object.entries(userUniforms)) {
        const uniformIndex = entry.position + textIndex;
        const uniformInterface = new UniformInterface(
          entry.descriptor,
          'MappingMaterial',
        );
        uniformInterface.on('update', () => {
          setValueAtIndex(data, uniformIndex, uniformInterface.toDescriptor());
          texture.needsUpdate = true;
        });
        // Initial write populates this text's slot in the data texture.
        uniformInterface.value = entry.descriptor.value;
        interfaces[uniformName] = uniformInterface;
      }
      this.textUniformInterface[text.id] = interfaces;
    });

    this.uniformInterface = {};
    for (const [uniformName, entry] of Object.entries(userUniforms)) {
      const uniformInterface = new UniformInterface(
        entry.descriptor,
        'MappingMaterial',
      );
      uniformInterface.on('update', () => {
        for (const text of mapping.texts) {
          const textInterface =
            this.textUniformInterface[text.id]?.[uniformName];
          if (textInterface) textInterface.value = uniformInterface.value;
        }
        texture.needsUpdate = true;
      });
      this.uniformInterface[uniformName] = uniformInterface;
    }
  }

  get uniforms(): UniformInterfaceMap {
    return this.material.uniforms;
  }

  get mainImage(): string {
    return this.material.mainImage;
  }

  get width(): number {
    return this.mapping.width;
  }

  get height(): number {
    return this.mapping.height;
  }

  get ratio(): number {
    return this.mapping.ratio;
  }

  boundsForText(text: Text): TextBounds | undefined {
    return this.mapping.boundsForText(text);
  }
}

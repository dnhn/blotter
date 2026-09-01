import * as THREE from 'three';
import {
  ensureHasRequiredDefaultUniforms,
  extractValidUniforms,
  type UniformMap,
} from '../core/uniforms';
import type { Mapping } from '../mapping/mapping';
import {
  MappingMaterial,
  type UserUniformDataTextureObjects,
  type UserUniformEntry,
} from '../mapping/mapping-material';
import type { Material } from '../material';
import { buildBoundsDataTexture } from './bounds-data-texture';
import {
  buildFragmentSource,
  buildVertexSource,
  type FragmentUniformEntry,
} from './fragment-source';
import { buildIndicesDataTexture } from './indices-data-texture';
import { buildTextTexture } from './text-texture';

// One RGBA texel per text per uniform, all in a single 1-row float texture.
// Starts zeroed; MappingMaterial's uniform interfaces write the initial
// values during construction.
function buildUserUniformDataTextureObjects(
  validUniforms: UniformMap,
  textsLength: number,
): UserUniformDataTextureObjects {
  const names = Object.keys(validUniforms);
  const dataLength = names.length * textsLength;
  const data = new Float32Array(dataLength * 4);

  const texture = new THREE.DataTexture(
    data,
    dataLength,
    1,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;

  const userUniforms: Record<string, UserUniformEntry> = {};
  names.forEach((name, index) => {
    const descriptor = validUniforms[name];
    if (!descriptor) return;
    userUniforms[name] = { descriptor, position: index * textsLength };
  });

  return { data, texture, userUniforms };
}

export async function buildMappingMaterial(
  mapping: Mapping,
  material: Material,
): Promise<MappingMaterial> {
  const descriptors: UniformMap = {};
  for (const [name, uniformInterface] of Object.entries(material.uniforms)) {
    descriptors[name] = uniformInterface.toDescriptor();
  }
  ensureHasRequiredDefaultUniforms(
    descriptors,
    'blotter',
    'buildMappingMaterial',
  );
  const validUniforms = extractValidUniforms(descriptors);

  const [textTexture, indicesTexture, boundsTexture] = await Promise.all([
    buildTextTexture(mapping),
    buildIndicesDataTexture(mapping),
    buildBoundsDataTexture(mapping),
  ]);
  const userUniformDataTextureObjects = buildUserUniformDataTextureObjects(
    validUniforms,
    mapping.texts.length,
  );

  const fragmentUniforms: Record<string, FragmentUniformEntry> = {};
  for (const [name, entry] of Object.entries(
    userUniformDataTextureObjects.userUniforms,
  )) {
    fragmentUniforms[name] = entry;
  }

  const threeMaterial = new THREE.ShaderMaterial({
    vertexShader: buildVertexSource(),
    fragmentShader: buildFragmentSource({
      userUniforms: fragmentUniforms,
      textsLength: mapping.texts.length,
      textureWidth: userUniformDataTextureObjects.texture.image.width,
      mainImage: material.mainImage,
    }),
    uniforms: {
      _uSampler: { value: textTexture },
      _uCanvasResolution: { value: [mapping.width, mapping.height] },
      _uTextIndicesTexture: { value: indicesTexture },
      _uTextBoundsTexture: { value: boundsTexture },
      _userUniformsTexture: { value: userUniformDataTextureObjects.texture },
    },
  });
  threeMaterial.depthTest = false;
  threeMaterial.depthWrite = false;
  threeMaterial.premultipliedAlpha = false;

  return new MappingMaterial(
    mapping,
    material,
    threeMaterial,
    userUniformDataTextureObjects,
  );
}

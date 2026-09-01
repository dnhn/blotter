import { Material } from '../material';
import { noise3d } from '../shaders';

const mainImage = /* glsl */ `
${noise3d}
void mainImage( out vec4 mainImage, in vec2 fragCoord )
{
    // Setup ========================================================================
    vec2 uv = fragCoord.xy / uResolution.xy;
    float z = uSeed + uGlobalTime * uSpeed;
    uv += snoise(vec3(uv, z)) * uVolatility;
    mainImage = textTexture(uv);
}
`;

export class LiquidDistortMaterial extends Material {
  constructor() {
    super({
      mainImage,
      uniforms: {
        uSpeed: { type: '1f', value: 1 },
        uVolatility: { type: '1f', value: 0.15 },
        uSeed: { type: '1f', value: 0.1 },
      },
    });
  }
}

import {
  glslDataType,
  glslSwizzle,
  type UniformDescriptor,
} from '../core/uniforms';
import { blending } from '../shaders';

export interface FragmentUniformEntry {
  descriptor: UniformDescriptor;
  // Texel offset of this uniform's per-text value block within the user
  // uniforms data texture (uniformIndex * textsLength).
  position: number;
}

export function buildVertexSource(): string {
  return /* glsl */ `
varying vec2 _vTexCoord;

void main() {
  _vTexCoord = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
}

/**
 * Assembles the full fragment shader: blending helpers, private pipeline
 * uniforms, public per-text uniform plumbing (sampled out of the user
 * uniforms data texture), the textTexture() helper, and the user's
 * Shadertoy-style mainImage.
 *
 * Pure string assembly — unit-testable without three or a DOM.
 */
export function buildFragmentSource(args: {
  userUniforms: Record<string, FragmentUniformEntry>;
  textsLength: number;
  // Width in texels of the user uniforms data texture
  // (uniformCount * textsLength).
  textureWidth: number;
  mainImage: string;
}): string {
  const { userUniforms, textsLength, textureWidth, mainImage } = args;

  // Legacy formula: half of one float within the RGBA data array
  // (data.length = textureWidth * 4), not half a texel.
  const halfPixel =
    textureWidth > 0 ? (1 / (textureWidth * 4) / 2).toFixed(20) : '0.0';
  const textureWidthStr = textureWidth.toFixed(1);
  const textsLengthStr = textsLength.toFixed(1);

  let publicUniformDeclarations = '';
  let publicUniformDefinitions = '';

  for (const [uniformName, entry] of Object.entries(userUniforms)) {
    const swizzle = glslSwizzle(entry.descriptor.type);
    const dataType = glslDataType(entry.descriptor.type);

    // All user uniforms live in a single 1-row texture holding one RGBA
    // value per text per uniform. textIndex (sampled from the indices
    // texture) locates this text's value within the uniform's block.
    const samplePosition = `((${entry.position.toFixed(1)} + ((textIndex - ((1.0 / ${textsLengthStr}) / 2.0)) * ${textsLengthStr})) / ${textureWidthStr}) + ${halfPixel}`;

    publicUniformDeclarations += `${dataType} ${uniformName};\n`;
    publicUniformDefinitions += `   ${uniformName} = texture2D(_userUniformsTexture, vec2(${samplePosition}, 0.5)).${swizzle};\n`;
  }

  return [
    blending,

    // Private blotter defined uniforms.
    'uniform sampler2D _uSampler;',
    'uniform vec2 _uCanvasResolution;',
    'uniform sampler2D _uTextIndicesTexture;',
    'uniform sampler2D _uTextBoundsTexture;',

    // Private texCoord and bounds information.
    'varying vec2 _vTexCoord;',
    'vec4 _textBounds;',

    // Private storage for user defined and default uniform values.
    'uniform sampler2D _userUniformsTexture;',

    // Public versions of user defined and default uniform declarations.
    publicUniformDeclarations,

    /* glsl */ `
// Helper used by user programs to retrieve texel color information within
// the bounds of any given text. Use instead of texture2D in mainImage.
vec4 textTexture(vec2 coord) {
   vec2 adjustedFragCoord = _textBounds.xy + vec2((_textBounds.z * coord.x), (_textBounds.w * coord.y));
   vec2 uv = adjustedFragCoord.xy / _uCanvasResolution;

   //  If adjustedFragCoord falls outside the bounds of the current texel's text, return vec4(0.0).
   if (adjustedFragCoord.x < _textBounds.x ||
       adjustedFragCoord.x > _textBounds.x + _textBounds.z ||
       adjustedFragCoord.y < _textBounds.y ||
       adjustedFragCoord.y > _textBounds.y + _textBounds.w) {
     return vec4(0.0);
   }

   return texture2D(_uSampler, uv);
}

void mainImage(out vec4 mainImage, in vec2 fragCoord);
`,

    mainImage,

    'void main(void) {',

    //  Retrieve text index and text alpha for the bounds containing this texel.
    '   vec4 textIndexData = texture2D(_uTextIndicesTexture, _vTexCoord);',
    '   float textIndex = textIndexData.r;',
    '   float textAlpha = textIndexData.a;',

    //  Make bounds for the current text globally visible.
    '   _textBounds = texture2D(_uTextBoundsTexture, vec2(textIndex, 0.5));',

    //  Set "uniform" values visible to user.
    publicUniformDefinitions,
    '   uResolution = _textBounds.zw;',

    //  Set fragment coordinate in respect to position within text bounds.
    '   vec2 fragCoord = gl_FragCoord.xy - _textBounds.xy;',
    '   vec4 outColor;',
    '   mainImage(outColor, fragCoord);',

    //  Zero alpha for texels outside every text area.
    '   outColor.a = outColor.a * textAlpha;',
    '   gl_FragColor = outColor;',
    '}',
  ].join('\n');
}

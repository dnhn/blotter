export const blinnPhongSpecular = /* glsl */ `
//
// Author : Reza Ali
// License : Distributed under the MIT License.
//

float blinnPhongSpecular( vec3 lightDirection, vec3 viewDirection, vec3 surfaceNormal, float shininess ) {

  //Calculate Blinn-Phong power
  vec3 H = normalize(viewDirection + lightDirection);
  return pow(max(0.0, dot(surfaceNormal, H)), shininess);
}
`;

export const inf = /* glsl */ `
//
// Author : Bradley Griffith
// License : Distributed under the MIT License.
//
bool blotterIsInf(float val) {
    return (val != 0.0 && val * 2.0 == val) ? true : false;
}
`;

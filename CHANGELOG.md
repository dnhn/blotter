# blotter.ts

## 1.0.1

### Patch Changes

- Add `@types/node` as a devDependency so `pnpm typecheck` passes against `vite.config.ts`. No runtime or API change.

## 1.0.0

### Major Changes

- e922b9e: Complete TypeScript rewrite. Named ESM exports replace the `window.Blotter` global namespace; `three` becomes a peer dependency; the five classic effect materials ship as the `blotter.ts/materials` subpath. `needsUpdate = true` setters are replaced by `blotter.update()` / `blotter.ready` and automatic rebuilds on text changes. Fixes the legacy implicit-global bug in the mapping material builder, the `isinf` GLSL ES 3.00 built-in collision on WebGL2, and the latent `UniformUtils.logError` TypeError.

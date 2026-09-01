# blotter.ts

A JavaScript API for drawing unconventional text effects on the web — GLSL-backed, batched into a single WebGL draw call, output to plain per-text canvases.

This is a modern TypeScript rewrite of [bradley/Blotter](https://github.com/bradley/Blotter): ESM-first, typed, tree-shakeable, with `three` as a peer dependency. The rendering architecture is unchanged; the API is new (see [Migrating](#migrating-from-blotter-01)).

## How it works

- Texts sharing a material are measured, bin-packed into a single texture atlas, and rendered together in one WebGL draw call through your material's fragment shader.
- Each text gets its own output `<canvas>` (via `blotter.forText(text)`), which copies its region out of the shared back buffer every frame.
- The render loop uses `requestAnimationFrame` and a single shared WebGL context regardless of how many Blotter instances exist.
- Rendered text is canvas output: not selectable, best for titles, headings, and graphic text — not body copy.

## Install

```sh
npm install blotter.ts three
```

`three >= 0.152` is a peer dependency.

## Usage

```ts
import { Blotter, Text } from "blotter.ts";
import { ChannelSplitMaterial } from "blotter.ts/materials";

const text = new Text("Hello", {
  family: "serif",
  size: 120,
  fill: "#171717",
});

const material = new ChannelSplitMaterial();
const blotter = new Blotter(material, { texts: text });

blotter.forText(text)?.appendTo(document.body);
await blotter.ready;
```

### Uniforms

Material uniforms are live — writing a value updates the running shader:

```ts
material.uniforms.uOffset.value = 0.1;
```

Per-text overrides go through the text's render scope:

```ts
const scope = blotter.forText(text);
scope.material.uniforms.uOffset.value = 0.2; // this text only
```

### Updating texts

```ts
text.value = "Goodbye";        // triggers a rebuild automatically
text.properties = { size: 90 }; // ditto
await blotter.update();         // explicit rebuild; resolves when settled
```

### Custom materials

A material is a Shadertoy-style `mainImage` fragment function. Use `textTexture(uv)` instead of `texture2D` to sample the text:

```ts
import { Material, shaders } from "blotter.ts";

const wobble = new Material({
  mainImage: /* glsl */ `
    ${shaders.noise3d}

    void mainImage( out vec4 mainImage, in vec2 fragCoord ) {
      vec2 uv = fragCoord / uResolution;
      uv.y += snoise(vec3(uv * 4.0, uGlobalTime)) * uAmount;
      mainImage = textTexture(uv);
    }
  `,
  uniforms: {
    uAmount: { type: "1f", value: 0.05 },
  },
});
```

Uniform types are `"1f" | "2f" | "3f" | "4f"` (float/vec2/vec3/vec4). Every material also receives `uResolution`, `uGlobalTime`, `uTimeDelta`, `uBlendColor`, and `uPixelRatio`. GLSL helper snippets (noise, easing, line math, …) are exported as strings from the `shaders` namespace.

Or subclass:

```ts
import { Material } from "blotter.ts";

export class WobbleMaterial extends Material {
  constructor() {
    super({ mainImage, uniforms: { uAmount: { type: "1f", value: 0.05 } } });
  }
}
```

### Bundled materials

`blotter.ts/materials` ships the classic Blotter effects: `ChannelSplitMaterial`, `FliesMaterial`, `LiquidDistortMaterial`, `RollingDistortMaterial`, `SlidingDoorMaterial`.

## Migrating from Blotter 0.1

| Legacy | Now |
| --- | --- |
| `<script>` + `window.Blotter.*` globals | Named ESM imports from `blotter.ts` |
| Separate material `<script>` downloads | `import { ChannelSplitMaterial } from "blotter.ts/materials"` |
| `new Blotter.Text(...)`, `new Blotter.Material()` | `new Text(...)`, `new Material()` |
| `thing.needsUpdate = true` | `blotter.update()` / `material.update()` / automatic on `text.value =` |
| `blotter.on("ready", ...)` | `await blotter.ready` (the event still fires) |
| `Blotter.Assets.Shaders.PI` | `import { shaders } from "blotter.ts"` → `shaders.pi` |
| `Blotter._extendWithGettersSetters` subclass protocol | `class MyMaterial extends Material` |
| Bundled underscore/EventEmitter/Three custom build | Gone; `three` is a peer dependency |

## Development

```sh
pnpm install
pnpm dev           # demo page (vite)
pnpm test          # unit + browser (WebGL) tests
pnpm typecheck
pnpm lint
pnpm build         # tsup → dist/
```

Browser tests run in headless Chromium via Playwright (`pnpm exec playwright install chromium` once).

## Credits

Blotter was created by [Bradley Griffith](http://bradley.computer). Shader helpers adapted from [Reza Ali's Fragment](http://www.syedrezaali.com/), atlas packing from [Jake Gordon's bin-packing](https://github.com/jakesgordon/bin-packing). See the upstream project for the full original credits.

## License

MIT

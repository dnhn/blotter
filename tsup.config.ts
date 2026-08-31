import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    materials: "src/materials/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2020",
  external: ["three"],
  treeshake: true,
});

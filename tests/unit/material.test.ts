import { describe, expect, it, vi } from "vitest";
import type { Vec2 } from "../../src/core/uniforms";
import { Material } from "../../src/material";
import { ShaderMaterial } from "../../src/shader-material";

describe("Material", () => {
  it("defaults mainImage to the textTexture passthrough", () => {
    const material = new Material();
    expect(material.mainImage).toContain("void mainImage(");
    expect(material.mainImage).toContain(
      "textTexture(fragCoord / uResolution)",
    );
  });

  it("falsy mainImage assignment restores the default", () => {
    const material = new Material({ mainImage: "void mainImage(){}" });
    expect(material.mainImage).toBe("void mainImage(){}");
    material.mainImage = undefined;
    expect(material.mainImage).toContain("textTexture");
  });

  it("always carries the required default uniforms", () => {
    const material = new Material();
    for (const name of [
      "uResolution",
      "uGlobalTime",
      "uTimeDelta",
      "uBlendColor",
      "uPixelRatio",
    ]) {
      expect(material.uniforms[name], name).toBeDefined();
    }
  });

  it("merges user uniforms with defaults; defaults win on name collisions", () => {
    const material = new Material({
      uniforms: {
        uOffset: { type: "1f", value: 0.5 },
        uGlobalTime: { type: "1f", value: 999 },
      },
    });
    expect(material.uniforms.uOffset?.value).toBe(0.5);
    expect(material.uniforms.uGlobalTime?.value).toBe(0);
  });

  it("emits update:uniform with the uniform name on value writes", () => {
    const material = new Material({
      uniforms: { uOffset: { type: "1f", value: 0.5 } },
    });
    const listener = vi.fn();
    material.on("update:uniform", listener);

    const uOffset = material.uniforms.uOffset;
    if (!uOffset) throw new Error("uOffset missing");
    uOffset.value = 0.75;

    expect(listener).toHaveBeenCalledExactlyOnceWith("uOffset");
    expect(uOffset.value).toBe(0.75);
  });

  it("rejects invalid uniform values: logs, keeps old value, no emit", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const material = new Material({
      uniforms: { uPoint: { type: "2f", value: [1, 2] } },
    });
    const listener = vi.fn();
    material.on("update:uniform", listener);

    const uPoint = material.uniforms.uPoint;
    if (!uPoint) throw new Error("uPoint missing");
    uPoint.value = [1] as unknown as Vec2;

    expect(uPoint.value).toEqual([1, 2]);
    expect(listener).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("replacing uniforms unwires old interfaces", () => {
    const material = new Material({
      uniforms: { uOffset: { type: "1f", value: 0.5 } },
    });
    const oldInterface = material.uniforms.uOffset;
    const listener = vi.fn();
    material.on("update:uniform", listener);

    material.uniforms = { uOther: { type: "1f", value: 1 } };
    if (!oldInterface) throw new Error("uOffset missing");
    oldInterface.value = 0.9;

    expect(listener).not.toHaveBeenCalled();
  });

  it("update() emits update", () => {
    const material = new Material();
    const listener = vi.fn();
    material.on("update", listener);
    material.update();
    expect(listener).toHaveBeenCalledOnce();
  });
});

describe("ShaderMaterial", () => {
  it("takes mainImage as first argument", () => {
    const material = new ShaderMaterial("void mainImage(){}", {
      uniforms: { uSpeed: { type: "1f", value: 2 } },
    });
    expect(material.mainImage).toBe("void mainImage(){}");
    expect(material.uniforms.uSpeed?.value).toBe(2);
  });
});

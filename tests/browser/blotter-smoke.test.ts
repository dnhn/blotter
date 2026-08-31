import { describe, expect, it } from "vitest";
import { Blotter, Material, Text } from "../../src/index";

function countOpaquePixels(canvas: HTMLCanvasElement): {
  opaque: number;
  redDominant: number;
} {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let opaque = 0;
  let redDominant = 0;
  for (let i = 0; i < image.data.length; i += 4) {
    const r = image.data[i] ?? 0;
    const g = image.data[i + 1] ?? 0;
    const b = image.data[i + 2] ?? 0;
    const a = image.data[i + 3] ?? 0;
    if (a > 0) opaque++;
    if (a > 128 && r > 100 && r > g * 2 && r > b * 2) redDominant++;
  }
  return { opaque, redDominant };
}

function nextRender(scope: {
  on: (event: "render", listener: (frameCount: number) => void) => () => void;
}): Promise<number> {
  return new Promise((resolve) => {
    const unsubscribe = scope.on("render", (frameCount) => {
      unsubscribe();
      resolve(frameCount);
    });
  });
}

describe("Blotter end-to-end", () => {
  it("renders red text pixels through the full WebGL pipeline", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    try {
      const text = new Text("Hi", {
        family: "monospace",
        size: 40,
        fill: "#ff0000",
      });
      const blotter = new Blotter(new Material(), { texts: text });
      await blotter.ready;

      const scope = blotter.forText(text);
      expect(scope).toBeTruthy();
      if (!scope) return;
      scope.appendTo(container);

      await nextRender(scope);
      await nextRender(scope);

      const { opaque, redDominant } = countOpaquePixels(scope.domElement);
      expect(opaque).toBeGreaterThan(50);
      expect(redDominant).toBeGreaterThan(20);

      blotter.teardown();
    } finally {
      container.remove();
    }
  });

  it("two texts each render their own color region", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    try {
      const red = new Text("AAA", {
        family: "monospace",
        size: 30,
        fill: "#ff0000",
      });
      const green = new Text("BBBBBB", {
        family: "monospace",
        size: 22,
        fill: "#00ff00",
      });
      const blotter = new Blotter(new Material(), { texts: [red, green] });
      await blotter.ready;

      const redScope = blotter.forText(red);
      const greenScope = blotter.forText(green);
      if (!redScope || !greenScope) throw new Error("scopes missing");
      redScope.appendTo(container);
      greenScope.appendTo(container);

      await nextRender(redScope);
      await nextRender(greenScope);
      await nextRender(redScope);

      const readChannels = (canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no 2d context");
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let r = 0;
        let g = 0;
        for (let i = 0; i < image.data.length; i += 4) {
          if ((image.data[i + 3] ?? 0) > 128) {
            r += image.data[i] ?? 0;
            g += image.data[i + 1] ?? 0;
          }
        }
        return { r, g };
      };

      const redChannels = readChannels(redScope.domElement);
      const greenChannels = readChannels(greenScope.domElement);
      // Each scope must show its own text, not its neighbor's (catches
      // Y-flip / bounds regressions invisible to unit tests).
      expect(redChannels.r).toBeGreaterThan(greenChannels.r);
      expect(redChannels.r).toBeGreaterThan(redChannels.g * 2);
      expect(greenChannels.g).toBeGreaterThan(greenChannels.r * 2);

      blotter.teardown();
    } finally {
      container.remove();
    }
  });

  it("update() after a text change emits update, not ready", async () => {
    const text = new Text("Hi", { family: "monospace", size: 20 });
    const blotter = new Blotter(new Material(), { texts: text });
    await blotter.ready;

    const events: string[] = [];
    blotter.on("ready", () => events.push("ready"));
    blotter.on("update", () => events.push("update"));

    text.value = "Bye"; // auto-triggers a rebuild
    await blotter.update();

    expect(events).toContain("update");
    expect(events).not.toContain("ready");
    blotter.teardown();
  });

  it("rapid update() calls coalesce and settle", async () => {
    const text = new Text("Hi", { family: "monospace", size: 20 });
    const blotter = new Blotter(new Material(), { texts: text });
    await blotter.ready;

    await Promise.all([
      blotter.update(),
      blotter.update(),
      blotter.update(),
      blotter.update(),
    ]);

    expect(blotter.mappingMaterial).toBeTruthy();
    expect(blotter.boundsForText(text)).toBeTruthy();
    blotter.teardown();
  });

  it("emits mouse events with normalized positions", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    try {
      const text = new Text("Hi", { family: "monospace", size: 30 });
      const blotter = new Blotter(new Material(), { texts: text });
      await blotter.ready;

      const scope = blotter.forText(text);
      if (!scope) throw new Error("scope missing");
      scope.appendTo(container);

      const position = await new Promise<{ x: number; y: number }>(
        (resolve) => {
          scope.on("mousemove", resolve);
          const rect = scope.domElement.getBoundingClientRect();
          scope.domElement.dispatchEvent(
            new MouseEvent("mousemove", {
              clientX: rect.left + rect.width / 2,
              clientY: rect.top + rect.height / 2,
            }),
          );
        },
      );

      expect(position.x).toBeCloseTo(0.5, 1);
      expect(position.y).toBeCloseTo(0.5, 1);
      blotter.teardown();
    } finally {
      container.remove();
    }
  });
});

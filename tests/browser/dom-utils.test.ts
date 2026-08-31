import { describe, expect, it } from "vitest";
import {
  createHiDpiCanvas,
  normalizedMousePosition,
  pixelRatio,
  updateCanvasSize,
} from "../../src/utils/canvas";
import { sizeForText } from "../../src/utils/text-measurement";

describe("canvas utils", () => {
  it("pixelRatio returns a positive number", () => {
    expect(pixelRatio()).toBeGreaterThan(0);
  });

  it("createHiDpiCanvas scales backing store by ratio and keeps CSS size", () => {
    const canvas = createHiDpiCanvas(100, 50, 2, { className: "b-canvas" });
    expect(canvas.width).toBe(200);
    expect(canvas.height).toBe(100);
    expect(canvas.style.width).toBe("100px");
    expect(canvas.style.height).toBe("50px");
    expect(canvas.className).toBe("b-canvas");

    const transform = canvas.getContext("2d")?.getTransform();
    expect(transform?.a).toBe(2);
    expect(transform?.d).toBe(2);
  });

  it("updateCanvasSize resets the transform for the new ratio", () => {
    const canvas = createHiDpiCanvas(10, 10, 1);
    updateCanvasSize(canvas, 30, 20, 3);
    expect(canvas.width).toBe(90);
    expect(canvas.height).toBe(60);
    expect(canvas.getContext("2d")?.getTransform().a).toBe(3);
  });

  it("normalizedMousePosition maps client coords into 0..1", () => {
    const canvas = createHiDpiCanvas(100, 100, 1);
    document.body.appendChild(canvas);
    try {
      const rect = canvas.getBoundingClientRect();
      const event = new MouseEvent("mousemove", {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      });
      const position = normalizedMousePosition(canvas, event);
      expect(position.x).toBeCloseTo(0.5, 1);
      expect(position.y).toBeCloseTo(0.5, 1);
    } finally {
      canvas.remove();
    }
  });
});

describe("sizeForText", () => {
  it("returns positive dimensions", () => {
    const size = sizeForText("Hi", { family: "monospace", size: 20 });
    expect(size.w).toBeGreaterThan(0);
    expect(size.h).toBeGreaterThan(0);
  });

  it("grows with content and font size", () => {
    const base = sizeForText("Hi", { family: "monospace", size: 20 });
    const longer = sizeForText("Hiiii", { family: "monospace", size: 20 });
    const bigger = sizeForText("Hi", { family: "monospace", size: 40 });
    expect(longer.w).toBeGreaterThan(base.w);
    expect(bigger.w).toBeGreaterThan(base.w);
    expect(bigger.h).toBeGreaterThan(base.h);
  });

  it("accounts for padding", () => {
    const base = sizeForText("Hi", { family: "monospace", size: 20 });
    const padded = sizeForText("Hi", {
      family: "monospace",
      size: 20,
      padding: 10,
    });
    expect(padded.w).toBe(base.w + 20);
    expect(padded.h).toBe(base.h + 20);
  });

  it("does not leave measurement nodes in the document", () => {
    const before = document.body.childElementCount;
    sizeForText("Hi");
    expect(document.body.childElementCount).toBe(before);
  });
});

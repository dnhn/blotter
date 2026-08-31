import { describe, expect, it, vi } from "vitest";
import { filterTexts, Text } from "../../src/text";

describe("Text", () => {
  it("assigns a unique id and default properties", () => {
    const a = new Text("Hello");
    const b = new Text("Hello");
    expect(a.id).not.toBe(b.id);
    expect(a.properties.family).toBe("sans-serif");
    expect(a.properties.size).toBe(12);
  });

  it("merges given properties over defaults", () => {
    const text = new Text("Hi", { size: 40, fill: "#f00" });
    expect(text.properties.size).toBe(40);
    expect(text.properties.fill).toBe("#f00");
    expect(text.properties.weight).toBe(400);
  });

  it("emits update when value changes", () => {
    const text = new Text("Hi");
    const listener = vi.fn();
    text.on("update", listener);
    text.value = "Bye";
    expect(text.value).toBe("Bye");
    expect(listener).toHaveBeenCalledOnce();
  });

  it("emits update and re-normalizes when properties change", () => {
    const text = new Text("Hi", { size: 40 });
    const listener = vi.fn();
    text.on("update", listener);
    text.properties = { fill: "#0f0" };
    expect(text.properties.fill).toBe("#0f0");
    expect(text.properties.size).toBe(12);
    expect(listener).toHaveBeenCalledOnce();
  });
});

describe("filterTexts", () => {
  it("wraps a single Text in an array", () => {
    const text = new Text("Hi");
    expect(filterTexts(text)).toEqual([text]);
  });

  it("drops non-Text entries with a warning", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const text = new Text("Hi");
    const result = filterTexts([text, {} as Text, "nope" as unknown as Text]);
    expect(result).toEqual([text]);
    expect(warnSpy).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });

  it("handles undefined", () => {
    expect(filterTexts(undefined)).toEqual([]);
  });
});

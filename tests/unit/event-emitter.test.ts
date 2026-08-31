import { describe, expect, it, vi } from "vitest";
import { Emitter } from "../../src/core/event-emitter";

type Events = { update: []; "update:uniform": [name: string] };

class TestEmitter extends Emitter<Events> {
  fire<K extends keyof Events>(event: K, ...args: Events[K]): void {
    this.emit(event, ...args);
  }
}

describe("Emitter", () => {
  it("calls listeners with emitted args", () => {
    const emitter = new TestEmitter();
    const listener = vi.fn();
    emitter.on("update:uniform", listener);
    emitter.fire("update:uniform", "uOffset");
    expect(listener).toHaveBeenCalledExactlyOnceWith("uOffset");
  });

  it("supports multiple listeners per event", () => {
    const emitter = new TestEmitter();
    const a = vi.fn();
    const b = vi.fn();
    emitter.on("update", a);
    emitter.on("update", b);
    emitter.fire("update");
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });

  it("on returns an unsubscribe function", () => {
    const emitter = new TestEmitter();
    const listener = vi.fn();
    const unsubscribe = emitter.on("update", listener);
    unsubscribe();
    emitter.fire("update");
    expect(listener).not.toHaveBeenCalled();
  });

  it("off removes a specific listener only", () => {
    const emitter = new TestEmitter();
    const keep = vi.fn();
    const remove = vi.fn();
    emitter.on("update", keep);
    emitter.on("update", remove);
    emitter.off("update", remove);
    emitter.fire("update");
    expect(keep).toHaveBeenCalledOnce();
    expect(remove).not.toHaveBeenCalled();
  });

  it("listeners added during emit are not called in that emit", () => {
    const emitter = new TestEmitter();
    const late = vi.fn();
    emitter.on("update", () => emitter.on("update", late));
    emitter.fire("update");
    expect(late).not.toHaveBeenCalled();
    emitter.fire("update");
    expect(late).toHaveBeenCalledOnce();
  });
});

import { logWarning } from "./core/errors";
import { Emitter } from "./core/event-emitter";
import { createId } from "./utils/id";
import {
  ensurePropertyValues,
  type TextProperties,
} from "./utils/text-measurement";

export type TextEvents = { update: [] };

export class Text extends Emitter<TextEvents> {
  readonly id: string;
  private _value: string;
  private _properties: TextProperties;

  constructor(value: string, properties: Partial<TextProperties> = {}) {
    super();
    this.id = createId();
    this._value = value;
    this._properties = ensurePropertyValues(properties);
  }

  get value(): string {
    return this._value;
  }

  set value(value: string) {
    this._value = value;
    this.update();
  }

  get properties(): TextProperties {
    return this._properties;
  }

  set properties(properties: Partial<TextProperties>) {
    this._properties = ensurePropertyValues(properties);
    this.update();
  }

  // Notify observers (a Blotter instance) that this text changed. Value and
  // properties writes call it automatically; call directly after bulk edits.
  update(): void {
    this.emit("update");
  }
}

// Coerce a Text, array of Texts, or array-like into Text[], warning on and
// dropping anything that isn't a Text.
export function filterTexts(texts: Text | Text[] | undefined): Text[] {
  const array = texts instanceof Text ? [texts] : Array.from(texts ?? []);
  return array.filter((text) => {
    const isText = text instanceof Text;
    if (!isText) {
      logWarning("blotter", "filterTexts", "object must be instance of Text");
    }
    return isText;
  });
}

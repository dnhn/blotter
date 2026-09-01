export interface TextProperties {
  family: string;
  size: number;
  // Unitless multiplier, "Npx", or "N%" (all relative to size).
  leading: number | string;
  fill: string;
  style: string;
  weight: number | string;
  padding: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
}

export const DEFAULT_TEXT_PROPERTIES: TextProperties = {
  family: 'sans-serif',
  size: 12,
  leading: 1.5,
  fill: '#000',
  style: 'normal',
  weight: 400,
  padding: 0,
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
};

export function ensurePropertyValues(
  properties: Partial<TextProperties> = {},
): TextProperties {
  return { ...DEFAULT_TEXT_PROPERTIES, ...properties };
}

// CSS shorthand for the effective padding; each side falls back to the
// blanket `padding` value.
export function stringifiedPadding(
  properties: Partial<TextProperties> = {},
): string {
  const p = ensurePropertyValues(properties);
  const top = p.paddingTop || p.padding;
  const right = p.paddingRight || p.padding;
  const bottom = p.paddingBottom || p.padding;
  const left = p.paddingLeft || p.padding;
  return `${top}px ${right}px ${bottom}px ${left}px`;
}

export function lineHeightPixels(
  size: number,
  leading: number | string = DEFAULT_TEXT_PROPERTIES.leading,
): number {
  if (typeof leading === 'number') {
    return size * leading;
  }
  if (leading.includes('px')) {
    return Number.parseInt(leading, 10);
  }
  if (leading.includes('%')) {
    return (Number.parseInt(leading, 10) / 100) * size;
  }
  const numeric = Number.parseFloat(leading);
  return Number.isNaN(numeric) ? size : size * numeric;
}

export interface TextSize {
  w: number;
  h: number;
}

// Measures rendered text by attaching a hidden span to the document.
// Forces layout — call sparingly (build time only, never per frame).
export function sizeForText(
  textValue: string,
  properties: Partial<TextProperties> = {},
): TextSize {
  const p = ensurePropertyValues(properties);
  const el = document.createElement('span');

  el.textContent = textValue;
  el.style.display = 'inline-block';
  el.style.fontFamily = p.family;
  el.style.fontSize = `${p.size}px`;
  el.style.fontWeight = String(p.weight);
  el.style.fontStyle = p.style;
  el.style.lineHeight = String(p.leading);
  el.style.maxWidth = 'none';
  el.style.padding = stringifiedPadding(p);
  el.style.position = 'absolute';
  el.style.width = 'auto';
  el.style.visibility = 'hidden';

  document.body.appendChild(el);
  const size: TextSize = { w: el.offsetWidth, h: el.offsetHeight };
  document.body.removeChild(el);

  return size;
}

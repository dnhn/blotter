export interface CanvasOptions {
  className?: string;
  // Fallback content inside <canvas> for accessibility / no-canvas UAs.
  // Assigned via innerHTML: pass trusted markup only, never user input.
  fallbackHtml?: string;
}

export function pixelRatio(): number {
  return (typeof window !== "undefined" && window.devicePixelRatio) || 1;
}

function applyCanvasOptions(
  canvas: HTMLCanvasElement,
  options: CanvasOptions,
): void {
  if (options.className !== undefined) canvas.className = options.className;
  if (options.fallbackHtml !== undefined)
    canvas.innerHTML = options.fallbackHtml;
}

export function createCanvas(
  width: number,
  height: number,
  options: CanvasOptions = {},
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  applyCanvasOptions(canvas, options);
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function createHiDpiCanvas(
  width: number,
  height: number,
  ratio = pixelRatio(),
  options: CanvasOptions = {},
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  applyCanvasOptions(canvas, options);
  updateCanvasSize(canvas, width, height, ratio);
  return canvas;
}

export function updateCanvasSize(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  ratio = 1,
): void {
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.getContext("2d")?.setTransform(ratio, 0, 0, ratio, 0, 0);
}

export interface MousePosition {
  x: number;
  y: number;
}

export function mousePosition(
  canvas: HTMLCanvasElement,
  event: MouseEvent,
): MousePosition {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

export function normalizedMousePosition(
  canvas: HTMLCanvasElement,
  event: MouseEvent,
): MousePosition {
  const rect = canvas.getBoundingClientRect();
  const position = mousePosition(canvas, event);
  return {
    x: position.x / rect.width,
    y: position.y / rect.height,
  };
}

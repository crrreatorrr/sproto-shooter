// Presentation only: drawing-buffer caps never change simulation or input.
export const GRAPHICS_PRESETS = Object.freeze({
  low: Object.freeze({ label: 'Low — up to 720p', width: 1280, height: 720 }),
  mid: Object.freeze({ label: 'Mid — up to 1080p', width: 1920, height: 1080 }),
  high: Object.freeze({ label: 'High — up to 1440p', width: 2560, height: 1440 }),
});

export function normalizeGraphicsPreset(value) {
  return typeof value === 'string' && Object.hasOwn(GRAPHICS_PRESETS, value) ? value : 'high';
}

/** Preserve aspect ratio, native density and the renderer's existing DPR cap. */
export function graphicsPixelRatio(value, width, height, devicePixelRatio = 1, maxDpr = 1.5) {
  const preset = GRAPHICS_PRESETS[normalizeGraphicsPreset(value)];
  const w = Number.isFinite(width) && width > 0 ? width : 1;
  const h = Number.isFinite(height) && height > 0 ? height : 1;
  const native = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.min(native, maxDpr, preset.width / Math.max(w, h), preset.height / Math.min(w, h));
}

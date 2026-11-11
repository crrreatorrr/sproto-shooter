import { describe, expect, it } from 'vitest';
import { graphicsPixelRatio, normalizeGraphicsPreset } from '../src/render/graphicsPresets.js';
import { migrateProfile, cloudBody } from '../src/save/profile.js';

const buffer = (preset, width, height, dpr = 1, cap = 1.5) => {
  const ratio = graphicsPixelRatio(preset, width, height, dpr, cap);
  return [Math.floor(width * ratio), Math.floor(height * ratio)];
};

describe('graphics resolution budgets', () => {
  it('caps actual landscape and portrait buffers at the selected resolution', () => {
    for (const [preset, width, height] of [['low', 1280, 720], ['mid', 1920, 1080], ['high', 2560, 1440]]) {
      expect(buffer(preset, 3840, 2160)).toEqual([width, height]);
      expect(buffer(preset, 2160, 3840)).toEqual([height, width]);
    }
    const [w, h] = buffer('low', 3440, 1440);
    expect(w).toBe(1280);
    expect(w * h).toBeLessThanOrEqual(1280 * 720);
    expect(w / h).toBeCloseTo(3440 / 1440, 2);
  });

  it('fits both edges for 4:3 and 16:10 displays, including rotated views', () => {
    expect(buffer('low', 1280, 960)).toEqual([960, 720]);
    expect(buffer('low', 1920, 1200)).toEqual([1152, 720]);
    expect(buffer('low', 1200, 1920)).toEqual([720, 1152]);
    expect(buffer('mid', 2560, 1920)).toEqual([1440, 1080]);
    expect(buffer('high', 2560, 1920)).toEqual([1920, 1440]);
  });

  it('retains native density and campaign/PvP DPR caps without upscaling small views', () => {
    expect(buffer('high', 640, 360)).toEqual([640, 360]);
    expect(buffer('high', 640, 360, 3)).toEqual([960, 540]);
    expect(buffer('high', 640, 360, 3, 1)).toEqual([640, 360]);
    expect(buffer('low', 1920, 1080, 2)).toEqual([1280, 720]);
    expect(Number.isFinite(graphicsPixelRatio('low', 0, 0, NaN))).toBe(true);
  });

  it('normalizes older or hostile profile values and retains the setting in non-economic cloud saves', () => {
    for (const value of [undefined, null, 'medium', '__proto__', 'constructor', {}, 1]) {
      expect(normalizeGraphicsPreset(value)).toBe('high');
      expect(migrateProfile({ settings: { graphicsPreset: value } }).settings.graphicsPreset).toBe('high');
    }
    for (const graphicsPreset of ['low', 'mid', 'high']) {
      expect(cloudBody({ settings: { graphicsPreset } }).settings.graphicsPreset).toBe(graphicsPreset);
    }
  });
});

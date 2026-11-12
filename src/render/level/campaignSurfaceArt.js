import { Vector4 } from 'three';

export const CAMPAIGN_SURFACE_ART = 'textures/campaign/surface-art.webp';

// Floor, wall, ceiling, and accent tile numbers in the 4 × 6 runtime atlas.
// Repeat distances are world metres; each tile contains several painted shapes.
const THEMES = {
  L01: [[0, 1, 23, 23], [8.5, 3.5, 4.2, 4.2], [8.5, 2.8, 4.2, 4.2], [1.05, 1.18, 1.1, 1.0], 0xdee9ff],
  L02: [[2, 3, 22, 22], [7.3, 4.6, 4.3, 4.3], [7.3, 3.2, 4.3, 4.3], [1.10, 1.25, 1.20, 1.15], 0xffd4aa],
  L03: [[4, 5, 5, 5], [5.6, 3.5, 3.5, 3.5], [5.6, 2.4, 2.8, 2.4], [1.13, 1.17, 1.16, 1.23], 0xffd4aa],
  L04: [[6, 7, 11, 11], [5.1, 4.6, 5.1, 5.1], [5.1, 3.9, 4.2, 4.2], [1.00, 1.18, 1.32, 1.2], 0x53e5ff],
  L05: [[8, 9, 10, 9], [8.1, 6.4, 5.4, 5.2], [8.1, 4.8, 4.4, 4.9], [1.15, 1.04, 1.40, 1.09], 0x99e7ff],
  L06: [[12, 13, 23, 23], [5.1, 5.4, 4.4, 4.4], [5.1, 3.4, 4.4, 4.4], [1.28, 1.29, 1.10, 1.0], 0xade6ff],
  L07: [[14, 15, 15, 15], [4.3, 3.9, 4.2, 4.2], [4.3, 2.7, 3.4, 3.4], [1.32, 1.44, 1.2, 1.12], 0xff9849],
  L08: [[16, 17, 23, 23], [3.8, 5.2, 4.5, 4.5], [3.8, 3.8, 4.5, 4.5], [1.30, 1.30, 1.30, 1.10], 0xe2f3ff],
  L09: [[18, 19, 19, 19], [5.5, 5.1, 5.1, 5.1], [5.5, 3.6, 3.6, 3.6], [1.45, 1.45, 1.20, 1.18], 0xb3a3ff],
  L10: [[20, 21, 21, 21], [6.3, 5.5, 5.5, 5.5], [6.3, 3.9, 3.9, 3.9], [1.45, 1.48, 1.20, 1.18], 0xff9147],
};

export const CEILING_SURFACE = 1;
export const GLASS_CEILING_SURFACE = 2;

export function ceilingSurface(level, geometry) {
  if (geometry.kind !== 'box' || !geometry.id) return 0;
  const id = geometry.id;
  if (level === 'L03' && id === 'HH-ROOF') return GLASS_CEILING_SURFACE;
  if ((level === 'L01' && /balc$/.test(id))
    || (level === 'L02' && /canopy|roof/.test(id))
    || (level === 'L03' && /roof/i.test(id))
    || (level === 'L04' && /(?:-roof|vaultRoof)$/.test(id))
    || (level === 'L05' && (/roof/i.test(id) || /^S4-(?:f2[snwe]|f3floor)$/.test(id)))) return CEILING_SURFACE;
  return 0;
}

export function kitCeilingSurface(model) {
  return model === 'void_bulkhead' || model === 'grove_shed' || model === 'grove_barn_roof'
    || model === 'frost_roof' ? CEILING_SURFACE : 0;
}

export function surfaceArtTheme(level) {
  const [tiles, metresX, metresY, amounts, light] = THEMES[level];
  return {
    tiles: new Vector4(...tiles),
    metresX: new Vector4(...metresX),
    metresY: new Vector4(...metresY),
    amounts: new Vector4(...amounts),
    light,
  };
}

export const ART_GLSL = /* glsl */ `
  uniform sampler2D campaignSurfaceArt;
  uniform float campaignArtReady;
  uniform float campaignCeiling;
  uniform vec4 campaignArtTiles;
  uniform vec4 campaignArtMetresX;
  uniform vec4 campaignArtMetresY;
  uniform vec4 campaignArtAmounts;
  uniform vec3 campaignArtLight;

  // Compute gradients before wrapping, and cap them to keep filtered samples inside the padded cell.
  vec4 sampleCampaignArt(vec2 p, float tile, vec2 metres, vec2 dx, vec2 dy) {
    vec2 cell = vec2(mod(tile, 4.), floor(tile * .25));
    vec2 size = vec2(672., 1008.);
    vec2 core = vec2(160.) / size;
    vec2 uv = (cell * 168. + 4. + fract(p / metres) * 160.) / size;
    vec2 limit = vec2(2.6) / size;
    return textureGrad(campaignSurfaceArt, vec2(uv.x, 1. - uv.y),
      clamp(dx / metres * core * vec2(1., -1.), -limit, limit),
      clamp(dy / metres * core * vec2(1., -1.), -limit, limit));
  }

  vec4 campaignArtSample(vec2 p, bool ground, bool ceiling, vec2 dx, vec2 dy, out float amount) {
    vec4 tiles = campaignArtTiles, x = campaignArtMetresX, y = campaignArtMetresY, a = campaignArtAmounts;
    if (ceiling) { amount = a.z; return sampleCampaignArt(p, tiles.z, vec2(x.z, y.z), dx, dy); }
    #if defined(CAMPAIGN_ART_GROVE)
      if (campaignSurfaceKind == 2.) {
        amount = a.y;
        return sampleCampaignArt(p, tiles.y, vec2(x.y, y.y), dx, dy);
      }
    #endif
    #if defined(CAMPAIGN_ART_FROST)
      if (campaignSurfaceKind == 2.) {
        amount = a.y;
        return sampleCampaignArt(p, 5., vec2(3.5, 2.4), dx, dy);
      }
      if (ground && campaignSurfaceKind == 0.) {
        amount = a.w;
        return sampleCampaignArt(p, tiles.w, vec2(x.w, y.w), dx, dy);
      }
      if (campaignSurfaceKind == 3.) { amount = a.x; return sampleCampaignArt(p, tiles.x, vec2(x.x, y.x), dx, dy); }
    #endif
    if (ground) { amount = a.x; return sampleCampaignArt(p, tiles.x, vec2(x.x, y.x), dx, dy); }
    amount = a.y;
    return sampleCampaignArt(p, tiles.y, vec2(x.y, y.y), dx, dy);
  }
`;

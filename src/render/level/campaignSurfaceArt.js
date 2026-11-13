import { Vector3, Vector4 } from 'three';

export const CAMPAIGN_SURFACE_ART = 'textures/campaign/surface-art.webp';
export const SKYLINE_SURFACE_ART = 'textures/campaign/skyline-surface.webp';
export const SKYLINE_PANORAMA = 'textures/campaign/skyline-night.webp';
export const UNDERWORKS_SURFACE_ART = 'textures/campaign/underworks-surface.webp';
export const UNDERWORKS_PANORAMA = 'textures/campaign/underworks-cavern.webp';

export const OFFICE_SURFACE_ART = 'textures/campaign/office-surface.webp';
export const OFFICE_PANORAMA = 'textures/campaign/office-night.webp';
export const MOONLIT_SURFACE_ART = 'textures/campaign/moonlit-surface.webp';
export const MOONLIT_PANORAMA = 'textures/campaign/moonlit-night.webp';

export const CALDERA_SURFACE_ART = 'textures/campaign/caldera-surface.webp';
export const CALDERA_PANORAMA = 'textures/campaign/caldera-sky.webp';

const LEVEL_ATLASES = { L06: SKYLINE_SURFACE_ART, L07: UNDERWORKS_SURFACE_ART, L08: OFFICE_SURFACE_ART, L09: MOONLIT_SURFACE_ART, L10: CALDERA_SURFACE_ART };
const PANORAMAS = { L06: SKYLINE_PANORAMA, L07: UNDERWORKS_PANORAMA, L08: OFFICE_PANORAMA, L09: MOONLIT_PANORAMA, L10: CALDERA_PANORAMA };

export function panoramaPath(level, section) {
  if ((level === 'L08' && section && section !== 'S4') || (level === 'L09' && section === 'S2')) return;
  return PANORAMAS[level];
}

export function surfaceArtPath(level) {
  return LEVEL_ATLASES[level] || CAMPAIGN_SURFACE_ART;
}

// Floor, wall, ceiling, and accent tile numbers in each runtime atlas.
// Repeat distances are world metres; each tile contains several painted shapes.
const THEMES = {
  L01: [[0, 1, 23, 23], [8.5, 3.5, 4.2, 4.2], [8.5, 2.8, 4.2, 4.2], [1.05, 1.18, 1.1, 1.0], 0xdee9ff],
  L02: [[2, 3, 22, 22], [7.3, 4.6, 4.3, 4.3], [7.3, 3.2, 4.3, 4.3], [1.10, 1.25, 1.20, 1.15], 0xffd4aa],
  L03: [[4, 5, 5, 5], [5.6, 3.5, 3.5, 3.5], [5.6, 2.4, 2.8, 2.4], [1.13, 1.17, 1.16, 1.23], 0xffd4aa],
  L04: [[6, 7, 11, 11], [5.1, 4.6, 5.1, 5.1], [5.1, 3.9, 4.2, 4.2], [1.00, 1.18, 1.32, 1.2], 0x53e5ff],
  L05: [[8, 9, 10, 9], [8.1, 6.4, 5.4, 5.2], [8.1, 4.8, 4.4, 4.9], [1.15, 1.04, 1.40, 1.09], 0x99e7ff],
  L06: [[0, 1, 2, 3], [8.2, 4.8, 4.35, 4.4], [7.8, 4.7, 4.3, 2.65], [1.64, 1.48, 1.35, 1.47], 0x6edbff],
  L07: [[0, 1, 2, 3], [6.3, 5.4, 7.6, 6.1], [6.1, 4.15, 6.2, 5.25], [2.4, 2.06, 1.54, 1.92], 0xffac52],
  L08: [[0, 1, 2, 3], [7.5, 6.1, 8.1, 6.7], [7.5, 4.4, 6.7, 6.7], [1.49, 1.55, 1.36, 1.64], 0x99e7ff],
  L09: [[0, 1, 2, 3], [7.8, 6.3, 7.2, 10.5], [7.8, 4.8, 6.4, 10.5], [2.17, 1.7, 1.72, 1.74], 0xc298ff],
  L10: [[0, 1, 2, 3], [7.3, 5.9, 6.7, 9.3], [7.0, 4.7, 5.8, 7.6], [2.02, 1.68, 1.83, 1.92], 0xff9147],
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
    || model === 'frost_roof' || model === 'skyline_canopy'
    || model === 'underworks_roof' || model === 'underworks_tunnel'
    || model === 'office_soffit' || model === 'office_portal' || model === 'moonlit_vault' || model === 'caldera_overhang' ? CEILING_SURFACE : 0;
}

export function surfaceArtTheme(level) {
  const [tiles, metresX, metresY, amounts, light] = THEMES[level];
  return {
    layout: Object.hasOwn(LEVEL_ATLASES, level) ? new Vector3(336, 336, 2) : new Vector3(672, 1008, 4),
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
  uniform vec3 campaignArtLayout;
  uniform vec4 campaignArtTiles;
  uniform vec4 campaignArtMetresX;
  uniform vec4 campaignArtMetresY;
  uniform vec4 campaignArtAmounts;
  uniform vec3 campaignArtLight;

  // Compute gradients before wrapping, and cap them to keep filtered samples inside the padded cell.
  vec4 sampleCampaignArt(vec2 p, float tile, vec2 metres, vec2 dx, vec2 dy) {
    float columns = campaignArtLayout.z;
    vec2 cell = vec2(mod(tile, columns), floor(tile / columns));
    vec2 size = campaignArtLayout.xy;
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
    #if defined(CAMPAIGN_ART_ACCENT_FLOOR)
      if (campaignSurfaceKind == 7.) {
        amount = a.w;
        return sampleCampaignArt(p, tiles.w, vec2(x.w, y.w), dx, dy);
      }
    #endif
    #if defined(CAMPAIGN_ART_SKYLINE)
      if (!ground && campaignSurfaceKind == 5.) {
        amount = a.w;
        return sampleCampaignArt(p, tiles.w, vec2(x.w, y.w), dx, dy);
      }
    #endif
    if (ground) { amount = a.x; return sampleCampaignArt(p, tiles.x, vec2(x.x, y.x), dx, dy); }
    amount = a.y;
    return sampleCampaignArt(p, tiles.y, vec2(x.y, y.y), dx, dy);
  }
`;

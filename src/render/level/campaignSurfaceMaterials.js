import { Color } from 'three';
import { peekTexture } from '../assets.js';
import {
  ART_GLSL, CAMPAIGN_SURFACE_ART, ceilingSurface, GLASS_CEILING_SURFACE, kitCeilingSurface, OFFICE_SURFACE_ART, SKYLINE_SURFACE_ART, surfaceArtPath, surfaceArtTheme, UNDERWORKS_SURFACE_ART,
} from './campaignSurfaceArt.js';
import { CAMPAIGN_SURFACE_PATTERNS, SURFACE_GLSL } from './campaignSurfacePatterns.js';

const HARD = 0, SOFT = 1, WOOD = 2, ICE = 3, GRASS = 4, MASONRY = 5, ROAD = 6, PANEL_FLOOR = 7;
const SUBSTRATE = {
  stone: HARD, rock: HARD, concrete: HARD, metal: HARD, pillar: HARD,
  grass: GRASS, dirt: SOFT, sand: SOFT, snow: SOFT, creekBed: SOFT, wood: WOOD, ice: ICE,
};

// Structural Blender models only. Keep signs, pickups, machinery, and glass on their own materials.
const KIT_SURFACES = {
  building_a: HARD, building_b: HARD, building_c: HARD, sidewalk: HARD,
  bazaar_wall: HARD, sandstone_house: HARD, low_wall: HARD,
  grove_shed: WOOD, grove_bridge: WOOD, grove_timber_ramp: WOOD, grove_root_wall: WOOD,
  grove_stockade: WOOD, grove_barn_roof: WOOD,
  void_deck: HARD, void_bulkhead: HARD, void_vault: HARD, void_apron: HARD, void_shelter: HARD, void_landing: HARD,
  frost_wall: HARD, frost_panel: HARD, frost_deck: HARD, frost_ice_floor: ICE,
  frost_glacier: ICE, frost_drift: SOFT, frost_roof: HARD,
  skyline_barrier: MASONRY, skyline_cladding: MASONRY, skyline_masonry: MASONRY,
  skyline_shop: MASONRY, skyline_depot: MASONRY, skyline_canopy: HARD, skyline_tower: HARD, skyline_slab: HARD,
  underworks_basalt_wall: HARD, underworks_basalt_cluster: HARD, underworks_steel_wall: PANEL_FLOOR,
  underworks_roof: PANEL_FLOOR, underworks_tunnel: PANEL_FLOOR,
  office_wall: HARD, office_facade: HARD, office_parapet: HARD,
  office_soffit: HARD, office_portal: HARD, office_pilaster: HARD, office_skirt: HARD,
};

const SURFACE_EXCLUSIONS = new Set(['energyBridge', 'fireRing', 'lockWall', 'mover', 'crackTiles']);

export function primitiveSurfaceKind(g) {
  if (!g || SURFACE_EXCLUSIONS.has(g.tag)) return;
  const mat = g.mat || 'stone';
  if (!Object.hasOwn(SUBSTRATE, mat)) return;
  const kind = SUBSTRATE[mat];
  if (g.kind === 'terrain' || g.kind === 'ramp') return kind;
  if (g.kind !== 'box' || !g.size) return;
  const [w, h, d] = g.size;
  const span = Math.max(w, d);
  if ((h >= 1.2 && span >= 2.5) || (span >= 2.5 && Math.min(w, d) >= 1.5)) return kind;
}

const WORLD_POSITION = /* glsl */ `
  #include <project_vertex>
  vec4 surfacePoint = vec4(transformed, 1.);
  #ifdef USE_BATCHING
    surfacePoint = batchingMatrix * surfacePoint;
  #endif
  #ifdef USE_INSTANCING
    surfacePoint = instanceMatrix * surfacePoint;
  #endif
  vCampaignSurface = (modelMatrix * surfacePoint).xyz;
`;

const SHADE_SURFACE = /* glsl */ `
  #include <color_fragment>
  vec3 surfaceDx = dFdx(vCampaignSurface), surfaceDy = dFdy(vCampaignSurface);
  vec3 surfaceNormal = cross(surfaceDx, surfaceDy);
  surfaceNormal *= inversesqrt(max(1e-16, dot(surfaceNormal, surfaceNormal)));
  surfacePixel = max(length(surfaceDx), length(surfaceDy));
  bool surfaceGround = abs(surfaceNormal.y) > .57;
  // Visible undersides face down. The walkable top of the same slab keeps its floor finish.
  bool surfaceCeiling = campaignCeiling > .5 && surfaceNormal.y < -.57;
  vec2 surfaceUV = surfaceGround ? vCampaignSurface.xz
    : vec2(dot(vCampaignSurface.xz, vec2(surfaceNormal.z, -surfaceNormal.x)), -vCampaignSurface.y);
  vec3 campaignGleam = vec3(0.);
  #ifndef CAMPAIGN_GLASS_ROOF
    vec3 campaignTint = shadeCampaignSurface(surfaceUV, surfaceGround, campaignGleam);
  #endif
  #ifdef CAMPAIGN_KIT_GLOW
    float campaignWeight = 1. - smoothstep(.025, .14, vKitGlow);
  #else
    float campaignWeight = 1.;
  #endif
  vec2 artDx = surfaceGround ? surfaceDx.xz
    : vec2(dot(surfaceDx.xz, vec2(surfaceNormal.z, -surfaceNormal.x)), -surfaceDx.y);
  vec2 artDy = surfaceGround ? surfaceDy.xz
    : vec2(dot(surfaceDy.xz, vec2(surfaceNormal.z, -surfaceNormal.x)), -surfaceDy.y);
  float detail = 1. - smoothstep(.46, 1.45, surfacePixel);
  #ifdef CAMPAIGN_GLASS_ROOF
    // Weathered panes retain the existing greenhouse roof framing and transparency.
    if (surfaceGround) {
      float weather = surfaceNoise(surfaceUV * .29) * .74 + surfaceNoise(surfaceUV * 1.12) * .26;
      diffuseColor.rgb *= mix(vec3(1.), vec3(.91, .98, 1.055) + weather * .15, detail);
      diffuseColor.a *= mix(1., .84 + .34 * weather, detail);
    }
  #else
    if (campaignArtReady > .5 && detail > 0.) {
      float amount;
      vec4 art = campaignArtSample(surfaceUV, surfaceGround, surfaceCeiling, artDx, artDy, amount);
      vec3 ink = art.rgb - vec3(128. / 255.);
      campaignTint = mix(campaignTint, vec3(1.), detail * (surfaceCeiling ? .76 : .38));
      campaignTint += ink * amount * detail;
      if (!surfaceGround || surfaceCeiling) {
        float lamp = clamp((art.a - 128. / 255.) * 2., 0., 1.);
        campaignGleam += campaignArtLight * lamp * detail * (surfaceCeiling ? .72 : .32);
      }
    }
    #ifdef CAMPAIGN_ART_SKYLINE
      if (surfaceGround && campaignSurfaceKind == 6.) {
        float z = vCampaignSurface.z;
        float shoulder = surfaceStamp(min(abs(z - 1.55), abs(z - 20.45)), .095);
        float stripes = surfaceStamp(min(abs(z - 7.85), abs(z - 14.15)), .078)
          * surfaceLine(vCampaignSurface.x, 6.4, 1.36);
        float flecks = mix(.62, 1., surfaceNoise(surfaceUV * 7.));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.49, .27, .073), shoulder * flecks * .67);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.30, .35, .43), stripes * flecks * .63);
      }
    #endif
    diffuseColor.rgb *= mix(vec3(1.), max(campaignTint, vec3(.39)), campaignWeight);
  #endif
`;

export function createCampaignSurfaceMaterials() {
  const materials = new WeakMap();
  const time = { value: 0 };
  const atlases = new Map([CAMPAIGN_SURFACE_ART, SKYLINE_SURFACE_ART, UNDERWORKS_SURFACE_ART, OFFICE_SURFACE_ART].map(
    (path) => [path, { texture: { value: null }, ready: { value: 0 } }],
  ));
  const themes = new Map();
  function decorate(base, level, kind, ceiling) {
    const glassRoof = ceiling === GLASS_CEILING_SURFACE;
    if (kind === undefined || !Object.hasOwn(CAMPAIGN_SURFACE_PATTERNS, level)
      || (base.transparent && !glassRoof) || !base.isMeshStandardMaterial) return base;
    if (!themes.has(level)) themes.set(level, surfaceArtTheme(level));
    const theme = themes.get(level);
    const pattern = CAMPAIGN_SURFACE_PATTERNS[level];
    const art = atlases.get(surfaceArtPath(level));
    if (!materials.has(base)) materials.set(base, new Map());
    const cache = materials.get(base);
    const key = level + ':' + kind + ':' + ceiling;
    if (cache.has(key)) return cache.get(key);

    const material = base.clone();
    material.name = `Campaign surface ${level}`;
    // Soften the Skyline's direct sun reflection so the wet streaks stay visible.
    if (level === 'L06') material.roughness = Math.max(.48, material.roughness);
    if (level === 'L08' && kind === PANEL_FLOOR && !base.vertexColors) material.color.setHex(0x62758b);
    material.onBeforeCompile = function (shader, renderer) {
      base.onBeforeCompile.call(this, shader, renderer);
      const kitGlow = shader.vertexShader.includes('attribute float kitGlow;');
      shader.uniforms.campaignSurfaceTime = time;
      shader.uniforms.campaignSurfaceKind = { value: kind };
      shader.uniforms.campaignSurfaceArt = art.texture;
      shader.uniforms.campaignArtReady = art.ready;
      shader.uniforms.campaignCeiling = { value: ceiling };
      shader.uniforms.campaignArtLayout = { value: theme.layout };
      shader.uniforms.campaignArtTiles = { value: theme.tiles };
      shader.uniforms.campaignArtMetresX = { value: theme.metresX };
      shader.uniforms.campaignArtMetresY = { value: theme.metresY };
      shader.uniforms.campaignArtAmounts = { value: theme.amounts };
      shader.uniforms.campaignArtLight = { value: new Color(theme.light) };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vCampaignSurface;')
        .replace('#include <project_vertex>', WORLD_POSITION);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          ${kitGlow ? '#define CAMPAIGN_KIT_GLOW' : ''}
          ${level === 'L03' ? '#define CAMPAIGN_ART_GROVE' : ''}
          ${level === 'L05' ? '#define CAMPAIGN_ART_FROST' : ''}
          ${level === 'L06' ? '#define CAMPAIGN_ART_SKYLINE' : ''}
          ${level === 'L07' || level === 'L08' ? '#define CAMPAIGN_ART_FOUNDRY_OR_OFFICE' : ''}
          ${glassRoof ? '#define CAMPAIGN_GLASS_ROOF' : ''}
          ${SURFACE_GLSL}
          ${ART_GLSL}
          vec3 shadeCampaignSurface(vec2 p, bool ground, out vec3 gleam) {
            gleam = vec3(0.);
            ${pattern}
          }`)
        .replace('#include <color_fragment>', SHADE_SURFACE)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n'
          + 'totalEmissiveRadiance += campaignGleam * campaignWeight;');
    };
    material.customProgramCacheKey = () => base.customProgramCacheKey() + '|campaign:' + level + ':' + glassRoof;
    cache.set(key, material);
    return material;
  }

  return {
    update(seconds) {
      time.value = seconds;
      for (const [path, art] of atlases) {
        art.texture.value = peekTexture(path) || null;
        art.ready.value = art.texture.value ? 1 : 0;
      }
    },
    primitive(base, level, geometry) {
      if (!geometry) return base;
      const ceiling = ceilingSurface(level, geometry);
      const kind = ceiling === GLASS_CEILING_SURFACE ? HARD
        : level === 'L06' && /^S[1-4]-floor$/.test(geometry.id) ? ROAD
          : (level === 'L07' || level === 'L08') && /^S[34]-floor$/.test(geometry.id)
            ? PANEL_FLOOR : primitiveSurfaceKind(geometry);
      return decorate(base, level, kind, ceiling);
    },
    kit(base, level, model) {
      return Object.hasOwn(KIT_SURFACES, model)
        ? decorate(base, level, KIT_SURFACES[model], kitCeilingSurface(model)) : base;
    },
  };
}

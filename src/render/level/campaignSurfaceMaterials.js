import { CAMPAIGN_SURFACE_PATTERNS, SURFACE_GLSL } from './campaignSurfacePatterns.js';

const HARD = 0, SOFT = 1, WOOD = 2, ICE = 3, GRASS = 4;
const SUBSTRATE = {
  stone: HARD, rock: HARD, concrete: HARD, metal: HARD, pillar: HARD,
  grass: GRASS, dirt: SOFT, sand: SOFT, snow: SOFT, creekBed: SOFT, wood: WOOD, ice: ICE,
};

// Structural Blender models only. Keep signs, pickups, machinery, and glass on their own materials.
const KIT_SURFACES = {
  building_a: HARD, building_b: HARD, building_c: HARD, sidewalk: HARD,
  bazaar_wall: HARD, sandstone_house: HARD, low_wall: HARD,
  grove_shed: WOOD, grove_bridge: WOOD, grove_timber_ramp: WOOD, grove_root_wall: WOOD,
  grove_stockade: WOOD,
  void_deck: HARD, void_bulkhead: HARD, void_vault: HARD, void_apron: HARD, void_shelter: HARD, void_landing: HARD,
  frost_wall: HARD, frost_panel: HARD, frost_deck: HARD, frost_ice_floor: ICE,
  frost_glacier: ICE, frost_drift: SOFT,
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
  vec2 surfaceUV = surfaceGround ? vCampaignSurface.xz
    : vec2(dot(vCampaignSurface.xz, vec2(surfaceNormal.z, -surfaceNormal.x)), vCampaignSurface.y);
  vec3 campaignGleam = vec3(0.);
  vec3 campaignTint = shadeCampaignSurface(surfaceUV, surfaceGround, campaignGleam);
  #ifdef CAMPAIGN_KIT_GLOW
    float campaignWeight = 1. - smoothstep(.025, .14, vKitGlow);
  #else
    float campaignWeight = 1.;
  #endif
  diffuseColor.rgb *= mix(vec3(1.), max(campaignTint, vec3(.45)), campaignWeight);
`;

export function createCampaignSurfaceMaterials() {
  const materials = new WeakMap();
  const time = { value: 0 };
  function decorate(base, level, kind) {
    if (kind === undefined || !Object.hasOwn(CAMPAIGN_SURFACE_PATTERNS, level)
      || base.transparent || !base.isMeshStandardMaterial) return base;
    const pattern = CAMPAIGN_SURFACE_PATTERNS[level];
    if (!materials.has(base)) materials.set(base, new Map());
    const cache = materials.get(base);
    const key = level + ':' + kind;
    if (cache.has(key)) return cache.get(key);

    const material = base.clone();
    material.name = `Campaign surface ${level}`;
    // Soften the Skyline's direct sun reflection so the wet streaks stay visible.
    if (level === 'L06') material.roughness = Math.max(.48, material.roughness);
    material.onBeforeCompile = function (shader, renderer) {
      base.onBeforeCompile.call(this, shader, renderer);
      const kitGlow = shader.vertexShader.includes('attribute float kitGlow;');
      shader.uniforms.campaignSurfaceTime = time;
      shader.uniforms.campaignSurfaceKind = { value: kind };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vCampaignSurface;')
        .replace('#include <project_vertex>', WORLD_POSITION);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          ${kitGlow ? '#define CAMPAIGN_KIT_GLOW' : ''}
          ${SURFACE_GLSL}
          vec3 shadeCampaignSurface(vec2 p, bool ground, out vec3 gleam) {
            gleam = vec3(0.);
            ${pattern}
          }`)
        .replace('#include <color_fragment>', SHADE_SURFACE)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n'
          + 'totalEmissiveRadiance += campaignGleam * campaignWeight;');
    };
    material.customProgramCacheKey = () => base.customProgramCacheKey() + '|campaign:' + level;
    cache.set(key, material);
    return material;
  }

  return {
    update(seconds) { time.value = seconds; },
    primitive(base, level, geometry) { return decorate(base, level, primitiveSurfaceKind(geometry)); },
    kit(base, level, model) { return Object.hasOwn(KIT_SURFACES, model) ? decorate(base, level, KIT_SURFACES[model]) : base; },
  };
}

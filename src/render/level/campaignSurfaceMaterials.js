import { Color, Vector4 } from 'three';
import { peekTexture } from '../assets.js';
import {
  ART_GLSL, CAMPAIGN_SURFACE_ART, ceilingSurface, GLASS_CEILING_SURFACE, kitCeilingSurface, MOONLIT_SURFACE_ART, OFFICE_SURFACE_ART, SKYLINE_SURFACE_ART, surfaceArtPath, surfaceArtTheme, UNDERWORKS_SURFACE_ART,
} from './campaignSurfaceArt.js';
import { CAMPAIGN_SURFACE_PATTERNS, SURFACE_GLSL } from './campaignSurfacePatterns.js';

const HARD = 0, SOFT = 1, WOOD = 2, ICE = 3, GRASS = 4, MASONRY = 5, ROAD = 6, PANEL_FLOOR = 7, CRYPT_FLOOR = 8;
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
  void_deck: HARD, void_bulkhead: HARD, void_vault: HARD, void_apron: ROAD, void_shelter: HARD, void_landing: HARD,
  frost_wall: HARD, frost_panel: HARD, frost_deck: HARD, frost_ice_floor: ICE,
  frost_glacier: ICE, frost_drift: SOFT, frost_roof: HARD,
  skyline_barrier: MASONRY, skyline_cladding: MASONRY, skyline_masonry: MASONRY,
  skyline_shop: MASONRY, skyline_depot: MASONRY, skyline_canopy: HARD, skyline_tower: HARD, skyline_slab: HARD,
  underworks_basalt_wall: HARD, underworks_basalt_cluster: HARD, underworks_steel_wall: PANEL_FLOOR,
  underworks_roof: PANEL_FLOOR, underworks_tunnel: PANEL_FLOOR,
  office_wall: HARD, office_facade: HARD, office_parapet: HARD,
  office_soffit: HARD, office_portal: HARD, office_pilaster: HARD, office_skirt: HARD,
  moonlit_apron: HARD, moonlit_wall: HARD, moonlit_crypt_wall: HARD,
  moonlit_vault: HARD, moonlit_column: HARD, moonlit_ruin_arch: HARD, moonlit_tomb: HARD,
  moonlit_ridge: HARD,
  bazaar2_wall_panel: HARD, bazaar2_shop: HARD, bazaar2_tower: HARD,
  bazaar2_support: HARD, bazaar2_ridge: MASONRY, bazaar2_canopy: WOOD,
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
    vec3 campaignTint = shadeCampaignSurface(surfaceUV, surfaceGround, surfaceNormal.y > .57, campaignGleam);
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
      if (surfaceNormal.y > .57 && campaignSurfaceKind == 6.) {
        float cross = abs(surfaceUV.y - campaignRoad.y);
        float shoulder = campaignRoad.x - cross;
        float curb = surfaceStamp(shoulder - 1.65, .093);
        float apron = 1. - smoothstep(2.05, 2.3, shoulder);
        float drains = surfaceStamp(shoulder - .98, .36)
          * surfaceLine(surfaceUV.x, 7.4, .64)
          * surfaceLine(surfaceUV.x, .17, .031);
        float lanes = surfaceStamp(cross - campaignRoad.x * .27, .088)
          * surfaceLine(surfaceUV.x, 7.4, 1.48);
        // Mark a loading bay in the yard and zebra crossings along Cabal Streets.
        vec2 marking = vec2(surfaceUV.x - campaignRoad.z, surfaceUV.y - campaignRoad.y);
        float yard = step(1.5, campaignRoad.w) * (1. - step(2.5, campaignRoad.w));
        vec2 bay = abs(marking - vec2(3., -campaignRoad.x * .53));
        float outline = max(surfaceStamp(bay.x - 4.2, .11) * (1. - smoothstep(2.65, 2.8, bay.y)),
          surfaceStamp(bay.y - 2.7, .11) * (1. - smoothstep(4.15, 4.3, bay.x)));
        float hatching = (1. - smoothstep(.9, 1.1, abs(bay.x - 3.25)))
          * (1. - smoothstep(2.46, 2.56, bay.y)) * surfaceLine(marking.x + marking.y, .57, .083);
        float crossing = step(3.5, campaignRoad.w) * surfaceLine(marking.x + 3., 20., 1.12)
          * (1. - smoothstep(campaignRoad.x - 3.5, campaignRoad.x - 3.25, cross))
          * surfaceLine(marking.y, 1.26, .29);
        float flecks = mix(.65, 1., surfaceNoise(surfaceUV * 7.));
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.74, .84, 1.02), apron * .8);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.045, .059, .081), drains * .8);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.49, .27, .073), curb * flecks * .68);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.30, .35, .43), lanes * flecks * .61);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.48, .29, .091), yard * max(outline, hatching) * flecks * .79);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.37, .42, .47), crossing * flecks * .66);
      }
    #endif
    #ifdef CAMPAIGN_ART_MOONLIT
      if (surfaceNormal.y > .57 && campaignSurfaceKind == 8.) {
        float centre = abs(surfaceUV.y - 11.);
        float aisle = 1. - smoothstep(3.7, 3.95, centre);
        float rim = surfaceStamp(centre - 3.71, .06);
        vec2 stone = abs(fract(vec2(surfaceUV.x / 3.8, surfaceUV.y / 2.5)) - .5);
        float carving = surfaceStamp(stone.x + stone.y - .28, .021) * aisle;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.57, .65, .86), aisle * .62);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.23, .26, .42), max(rim, carving * .64) * .55);
      }
    #endif
    diffuseColor.rgb *= mix(vec3(1.), max(campaignTint, vec3(.39)), campaignWeight);
  #endif
`;

export function createCampaignSurfaceMaterials() {
  const materials = new WeakMap();
  const time = { value: 0 };
  const atlases = new Map([CAMPAIGN_SURFACE_ART, SKYLINE_SURFACE_ART, UNDERWORKS_SURFACE_ART, OFFICE_SURFACE_ART, MOONLIT_SURFACE_ART].map(
    (path) => [path, { texture: { value: null }, ready: { value: 0 } }],
  ));
  const themes = new Map();
  function decorate(base, level, kind, ceiling, road = null) {
    const glassRoof = ceiling === GLASS_CEILING_SURFACE;
    if (kind === undefined || !Object.hasOwn(CAMPAIGN_SURFACE_PATTERNS, level)
      || (base.transparent && !glassRoof) || !base.isMeshStandardMaterial) return base;
    if (!themes.has(level)) themes.set(level, surfaceArtTheme(level));
    const theme = themes.get(level);
    const pattern = CAMPAIGN_SURFACE_PATTERNS[level];
    const art = atlases.get(surfaceArtPath(level));
    if (!materials.has(base)) materials.set(base, new Map());
    const cache = materials.get(base);
    const key = level + ':' + kind + ':' + ceiling + (road ? ':' + road.toArray().join(',') : '');
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
      if (level === 'L06') shader.uniforms.campaignRoad = { value: road || new Vector4(0, 0, 0, 0) };
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
          ${level === 'L09' ? '#define CAMPAIGN_ART_MOONLIT' : ''}
          ${level === 'L06' ? '#define CAMPAIGN_ART_SKYLINE\nuniform vec4 campaignRoad;' : ''}
          ${['L07', 'L08', 'L09'].includes(level) ? '#define CAMPAIGN_ART_ACCENT_FLOOR' : ''}
          ${glassRoof ? '#define CAMPAIGN_GLASS_ROOF' : ''}
          ${SURFACE_GLSL}
          ${ART_GLSL}
          vec3 shadeCampaignSurface(vec2 p, bool ground, bool upward, out vec3 gleam) {
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
      const accentFloor = ((level === 'L07' || level === 'L08') && /^S[34]-floor$/.test(geometry.id))
        || (level === 'L09' && geometry.id === 'S3-floor');
      const kind = ceiling === GLASS_CEILING_SURFACE ? HARD
        : level === 'L06' && /^S[1-4]-floor$/.test(geometry.id) ? ROAD
          : level === 'L02' && geometry.mat === 'rock' ? MASONRY
          : level === 'L09' && geometry.id === 'S2-floor' ? CRYPT_FLOOR
            : accentFloor ? PANEL_FLOOR : primitiveSurfaceKind(geometry);
      const road = level === 'L06' && kind === ROAD
        ? new Vector4(geometry.size[2] / 2, geometry.at[2], geometry.at[0], Number(geometry.id[1])) : null;
      return decorate(base, level, kind, ceiling, road);
    },
    kit(base, level, model) {
      return Object.hasOwn(KIT_SURFACES, model)
        ? decorate(base, level, KIT_SURFACES[model], kitCeilingSurface(model)) : base;
    },
  };
}

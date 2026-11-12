import { describe, expect, it } from 'vitest';
import { MeshStandardMaterial } from 'three';
import { CAMPAIGN } from '../../src/data/levels/index.js';
import { box } from '../../src/data/levels/kit.js';
import { createCampaignSurfaceMaterials } from '../../src/render/level/campaignSurfaceMaterials.js';
import { kitMaterial } from '../../src/render/level/kitModels.js';
import { buildSectionMeshes } from '../../src/render/level/levelGeometry.js';

const floor = box({ id: 'floor', at: [0, -.25, 0], size: [20, .5, 16], mat: 'concrete' });
const wall = box({ id: 'wall', at: [0, 2, 8], size: [20, 4, 1], mat: 'concrete' });

describe('campaign surface materials', () => {
  it('assigns a unique theme to every campaign level and preserves geometry', () => {
    const surfaces = createCampaignSurfaceMaterials();
    const cache = new Map();
    const plain = buildSectionMeshes([floor, wall], cache)[0];
    const programs = CAMPAIGN.map((level) => {
      const [styled] = buildSectionMeshes([floor, wall], cache, undefined,
        (base, g) => surfaces.primitive(base, level, g));
      expect(styled.material).not.toBe(plain.material);
      expect(styled.geometry.index.array).toEqual(plain.geometry.index.array);
      expect(styled.geometry.attributes.position.array).toEqual(plain.geometry.attributes.position.array);
      return styled.material.customProgramCacheKey();
    });
    expect(new Set(programs).size).toBe(CAMPAIGN.length);
  });

  it('keeps gameplay materials and unrelated props on their existing shaders', () => {
    const surfaces = createCampaignSurfaceMaterials();
    const base = new MeshStandardMaterial();
    const glass = new MeshStandardMaterial({ transparent: true });
    expect(surfaces.primitive(base, 'L04', { ...floor, tag: 'energyBridge' })).toBe(base);
    expect(surfaces.primitive(base, 'L05', { ...floor, tag: 'crackTiles' })).toBe(base);
    expect(surfaces.primitive(base, 'L10', { ...floor, mat: 'lava' })).toBe(base);
    expect(surfaces.primitive(glass, 'L03', wall)).toBe(glass);
    expect(surfaces.primitive(base, 'other-level', wall)).toBe(base);
    expect(surfaces.kit(base, 'L04', 'void_relay')).toBe(base);
    expect(surfaces.kit(base, 'L04', 'void_deck')).not.toBe(base);
  });

  it('keeps authored kit emission and updates the procedural clock without a new material', () => {
    const surfaces = createCampaignSurfaceMaterials();
    const material = surfaces.kit(kitMaterial(), 'L04', 'void_deck');
    const shader = {
      vertexShader: '#include <common>\n#include <begin_vertex>\n#include <project_vertex>',
      fragmentShader: '#include <common>\n#include <color_fragment>\n#include <emissivemap_fragment>',
      uniforms: {},
    };
    material.onBeforeCompile(shader);
    expect(shader.vertexShader).toContain('instanceMatrix * surfacePoint');
    expect(shader.fragmentShader).toContain('vColor.rgb * vKitGlow');
    expect(shader.fragmentShader).toContain('#define CAMPAIGN_KIT_GLOW');
    surfaces.update(7);
    expect(shader.uniforms.campaignSurfaceTime.value).toBe(7);
    expect(surfaces.kit(kitMaterial(), 'L04', 'void_deck')).toBe(material);
  });
});

it('assigns a ceiling finish only to authored overhead surfaces', () => {
  const surfaces = createCampaignSurfaceMaterials();
  const base = new MeshStandardMaterial();
  const roof = { ...floor, id: 'S4-f2s' };
  const overhead = surfaces.primitive(base, 'L05', roof);
  const walking = surfaces.primitive(base, 'L05', floor);
  expect(overhead).not.toBe(walking);
  const shader = {
    vertexShader: '#include <common>\n#include <project_vertex>',
    fragmentShader: '#include <common>\n#include <color_fragment>\n#include <emissivemap_fragment>',
    uniforms: {},
  };
  overhead.onBeforeCompile(shader);
  expect(shader.uniforms.campaignCeiling.value).toBe(1);
  expect(shader.fragmentShader).toContain('surfaceNormal.y < -.57');
  expect(shader.fragmentShader).toContain('textureGrad(campaignSurfaceArt');
  expect(shader.fragmentShader).toContain('campaignArtLight * lamp');

  const glass = new MeshStandardMaterial({ transparent: true, depthWrite: false });
  const greenhouse = surfaces.primitive(glass, 'L03', { ...roof, id: 'HH-ROOF' });
  expect(greenhouse).not.toBe(glass);
  expect(greenhouse.transparent).toBe(true);
  expect(greenhouse.depthWrite).toBe(false);
});

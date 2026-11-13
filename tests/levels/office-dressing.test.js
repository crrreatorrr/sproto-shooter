import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { L08 } from '../../src/data/levels/campaign.js';
import { activeSolids, groundHeight, firstSolid, pushHorizontal } from '../../src/sim/campaign/solids.js';
import { campaignPre, campaignPost, startCampaign, transitionDone } from '../../src/sim/campaign/campaign.js';
import { createGameState, run, cmd } from '../helpers.js';
import { KIT } from '../../src/render/level/kitModels.js';
import { officePlacements } from '../../src/render/level/officeDressing.js';
import { kitCeilingSurface, panoramaPath, surfaceArtPath, surfaceArtTheme } from '../../src/render/level/campaignSurfaceArt.js';

const assets = new URL('../../public/assets/', import.meta.url);
const models = new Map();
function gltfFor(model) {
  if (!models.has(model)) {
    const glb = gunzipSync(readFileSync(new URL(KIT.prop(model), assets)));
    models.set(model, JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString()));
  }
  return models.get(model);
}
function triangles(model) {
  const gltf = gltfFor(model);
  return gltf.meshes.flatMap(m => m.primitives)
    .reduce((sum, p) => sum + gltf.accessors[p.indices ?? p.attributes.POSITION].count / 3, 0);
}

const originalKitTriangles = { S1: 32140, S2: 49208, S3: 45456, S4: 19652 };
const expandedWidths = { S1: 36, S2: 40, S3: 44, S4: 52 };

it.each(L08.sections)('fits $name within the section and under its original triangle count', (section) => {
  const prims = new Map(section.geometry.map(g => [g.id, g]));
  const props = officePlacements(section, prims);
  for (const side of ['N', 'S']) {
    const wall = prims.get(`${section.id}-wall${side}`);
    const [width, height, depth] = wall.size;
    const bays = props.filter(p => p.replace?.includes(wall.id));
    expect(bays).toHaveLength(section.id === 'S4' ? 8 : 6);
    let edge = wall.at[0] - width / 2;
    for (const bay of bays) {
      expect(bay.at[0] - bay.scale[0]).toBeCloseTo(edge);
      expect(bay.at.slice(1)).toEqual([0, wall.at[2]]);
      expect(bay.scale.slice(1)).toEqual([section.id === 'S4' ? 1.85 : height, depth / 2]);
      edge = bay.at[0] + bay.scale[0];
    }
    expect(edge).toBeCloseTo(wall.at[0] + width / 2);
  }
  const roof = section.id === 'S4';
  expect(props.some(p => p.model === 'office_soffit')).toBe(!roof);
  expect(props.some(p => p.model === 'office_tower')).toBe(roof);
  const laserCount = section.mechanisms.filter(m => m.kind === 'laser').length;
  const total = props.reduce((sum, p) => sum + triangles(p.model), 0) + laserCount * triangles('office_laser');
  expect(total).toBeGreaterThan(10_000);
  expect(total).toBeLessThan(originalKitTriangles[section.id]);
});

it.each(['north', 'south'])('activates encounters and supports seamless handoffs along the %s shoulder', (side) => {
  const state = createGameState({ seed: 7 });
  const player = state.players[state.localPlayerId];
  startCampaign(state, player, 'L08');
  for (const sec of L08.sections) {
    expect(state.level.section).toBe(sec.id);
    const floor = sec.geometry.find(g => g.id === `${sec.id}-floor`);
    expect(floor.size[2]).toBe(expandedWidths[sec.id]);
    const [encounter] = sec.encounters;
    const z = side === 'north' ? encounter.activate.min[2] + .8 : encounter.activate.max[2] - .8;
    player.pos = { x: encounter.activate.min[0] + .6, y: 0, z };
    campaignPre(state, 0);
    expect(state.level.spawned[encounter.id]).toBe(true);
    state.enemies.length = 0;
    if (!sec.exit) break;
    state.level.cleared[encounter.id] = true;
    player.pos.x = sec.exit.min[0] + .01;
    campaignPost(state, 0);
    expect(state.level.transition?.to).toBe(sec.exit.to);
    transitionDone(state);
    campaignPre(state, 0);
    const solids = activeSolids(state);
    if (sec.exit.to === 'S4') expect(solids).toBeNull();
    else {
      expect(groundHeight(solids, player.pos.x, z, .08, 0)).toBe(0);
      const entry = { ...player.pos };
      pushHorizontal(player, solids, .45, 1.8);
      expect(player.pos).toEqual(entry);
    }
  }
  expect(L08.sections[3].start).toEqual([141.5, 0, 11]);
});

it('uses real cover for the redesigned interiors and keeps the central spine open', () => {
  const state = createGameState({ seed: 7 });
  const player = state.players[state.localPlayerId];
  startCampaign(state, player, 'L08');
  for (const [section, coverPrefix] of [['S1', 'desk'], ['S2', 'pod'], ['S3', 'rack']]) {
    state.level.transition = { to: section };
    transitionDone(state);
    campaignPre(state, 0);
    const solids = activeSolids(state);
    const sec = L08.sections.find(s => s.id === section);
    const cover = sec.geometry.find(g => g.id.startsWith(`${section}-${coverPrefix}`));
    const [x, , z] = cover.at;
    const direction = { x: 1, y: 0, z: 0 };
    expect(firstSolid(solids, { x: x - 5, y: .85, z }, direction, 5)?.solid.id).toBe(cover.id);
    expect(firstSolid(solids, { x: sec.start[0], y: .85, z: 11 }, direction, 36)).toBeNull();
  }
});

it('keeps a jump from an upward grapple beneath the cubicle ceiling', () => {
  const state = createGameState({ seed: 7 });
  const player = state.players[state.localPlayerId];
  startCampaign(state, player, 'L08');
  state.level.transition = { to: 'S2' };
  transitionDone(state);
  player.pos = { x: 54, y: 0, z: 11 };
  let peak = 0;
  for (let tick = 0; tick < 130; tick++) {
    run(state, 1, () => cmd({ pitch: 1.49, held: { grapple: true }, pressed: { jump: tick === 49 } }));
    peak = Math.max(peak, player.pos.y);
  }
  expect(peak).toBeGreaterThan(2);
  expect(peak).toBeLessThan(state.level.legacyCeiling - 1);
});

it.each([
  ['office_clock', 'office_clock_hands', 'rotation'],
  ['office_fan', 'office_fan_rotor', 'rotation'],
  ['office_dish', 'office_dish_mount', 'rotation'],
  ['office_laser', 'office_laser_scan', 'translation'],
])('exports an animation for %s', (model, node, path) => {
  const gltf = gltfFor(model);
  const targets = gltf.animations.flatMap(clip => clip.channels.map(channel => channel.target));
  expect(targets.some(target => gltf.nodes[target.node].name === node && target.path === path)).toBe(true);
});

it('uses a dedicated atlas and skyline with ceiling treatment on interior modules', () => {
  expect(surfaceArtPath('L08')).not.toBe(surfaceArtPath('L07'));
  expect(panoramaPath('L08')).not.toBe(panoramaPath('L06'));
  expect(surfaceArtTheme('L08').layout.toArray()).toEqual([336, 336, 2]);
  expect(kitCeilingSurface('office_soffit')).toBe(1);
  expect(kitCeilingSurface('office_portal')).toBe(1);
  expect(kitCeilingSurface('office_parapet')).toBe(0);
});

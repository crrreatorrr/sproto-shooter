import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { Box3, Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { L01 } from '../../src/data/levels/L01/index.js';
import { landingPlacements } from '../../src/render/level/landingDressing.js';
import { KIT } from '../../src/render/level/kitModels.js';
import { createGameState } from '../../src/sim/state.js';
import { startCampaign, transitionDone, campaignPre, campaignPost } from '../../src/sim/campaign/campaign.js';

const assetRoot = new URL('../../public/assets/', import.meta.url);
const cache = new Map();

function model(name) {
  if (!cache.has(name)) {
    const bytes = gunzipSync(readFileSync(new URL(KIT.prop(name), assetRoot)));
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
    const bounds = new Box3();
    let tris = 0;
    for (const p of gltf.meshes[0].primitives) {
      const position = gltf.accessors[p.attributes.POSITION];
      bounds.expandByPoint(new Vector3(...position.min));
      bounds.expandByPoint(new Vector3(...position.max));
      tris += gltf.accessors[p.indices ?? p.attributes.POSITION].count / 3;
    }
    cache.set(name, { bounds, tris });
  }
  return cache.get(name);
}

function transformed(placement) {
  const { bounds } = model(placement.model);
  const scale = Array.isArray(placement.scale) ? new Vector3(...placement.scale) : new Vector3().setScalar(placement.scale);
  const q = new Quaternion().setFromEuler(new Euler(0, placement.yaw * Math.PI / 180, 0));
  const at = new Vector3(...placement.at);
  at.y -= bounds.min.y * scale.y;
  return bounds.clone().applyMatrix4(new Matrix4().compose(at, q, scale));
}

it.each(L01.sections)('keeps palms clear of architecture in $name and caps the instanced dressing', (sec) => {
  const placements = landingPlacements(sec, new Map(sec.geometry.map(g => [g.id, g])));
  const trees = placements.filter(p => p.model === 'landing_palm');
  const buildings = placements.filter(p => /^landing_(facade|street_wall|mall_wall|garage_wall|upper_wall|roof_rib)/.test(p.model)).map(transformed);
  const roofs = sec.geometry.filter(g => g.kind === 'box' && /(?:roof|canopy)$/.test(g.id)).map(g =>
    new Box3().setFromCenterAndSize(new Vector3(...g.at), new Vector3(...g.size)));
  for (const tree of trees) {
    const canopy = transformed(tree);
    expect([...buildings, ...roofs].some(volume => canopy.intersectsBox(volume))).toBe(false);
  }
  if (['S3', 'S4', 'S5'].includes(sec.id)) expect(trees).toHaveLength(0);
  expect(placements.reduce((total, p) => total + model(p.model).tris, 0)).toBeLessThan(29_000);
});

function enter(id) {
  const state = createGameState();
  const player = state.players[state.localPlayerId];
  startCampaign(state, player, 'L01');
  state.level.transition = { to: id };
  transitionDone(state);
  return { state, player, section: L01.sections.find(s => s.id === id) };
}

it.each([['S3', 42], ['S4', 38], ['S6', 48]])('allows the widened %s wing to trigger the lockdown', (id, width) => {
  const { state, player, section } = enter(id);
  const enc = section.encounters.find(e => e.lockdown);
  const floor = section.geometry.find(g => g.id === `${id}-floor`);
  expect(floor.size[2]).toBe(width);
  const x = (enc.lockdown.threshold.min[0] + enc.lockdown.threshold.max[0]) / 2;
  const z = section.navBounds.max[1] - 1;
  player.pos = { x, y: 0, z };
  player.prevPos = { ...player.pos };
  campaignPre(state, 1 / 60);
  campaignPost(state, 1 / 60);
  expect(state.level.v2.enc[enc.id].sealed).toBe(true);
  expect(state.level.closedDoors.every(door => door.min[2] <= section.navBounds.min[1] && door.max[2] >= section.navBounds.max[1])).toBe(true);
});

it.each([['S3', 'S4', 33], ['S4', 'S5', 29]])('transitions from %s into %s above the next floor', (id, next, z) => {
  const { state, player, section } = enter(id);
  const nextSection = L01.sections.find(s => s.id === next);
  for (const enc of section.encounters) state.level.cleared[enc.id] = true;
  player.pos = { x: (section.exit.min[0] + section.exit.max[0]) / 2, y: 0, z };
  expect(section.exit.min[2]).toBeGreaterThan(nextSection.navBounds.min[1]);
  expect(section.exit.max[2]).toBeLessThan(nextSection.navBounds.max[1]);
  campaignPost(state, 1 / 60);
  expect(state.level.transition.to).toBe(next);
  transitionDone(state);
  expect(state.level.section).toBe(next);
});

// Grove prefabs from docs/campaign/levels/L03-vegetable-grove.md §7.
// Parts are local to the prefab origin (ground centre). Cones and discs
// do not collide. Cylinders and boxes do.

import { box, cone, cylinder, disc, sphere } from './prim.js';

export function tree() {
  return [
    cylinder({ id: 'trunk', at: [0, 0, 0], r: 0.6, h: 6, mat: 'wood' }),
    sphere({ id: 'crown', at: [0, 7.5, 0], r: 3.2, mat: 'hedge' }),
  ];
}

export function truck() {
  return [
    box({ id: 'body', at: [0, 1.7, 0], size: [6, 2.2, 2.4], mat: 'metal' }),
    box({ id: 'cab', at: [0, 1.5, 4], size: [2, 1.8, 2.2], mat: 'metal' }),
    cylinder({ id: 'w0', at: [-2.2, 0.3, -0.9], r: 0.6, h: 0.5, mat: 'rock' }),
    cylinder({ id: 'w1', at: [2.2, 0.3, -0.9], r: 0.6, h: 0.5, mat: 'rock' }),
    cylinder({ id: 'w2', at: [-2.2, 0.3, 0.9], r: 0.6, h: 0.5, mat: 'rock' }),
    cylinder({ id: 'w3', at: [2.2, 0.3, 0.9], r: 0.6, h: 0.5, mat: 'rock' }),
    box({ id: 'tail', at: [0, 0.3, -2.2], size: [2.2, 0.6, 2], mat: 'metal' }),
  ];
}

export function shrine() {
  const stones = [];
  for (let i = 0; i < 4; i++) {
    const b = i * 90 + 45;
    const t = b * Math.PI / 180;
    stones.push(box({
      id: `stone${i}`,
      at: [Math.sin(t) * 3.5, 1.5, Math.cos(t) * 3.5],
      size: [1, 3, 1],
      mat: 'stone',
    }));
  }
  return [
    disc({ id: 'pad', at: [0, 0.02, 0], r: 4, mat: 'neon' }),
    cylinder({ id: 'pedestal', at: [0, 0, 0], r: 0.8, h: 1.2, mat: 'stone' }),
    sphere({ id: 'orb', at: [0, 2, 0], r: 0.5, mat: 'neon' }),
    ...stones,
  ];
}

export function podStump() {
  return [
    cylinder({ id: 'stump', at: [0, 0, 0], r: 0.6, h: 0.8, mat: 'wood' }),
    sphere({ id: 'pod', at: [0, 1.15, 0], r: 0.45, mat: 'toxic' }),
  ];
}

export function scarecrow() {
  return [
    cylinder({ id: 'pole', at: [0, 0, 0], r: 0.25, h: 2.2, mat: 'wood' }),
    box({ id: 'arm', at: [0, 1.6, 0], size: [1.8, 0.5, 0.5], mat: 'wood' }),
    sphere({ id: 'head', at: [0, 2.4, 0], r: 0.35, mat: 'sand' }),
  ];
}

export function scarecrowTower() {
  const posts = [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]].map(([x, z], i) => (
    cylinder({ id: `post${i}`, at: [x, 0, z], r: 0.3, h: 5, mat: 'wood' })
  ));
  return [
    ...posts,
    box({ id: 'deck', at: [0, 5.25, 0], size: [5, 0.5, 5], mat: 'wood' }),
    box({ id: 'parN', at: [0, 6.1, -2.25], size: [5, 1.2, 0.5], mat: 'wood' }),
    box({ id: 'parE', at: [2.25, 6.1, 0], size: [0.5, 1.2, 5], mat: 'wood' }),
    box({ id: 'parW', at: [-2.25, 6.1, 0], size: [0.5, 1.2, 5], mat: 'wood' }),
    ...scarecrow().map((part) => ({ ...part, id: `crow-${part.id}`, at: [part.at[0], part.at[1] + 5.5, part.at[2]] })),
  ];
}

export function tractor() {
  return [
    box({ id: 'body', at: [0, 1.2, 0], size: [4, 1.6, 2.2], mat: 'metal' }),
    box({ id: 'cab', at: [-1, 2.7, 0], size: [1.6, 1.4, 1.8], mat: 'metal' }),
    cylinder({ id: 'w0', at: [0, 0.6, -1.4], r: 1, h: 0.6, mat: 'rock' }),
    cylinder({ id: 'w1', at: [0, 0.6, 1.4], r: 1, h: 0.6, mat: 'rock' }),
  ];
}

/** Open front faces +z (south). `door` is a label for the spawn point, not a solid. */
export function shed() {
  return [
    box({ id: 'back', at: [0, 1.5, -2.5], size: [6, 3, 0.5], mat: 'wood' }),
    box({ id: 'sideW', at: [-2.75, 1.5, 0], size: [0.5, 3, 5], mat: 'wood' }),
    box({ id: 'sideE', at: [2.75, 1.5, 0], size: [0.5, 3, 5], mat: 'wood' }),
    box({ id: 'roof', at: [0, 3.25, 0], size: [6.5, 0.5, 5.5], mat: 'wood' }),
    box({ id: 'jambW', at: [-2.1, 1.5, 2.25], size: [1.8, 3, 0.5], mat: 'wood' }),
    box({ id: 'jambE', at: [2.1, 1.5, 2.25], size: [1.8, 3, 0.5], mat: 'wood' }),
  ];
}

export function mound() {
  return [
    disc({ id: 'disc', at: [0, 0.02, 0], r: 1.2, mat: 'dirt' }),
    cone({ id: 'cone', at: [0, 0, 0], r: 1.2, h: 0.5, mat: 'dirt' }),
  ];
}

export function beanstalk() {
  return [
    cylinder({ id: 'stalk', at: [0, 0, 0], r: 1.6, h: 24, mat: 'hedge' }),
    box({ id: 'leaf1', at: [-3.5, 5, 0], size: [4, 0.5, 4], mat: 'hedge' }),
    box({ id: 'leaf2', at: [0, 10.5, 3.5], size: [4, 0.5, 4], mat: 'hedge' }),
    box({ id: 'leaf3', at: [3.5, 16, 0], size: [4, 0.5, 4], mat: 'hedge' }),
    box({ id: 'leaf4', at: [0, 21.5, -3.5], size: [4, 0.5, 4], mat: 'hedge' }),
  ];
}

export function gazebo() {
  const pillars = [];
  for (let i = 0; i < 6; i++) {
    const b = i * 60;
    const t = b * Math.PI / 180;
    pillars.push(cylinder({
      id: `pil${i}`,
      at: [Math.sin(t) * 4.5, 0.5, Math.cos(t) * 4.5],
      r: 0.35,
      h: 3.5,
      mat: 'stone',
    }));
  }
  return [
    cylinder({ id: 'base', at: [0, -0.15, 0], r: 5, h: 0.5, mat: 'stone' }),
    ...pillars,
    cylinder({ id: 'roof', at: [0, 4, 0], r: 5.5, h: 0.5, mat: 'wood' }),
    cone({ id: 'spire', at: [0, 4.5, 0], r: 1.5, h: 2, mat: 'wood' }),
  ];
}

export function topiary() {
  return [
    cylinder({ id: 'stem', at: [0, 0, 0], r: 0.4, h: 1.2, mat: 'wood' }),
    sphere({ id: 'ball', at: [0, 2.4, 0], r: 1.5, mat: 'hedge' }),
  ];
}

export function totem() {
  const roots = [];
  for (let i = 0; i < 3; i++) {
    const t = (i * 120) * Math.PI / 180;
    roots.push(box({
      id: `root${i}`,
      at: [Math.sin(t) * 1.2, 0.25, Math.cos(t) * 1.2],
      size: [2, 0.5, 0.6],
      yaw: i * 120,
      mat: 'wood',
    }));
  }
  return [
    cylinder({ id: 'post', at: [0, 0, 0], r: 0.8, h: 4, mat: 'wood' }),
    sphere({ id: 'eye', at: [0, 4.4, 0], r: 0.7, mat: 'neon' }),
    ...roots,
  ];
}

export function rootArch(halfSpan) {
  return [
    cylinder({ id: 'l', at: [-halfSpan, 0, 0], r: 0.6, h: 5, mat: 'wood' }),
    cylinder({ id: 'r', at: [halfSpan, 0, 0], r: 0.6, h: 5, mat: 'wood' }),
    box({ id: 'lintel', at: [0, 5.5, 0], size: [2 * halfSpan + 2, 1, 1.5], mat: 'wood' }),
  ];
}

export function manaBloom() {
  return [
    cylinder({ id: 'stem', at: [0, 0, 0], r: 0.25, h: 0.6, mat: 'hedge' }),
    sphere({ id: 'flower', at: [0, 0.9, 0], r: 0.5, mat: 'neon' }),
    disc({ id: 'disc', at: [0, 0.02, 0], r: 1, mat: 'neon' }),
  ];
}

export function nest() {
  return [
    box({ id: 'base', at: [0, 0.5, 0], size: [4, 1, 4], mat: 'crate' }),
    cylinder({ id: 'c0', at: [-1.5, 0, -1.5], r: 0.5, h: 3, mat: 'wood' }),
    cylinder({ id: 'c1', at: [1.5, 0, -1.5], r: 0.5, h: 3, mat: 'wood' }),
    cylinder({ id: 'c2', at: [-1.5, 0, 1.5], r: 0.5, h: 3, mat: 'wood' }),
    cylinder({ id: 'c3', at: [1.5, 0, 1.5], r: 0.5, h: 3, mat: 'wood' }),
    sphere({ id: 'core', at: [0, 1.8, 0], r: 0.8, mat: 'neon' }),
    cone({ id: 'roof', at: [0, 3, 0], r: 2.6, h: 1.5, mat: 'crate' }),
  ];
}

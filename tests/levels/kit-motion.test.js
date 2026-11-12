import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createKitObject, updateKitMotion } from '../../src/render/level/kitMotion.js';

describe('campaign prop clips', () => {
  it('samples looping Blender-style tracks independently for each instance', () => {
    const scene = new THREE.Group();
    const part = new THREE.Object3D();
    part.name = 'Rotor';
    scene.add(part);
    const track = new THREE.VectorKeyframeTrack('Rotor.position', [0, 1, 2], [0, 0, 0, 0, 2, 0, 0, 0, 0]);
    const clip = new THREE.AnimationClip('Turn', 2, [track]);
    const kit = { name: 'test_rotor', motion: { scene, clip } };
    const first = createKitObject(kit);
    const second = createKitObject(kit, undefined, .5);

    updateKitMotion(first, .25);
    updateKitMotion(second, .25);
    expect(first.getObjectByName('Rotor').position.y).toBeCloseTo(.5);
    expect(second.getObjectByName('Rotor').position.y).toBeCloseTo(1.5);
    expect(part.position.y).toBe(0);

    updateKitMotion(first, 2.25);
    expect(first.getObjectByName('Rotor').position.y).toBeCloseTo(.5);
  });
});

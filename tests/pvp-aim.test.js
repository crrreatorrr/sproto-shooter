// SHOOTER-S3 aim convergence: the shot leaves the eye toward what the crosshair (camera ray) meets.
import { describe, expect, it } from 'vitest';
import { AIM_RANGE_M, chaseCamera, convergeAim } from '../src/render/pvp/aim.js';
import { chaseCamera as viewChaseCamera } from '../src/render/pvp/view.js';
import { dirFromYawPitch } from '../src/core/math.js';
import { TUNING } from '../src/data/tuning.js';
import { rayCapsule } from '../src/sim/pvp/hit.js';

function angle(a, b) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function eyeHits(me, aim, other) {
  const eye = { x: me.x, y: me.y + TUNING.eyeHeight, z: me.z };
  return rayCapsule(eye, dirFromYawPitch(aim.yaw, aim.pitch), other.x, other.z, other.y, other.y + TUNING.playerHeight, TUNING.playerRadius) >= 0;
}

describe('aim convergence (SHOOTER-S3)', () => {
  const me = { x: 0, y: 0, z: 0 };

  it('keeps the look yaw (the camera is straight behind the player)', () => {
    for (const yaw of [-2.5, -0.4, 0, 0.7, 3]) {
      for (const pitch of [-0.4, -0.1, 0, 0.2]) {
        expect(angle(convergeAim(me, { yaw, pitch }).yaw, yaw)).toBeLessThan(1e-9);
      }
    }
  });

  it('a shot from the eye passes through the crosshair point', () => {
    for (const look of [{ yaw: 0.3, pitch: -0.15 }, { yaw: -1.2, pitch: 0.1 }, { yaw: 2, pitch: -0.3 }]) {
      const aim = convergeAim(me, look);
      const dir = dirFromYawPitch(aim.yaw, aim.pitch);
      const v = { x: aim.point.x - aim.eye.x, y: aim.point.y - aim.eye.y, z: aim.point.z - aim.eye.z };
      const len = Math.hypot(v.x, v.y, v.z);
      expect(dir.x * v.x / len + dir.y * v.y / len + dir.z * v.z / len).toBeGreaterThan(1 - 1e-9);
      // The crosshair point is on the camera ray.
      const cam = aim.camera;
      const c = { x: cam.target.x - cam.position.x, y: cam.target.y - cam.position.y, z: cam.target.z - cam.position.z };
      const p = { x: aim.point.x - cam.position.x, y: aim.point.y - cam.position.y, z: aim.point.z - cam.position.z };
      const cross = Math.hypot(c.y * p.z - c.z * p.y, c.z * p.x - c.x * p.z, c.x * p.y - c.y * p.x) / Math.hypot(c.x, c.y, c.z);
      expect(cross).toBeLessThan(1e-6);
    }
  });

  it('an opponent under the crosshair is hit from the eye, where the raw look angles miss', () => {
    // Opponent 20 m ahead. Look straight along the camera ray at its chest.
    const other = { x: 0, y: 0, z: -20, alive: true };
    const cam0 = chaseCamera(me, 0, 0);
    const chest = { x: other.x, y: other.y + 1.2, z: other.z };
    const pitch = Math.atan2(chest.y - cam0.position.y, Math.hypot(chest.x - cam0.position.x, chest.z - cam0.position.z));
    // Iterate: the camera pitch also moves the camera; find the look pitch whose ray meets the chest.
    let look = { yaw: 0, pitch };
    for (let i = 0; i < 20; i++) {
      const cam = chaseCamera(me, 0, look.pitch);
      const want = Math.atan2(chest.y - cam.position.y, Math.hypot(chest.x - cam.position.x, chest.z - cam.position.z));
      const got = Math.atan2(cam.target.y - cam.position.y, Math.hypot(cam.target.x - cam.position.x, cam.target.z - cam.position.z));
      look = { yaw: 0, pitch: look.pitch + (want - got) };
    }
    const aim = convergeAim(me, look, other);
    expect(aim.hit).toBe('player');
    expect(eyeHits(me, aim, other)).toBe(true);
    expect(eyeHits(me, look, other)).toBe(false);
  });

  it('meets the floor when aiming down and max range when aiming at the sky', () => {
    expect(convergeAim(me, { yaw: 0, pitch: -0.5 }).hit).toBe('ground');
    const up = convergeAim({ x: 0, y: 0, z: 0 }, { yaw: 0, pitch: 0.6 });
    expect(['range', 'wall']).toContain(up.hit);
    expect(Math.hypot(up.point.x, up.point.z)).toBeLessThanOrEqual(Math.max(AIM_RANGE_M, TUNING.arenaRadius) + 1e-6);
  });

  it('ignores a dead opponent and anything between the camera and the player', () => {
    const behind = { x: 0, y: 0, z: 5, alive: true };
    expect(convergeAim(me, { yaw: 0, pitch: -0.05 }, behind).hit).not.toBe('player');
    const dead = { x: 0, y: 0, z: -20, alive: false };
    expect(convergeAim(me, { yaw: 0, pitch: -0.05 }, dead).hit).not.toBe('player');
  });

  it('view.js keeps exporting the same chase camera', () => {
    expect(viewChaseCamera).toBe(chaseCamera);
  });
});

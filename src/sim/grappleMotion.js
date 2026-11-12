// Both simulations use the same pull, speed cap, and release brake.
import { GAMEPLAY as G } from '../data/gameplay.js';

export function grappleSpeedScale(x, y, z, limit) {
  const speed = Math.hypot(x, y, z);
  return speed > limit ? limit / speed : 1;
}

/** Accelerate `vel` toward the hook. Returns 'arrive' when the pull should end. */
export function steerGrapple(vel, dx, dy, dz, dt) {
  const dist = Math.hypot(dx, dy, dz) || 1;
  if (dist < G.grappleArrive) return 'arrive';
  const pull = G.grapplePull * dt;
  vel.x += (dx / dist) * pull;
  vel.y += (dy / dist) * pull;
  vel.z += (dz / dist) * pull;
  const k = grappleSpeedScale(vel.x, vel.y, vel.z, G.grappleSpeed);
  vel.x *= k;
  vel.y *= k;
  vel.z *= k;
  return 'pull';
}

export function releaseGrappleSpeed(vel) {
  const k = grappleSpeedScale(vel.x, vel.y, vel.z, G.grappleReleaseSpeed);
  vel.x *= k;
  vel.y *= k;
  vel.z *= k;
}

// Both simulations use the same speed limits for the tether and for release.
export function grappleSpeedScale(x, y, z, limit) {
  const speed = Math.hypot(x, y, z);
  return speed > limit ? limit / speed : 1;
}

// Deterministic practice opponent. Inputs only. It never declares a winner.
import { yawTo } from '../../core/math.js';

export function practiceWish(tick, self, other) {
  const yaw = yawTo(
    { x: self.x, z: self.z },
    { x: other.x, z: other.z },
  );
  return {
    yaw,
    pitch: 0,
    moveX: 0,
    moveZ: tick % 120 < 90 ? 1 : 0,
    fire: tick % 24 < 10,
    zoom: true,
    sprint: false,
    jump: false,
    dash: false,
    reload: false,
    slot: 0,
  };
}

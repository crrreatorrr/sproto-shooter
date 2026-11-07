// Legacy 90 m circle used by Wave Mode, Sandbox and the Test Range.
// No colliders: the sim keeps the old clamp-to-circle math, reading `radius` from the runtime.
import { TUNING } from '../tuning.js';

const R = TUNING.arenaRadius;

export default {
  id: 'arena',
  name: 'Arena',
  stage: null,
  legacy: true,
  radius: R,
  tier: 1,
  parTime: 0,
  bounds: { min: [-R, -40, -R], max: [R, 80, R] },
  start: { pos: [0, 0, 8], yaw: 0, loadout: 'fresh' },
  jetpack: false,
  gravityMult: 1,
  geometry: [],
  props: [],
  volumes: [],
  mechanisms: [],
  weapons: [],
  checkpoints: [],
  encounters: [],
  spawners: [],
  navLinks: [],
  botRoute: [],
  cams: [],
};

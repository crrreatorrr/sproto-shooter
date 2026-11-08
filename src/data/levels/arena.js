import { TUNING } from '../tuning.js';

const R = TUNING.arenaRadius;

/** Legacy circle used by Wave Mode, Sandbox and the Test Range. No campaign colliders. */
export default {
  id: 'arena',
  name: 'Arena',
  stage: null,
  legacy: true,
  radius: R,
  tier: 1,
  parTime: 0,
  bounds: { min: [-R, -40, -R], max: [R, 80, R] },
  sections: [],
};

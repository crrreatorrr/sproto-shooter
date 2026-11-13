import { Color, Matrix4, PointLight, Vector3 } from 'three';

// Lenses use local Three.js coordinates. The existing instance transform includes placement yaw and scale.
const FIXTURES = {
  street_lamp: { lens: [0, 5.30, 1.2], color: 0xffce87, intensity: 29, range: 12 },
  lantern_post: { lens: [.77, 2.81, 0], color: 0xffac62, intensity: 18, range: 8 },
  grove_lantern: { lens: [.72, 2.22, 0], color: 0xffb969, intensity: 15, range: 7 },
  void_beacon: { lens: [0, 1.27, 0], color: 0xffc562, intensity: 8, range: 5 },
  frost_floodlight: { lens: [0, 2.29, .53], color: 0xffd286, intensity: 23, range: 10 },
  skyline_lamp: { lens: [0, 5.66, 1.09], color: 0xffc783, intensity: 36, range: 15 },
  skyline_canopy: { lens: [0, .02, 1.56], color: 0x62deff, intensity: 16, range: 9 },
  underworks_gantry: { lens: [0, 7.13, 0], color: 0xffb367, intensity: 65, range: 17 },
  underworks_roof: { lens: [1.1, .09, 6], color: 0xffb471, intensity: 58, range: 15 },
  underworks_furnace: { lens: [0, 2.10, 2.22], color: 0xff9b53, intensity: 64, range: 15 },
  underworks_reactor: { lens: [0, 4.10, 2.15], color: 0xff9660, intensity: 155, range: 21 },
  caldera_brazier: { lens: [0, 1.40, 0], color: 0xffa65a, intensity: 39, range: 12 },
  caldera_obelisk: { lens: [0, 1.85, .58], color: 0xff964b, intensity: 22, range: 9 },
  caldera_shrine: { lens: [0, 4.39, .28], color: 0xff9749, intensity: 138, range: 23 },
  caldera_vent: { lens: [0, .91, 0], color: 0x80ffe8, intensity: 24, range: 9 },
  moonlit_lantern: { lens: [-.035, 2.39, .18], color: 0x83ffee, intensity: 24, range: 12 },
  moonlit_sconce: { lens: [0, 1.19, .72], color: 0xca9aff, intensity: 32, range: 13 },
  moonlit_gate: { lens: [0, 5.64, .55], color: 0x7cf5ff, intensity: 132, range: 22 },
  office_soffit: { lens: [1.78, .09, 2.9], color: 0xb2ecff, intensity: 48, range: 16 },
  office_pilaster: { lens: [0, 2.95, .69], color: 0xffcc8d, intensity: 15, range: 10 },
  office_server: { lens: [0, 2.77, .95], color: 0x62d7ff, intensity: 34, range: 11 },
  office_fan: { lens: [0, 2.95, 1.42], color: 0xff6475, intensity: 20, range: 13 },
  office_parapet: { lens: [0, .77, 1.15], color: 0xff5d70, intensity: 6, range: 6 },
  frost_beacon: { lens: [0, 1.83, 0], color: 0xffc66c, intensity: 9, range: 6 },
};

const LIGHT_COUNT = 3;

export function createCampaignFixtureLights() {
  const fixtures = [];
  const nearest = new Array(LIGHT_COUNT);
  const distances = new Float64Array(LIGHT_COUNT);
  const lamps = Array.from({ length: LIGHT_COUNT }, () => {
    const light = new PointLight(0xffffff, 0, 1, 2);
    light.name = 'campaign-fixture-light';
    return light;
  });
  const matrix = new Matrix4();
  let lightLevel = '';

  function rebuild(group, level) {
    fixtures.length = 0;
    lightLevel = level || '';
    group.updateMatrixWorld(true);
    for (const obj of group.children) {
      const source = FIXTURES[obj.name];
      if (!source) continue;
      const count = obj.isInstancedMesh ? obj.count : 1;
      for (let i = 0; i < count; i++) {
        const at = new Vector3(...source.lens);
        if (obj.isInstancedMesh) {
          obj.getMatrixAt(i, matrix);
          at.applyMatrix4(matrix);
        }
        at.applyMatrix4(obj.matrixWorld);
        fixtures.push({ at, color: new Color(source.color), intensity: source.intensity, range: source.range });
      }
    }
    for (const light of lamps) {
      light.intensity = 0;
      // Reserve a fixed number in sections with fixtures, avoiding shader changes as the player moves.
      if (fixtures.length) group.add(light);
    }
  }

  function sync(pos, seconds) {
    if (!lightLevel || !pos) return;
    nearest.fill(null);
    distances.fill(Infinity);
    for (const f of fixtures) {
      const d = (pos.x - f.at.x) ** 2 + (pos.y - f.at.y) ** 2 + (pos.z - f.at.z) ** 2;
      if (d > f.range ** 2) continue;
      let k = distances.findIndex(best => d < best);
      if (k < 0) continue;
      for (let j = LIGHT_COUNT - 1; j > k; j--) {
        distances[j] = distances[j - 1];
        nearest[j] = nearest[j - 1];
      }
      distances[k] = d;
      nearest[k] = f;
    }
    for (let i = 0; i < LIGHT_COUNT; i++) {
      const lamp = lamps[i];
      const f = nearest[i];
      lamp.intensity = 0;
      if (!f) continue;
      lamp.position.copy(f.at);
      lamp.color.copy(f.color);
      lamp.distance = f.range;
      const fade = Math.max(0, 1 - distances[i] / (f.range ** 2));
      lamp.intensity = f.intensity * fade * (.97 + .03 * Math.sin(seconds * 2.4 + f.at.x));
    }
  }
  return { rebuild, sync };
}

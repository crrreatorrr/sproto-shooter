import * as THREE from 'three';
import { alarmCut, searchlightYaw } from '../../sim/campaign/alarms.js';

const lights = new WeakMap();
let geometry, material;

function lightMaterial() {
  if (material) return material;
  const size = 64;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const across = (x + .5) / size * 2 - 1;
    const along = 1 - (y + .5) / size;
    const i = (y * size + x) * 4;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = 255;
    const width = Math.max(0, 1 - across ** 4);
    const fade = Math.min(1, along * 13, (1 - along) * 7);
    pixels[i + 3] = Math.round(width * fade * 255);
  }
  const map = new THREE.DataTexture(pixels, size, size);
  map.minFilter = map.magFilter = THREE.LinearFilter;
  map.needsUpdate = true;
  material = new THREE.MeshBasicMaterial({
    map, color: 0xffce77, transparent: true, opacity: .31,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  return material;
}

export function mountFrostSearchlight(root, spec, ground) {
  const head = root.getObjectByName('frost_searchlight_head');
  const lens = head?.getObjectByName('frost_searchlight_lens');
  if (!lens) return;
  geometry ||= new THREE.PlaneGeometry(2, 1).rotateX(-Math.PI / 2).translate(0, 0, .5);
  const beam = new THREE.Mesh(geometry, lightMaterial());
  beam.position.y = ground - spec.at[1] + .045;
  beam.scale.set(spec.spot || 6, 1, spec.beam || 120);
  beam.name = 'searchlight-beam';
  root.add(beam);
  lights.set(root, { spec, head, lens, beam });
}

export function syncFrostSearchlight(root, lv) {
  const view = lights.get(root);
  if (!view) return;
  const { spec, head, lens, beam } = view;
  const enabled = !alarmCut(lv, spec.alarm) && (lv.alarmHp?.[spec.id]?.lamp ?? 1) > 0;
  const angle = searchlightYaw(spec, lv.time || 0) + Math.PI;
  head.rotation.y = angle;
  beam.rotation.y = angle;
  lens.visible = beam.visible = enabled;
}

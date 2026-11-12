import * as THREE from 'three';

const HALOS = {
  machine: ['generator_rotor', 0.25, 0x43ffc1, 1.46],
  grove_bloom: ['grove_bloom_crystal', 0.48, 0x68edff, 1.44],
  grove_totem: ['grove_totem_crystal', 0.66, 0x64e8ff, 1.84],
  campaign_shrine: ['shrine_focus', 0, 0x5affa3, 1.33],
  void_relay: ['void_relay_core', 0, 0x66efff, 1.3],
  void_pylon: ['void_pylon_core', 0, 0xffc66a, 2.6],
  void_halo: ['void_exchange_rotor', -1.45, 0xffba4a, 5.4],
};

const active = new WeakMap();
const haloMaterials = new Map();
let haloTexture;

function getHalo(color) {
  if (haloMaterials.has(color)) return haloMaterials.get(color);
  if (!haloTexture) {
    const size = 32;
    const pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const r = Math.hypot((x + .5) / size - .5, (y + .5) / size - .5) * 2;
      const i = (y * size + x) * 4;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = 255;
      pixels[i + 3] = Math.round(Math.max(0, 1 - r) ** 2.35 * 255);
    }
    haloTexture = new THREE.DataTexture(pixels, size, size);
    haloTexture.magFilter = THREE.LinearFilter;
    haloTexture.minFilter = THREE.LinearFilter;
    haloTexture.needsUpdate = true;
  }
  const material = new THREE.SpriteMaterial({
    map: haloTexture, color, transparent: true, opacity: 0.35,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  haloMaterials.set(color, material);
  return material;
}

export function createKitObject(kit, material, phase = 0) {
  if (!kit.motion) {
    const mesh = new THREE.Mesh(kit.geometry, material);
    mesh.name = kit.name;
    return mesh;
  }
  const { scene, clip } = kit.motion;
  const model = scene.clone();
  const root = new THREE.Group();
  root.name = kit.name;
  root.add(model);
  model.traverse((child) => {
    if (child.isMesh) child.castShadow = child.receiveShadow = true;
  });
  const halo = HALOS[kit.name];
  if (halo) {
    const [name, y, color, size] = halo;
    const source = model.getObjectByName(name);
    if (source) {
      const sprite = new THREE.Sprite(getHalo(color));
      sprite.position.y = y;
      sprite.scale.set(size, size, 1);
      source.add(sprite);
    }
  }
  const mixer = new THREE.AnimationMixer(model);
  mixer.clipAction(clip).play();
  active.set(root, { mixer, duration: clip.duration, phase, time: null });
  return root;
}

export function updateKitMotion(root, seconds) {
  const action = active.get(root);
  if (!action || action.time === seconds) return;
  action.mixer.setTime((seconds + action.phase) % action.duration);
  action.time = seconds;
}

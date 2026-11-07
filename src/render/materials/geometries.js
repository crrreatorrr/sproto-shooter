// @ts-check
import * as THREE from 'three';

export const ELEM_COL = { none: 0xffe9a8, fire: 0xff7a1a, shock: 0x4fe3ff, goo: 0x9be33b };

export function createMaterials() {
  const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, ...extra });
  const E = (color, intensity = 1) => new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: intensity < 1, opacity: intensity });
  const G = {
    sphere: new THREE.SphereGeometry(1, 16, 12),
    sphereLo: new THREE.SphereGeometry(1, 8, 6),
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
    capsule: new THREE.CapsuleGeometry(1, 1, 6, 12),
    cone: new THREE.ConeGeometry(1, 1, 10),
    torus: new THREE.TorusGeometry(1, 0.06, 6, 48),
    ring: new THREE.RingGeometry(0.85, 1, 48),
    disc: new THREE.CircleGeometry(1, 24),
    plane: new THREE.PlaneGeometry(1, 1),
  };
  const MAT = {
    white: M(0xffffff), black: M(0x111111, { roughness: 0.3 }), eyeWhite: M(0xffffff, { roughness: 0.2 }),
    weak: E(0xffee55), shield: M(0x9fb4ff, { metalness: 0.6, roughness: 0.3, transparent: true, opacity: 0.85 }),
    flash: E(0xffffff), blob: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
    crown: M(0xffd700, { metalness: 0.8, roughness: 0.2, emissive: 0x553300 }),
  };
  return { M, E, G, MAT };
}

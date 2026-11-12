import * as THREE from 'three';

export const grovePaneMaterial = new THREE.MeshStandardMaterial({
  color: 0xffce83, vertexColors: true, transparent: true, opacity: .24,
  roughness: .57, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true,
});

const GROUND = { grass: 0x798b40, dirt: 0x98684b, creekBed: 0x4c6d61 };

export function groveMaterial(name, cache, levelMaterial) {
  const key = `grove:${name}`;
  if (cache.has(key)) return cache.get(key);
  if (name === 'glass') {
    const glass = new THREE.MeshStandardMaterial({
      color: 0xffc16d, emissive: 0x5d2f19, emissiveIntensity: .3,
      transparent: true, opacity: .23, roughness: .62, depthWrite: false, side: THREE.DoubleSide,
    });
    cache.set(key, glass);
    return glass;
  }
  if (!(name in GROUND)) return levelMaterial(name, cache);

  const mat = levelMaterial(key, cache, GROUND[name]);
  // Two scales of soft colour variation keep the large, flat collision slabs readable.
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 groveXZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ngroveXZ = position.xz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec2 groveXZ;
      float groveHash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float groveNoise(vec2 p) {
        vec2 i = floor(p), f = smoothstep(0., 1., fract(p));
        return mix(mix(groveHash(i), groveHash(i + vec2(1., 0.)), f.x),
          mix(groveHash(i + vec2(0., 1.)), groveHash(i + vec2(1.)), f.x), f.y);
      }
    `).replace('#include <color_fragment>', `#include <color_fragment>
      float grain = groveNoise(groveXZ * .71) * .22 + groveNoise(groveXZ * .11) * .40;
      diffuseColor.rgb *= vec3(.72 + grain, .69 + grain, .65 + grain);
    `);
  };
  return mat;
}

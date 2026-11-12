import * as THREE from 'three';

export function createBlockchainSky() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, toneMapped: false,
    vertexShader: `
      varying vec3 skyDirection;
      void main() {
        skyDirection = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }
    `,
    fragmentShader: `
      varying vec3 skyDirection;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float stars(vec2 p, float density) {
        vec2 cell = floor(p);
        float r = hash(cell);
        vec2 jitter = vec2(hash(cell + 23.1), hash(cell - 12.4));
        vec2 center = .2 + .6 * jitter;
        float disk = 1. - smoothstep(.03, .088, length(fract(p) - center));
        return disk * step(density, r) * (.18 + .82 * hash(cell + 7.9));
      }

      float curtain(float azimuth, float elevation, float height, float phase) {
        float fold = sin(azimuth * 2. + phase) * .11 + sin(azimuth * 5. - phase) * .064;
        float edge = height + fold + .032 * sin(azimuth * 11. + phase);
        float band = exp(-abs(elevation - edge) * 28.);
        float folds = .57 + .28 * sin(azimuth * 38. + sin(azimuth * 12.) * 1.3)
                         + .15 * sin(azimuth * 75. + phase);
        float trail = exp(-abs(elevation - edge - .044) * 16.) * folds;
        return (band * .46 + trail * .56) * smoothstep(-.9, .45, sin(azimuth * 3. + phase));
      }

      void main() {
        vec3 d = normalize(skyDirection);
        float az = atan(d.z, d.x);
        float el = asin(d.y);
        vec2 p = vec2(az * 44., el * 56.);
        float dust = stars(p, .88) * .74 + stars(p * .44 + 3.1, .93) * .61;
        vec3 col = vec3(.027, .015, .065);
        col += vec3(.105, .039, .145) * exp(-abs(el + .22) * 4.1);
        col += vec3(.64, .74, 1.) * dust;
        col += vec3(.26, .83, .26) * curtain(az, el, .36, 1.6) * .78;
        col += vec3(.74, .095, .55) * curtain(az, el, .21, .2) * .83;
        gl_FragColor = vec4(col, 1.);
      }
    `,
  });
}

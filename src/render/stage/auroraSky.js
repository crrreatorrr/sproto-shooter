import * as THREE from 'three';

export function createAuroraSky(polar = false) {
  return new THREE.ShaderMaterial({
    uniforms: {
      polar: { value: polar ? 1 : 0 }, whiteout: { value: 0 },
      panorama: { value: null }, panoramaReady: { value: 0 }, panoramaYaw: { value: 0 },
    },
    side: THREE.BackSide, depthWrite: false, toneMapped: false,
    vertexShader: `
      varying vec3 skyDirection;
      varying vec2 skyUV;
      void main() {
        skyDirection = position;
        skyUV = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }
    `,
    fragmentShader: `
      uniform float polar;
      uniform float whiteout;
      uniform sampler2D panorama;
      uniform float panoramaReady;
      uniform float panoramaYaw;
      varying vec3 skyDirection;
      varying vec2 skyUV;

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
        vec3 col = mix(vec3(.027, .015, .065), vec3(.025, .057, .115), polar);
        col += mix(vec3(.105, .039, .145), vec3(.076, .135, .224), polar)
          * exp(-abs(el + .22) * 4.1);
        col += vec3(.64, .74, 1.) * dust;
        col += mix(vec3(.26, .83, .26), vec3(.08, .49, .34), polar) * curtain(az, el, .36, 1.6) * .78;
        col += mix(vec3(.74, .095, .55), vec3(.10, .27, .41), polar) * curtain(az, el, .21, .2) * .83;
        float moon = 1. - smoothstep(.00030, .00047, 1. - dot(d, normalize(vec3(-.38, .44, -.80))));
        col += vec3(.70, .82, .96) * polar * moon;
        if (panoramaReady > .5) {
          vec3 mountainSky = texture2D(panorama, vec2(skyUV.x + panoramaYaw, skyUV.y - .045)).rgb;
          col = sRGBTransferOETF(vec4(mountainSky, 1.)).rgb;
          col += vec3(.04, .14, .11) * curtain(az, el, .42, .9) * .36;
        }
        vec3 storm = mix(vec3(.58, .65, .72), vec3(.76, .81, .86), smoothstep(-.6, .8, d.y));
        gl_FragColor = vec4(mix(col, storm, whiteout), 1.);
      }
    `,
  });
}

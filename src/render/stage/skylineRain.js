import { BufferAttribute, BufferGeometry, LineSegments, ShaderMaterial, Vector3 } from 'three';

// One depth-tested draw call. The volume follows the eye and wraps vertically above the street.
export function createSkylineRain() {
  const count = 720;
  const positions = new Float32Array(count * 6);
  const tail = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const seed = [(i * .618034) % 1, (i * .754878) % 1, (i * .569841) % 1];
    positions.set(seed, i * 6);
    positions.set(seed, i * 6 + 3);
    tail[i * 2 + 1] = 1;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('tail', new BufferAttribute(tail, 1));
  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { eye: { value: new Vector3() }, time: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float tail;
      uniform vec3 eye;
      uniform float time;
      varying float strength;
      void main() {
        float rate = (19. + floor(position.x * 9.)) / 120.;
        float y = fract(position.y - time * rate) * 22.;
        vec2 cell = mod(position.xz * 42. - eye.xz + 21., 42.) - 21.;
        vec3 p = vec3(eye.x + cell.x, y, eye.z + cell.y);
        float streak = .19 + .24 * position.z;
        p += vec3(-.064, streak, .026) * tail;
        float d = distance(p, eye);
        strength = smoothstep(1.6, 4.5, d) * (1. - smoothstep(12., 23., d))
          * smoothstep(.2, .8, y) * (1. - smoothstep(20.5, 22., y)) * (1. - .84 * tail);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float strength;
      void main() {
        gl_FragColor = vec4(.44, .62, .87, strength * .33);
        #include <colorspace_fragment>
      }
    `,
  });
  const rain = new LineSegments(geometry, material);
  rain.name = 'skyline-rain';
  rain.frustumCulled = false;
  rain.visible = false;
  return rain;
}

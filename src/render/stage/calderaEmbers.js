import { BufferAttribute, BufferGeometry, Points, ShaderMaterial } from 'three';

// Keep the eruption on one depth-tested draw call with no additional mesh triangles.
export function createCalderaEmbers() {
  const positions = new Float32Array(240 * 3);
  for (let i = 0; i < positions.length / 3; i++) {
    positions.set([(i * .618034) % 1, (i * .754878) % 1, (i * .569841) % 1], i * 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { time: { value: 0 }, start: { value: 0 } },
    vertexShader: /* glsl */ `
      uniform float time;
      uniform float start;
      varying float heat;
      varying float fade;
      void main() {
        float rise = fract(position.y + time * (4. + floor(position.z * 5.)) / 120.);
        float x = start - 6. + fract(position.x + time * 2. / 120.) * 61.;
        float z = position.z * 32. - 5. + sin(rise * 5. + position.x * 38.) * .82;
        vec4 view = viewMatrix * vec4(x, -.4 + rise * 15., z, 1.);
        float depth = -view.z;
        heat = position.x;
        fade = smoothstep(2., 5., depth) * (1. - smoothstep(26., 52., depth))
          * smoothstep(0., .14, rise) * (1. - smoothstep(.66, 1., rise));
        gl_PointSize = clamp((30. + position.x * 39.) / max(depth, 1.), 1., 5.);
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float heat;
      varying float fade;
      void main() {
        float edge = 1. - smoothstep(.15, .5, length(gl_PointCoord - .5));
        gl_FragColor = vec4(mix(vec3(.45, .15, .11), vec3(1., .55, .16), heat), edge * fade * .80);
        #include <colorspace_fragment>
      }
    `,
  });
  const embers = new Points(geometry, material);
  embers.name = 'caldera-embers';
  embers.frustumCulled = false;
  embers.visible = false;
  return embers;
}

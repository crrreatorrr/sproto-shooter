import { MeshBasicMaterial } from 'three';

const seconds = { value: 0 };
const materials = new Map();

export function updateUnderworksMagma(time) {
  seconds.value = time % 120;
}

export function underworksMagmaMaterial(falls) {
  if (materials.has(falls)) return materials.get(falls);
  const magma = new MeshBasicMaterial({ color: 0xff892f });
  magma.name = falls ? 'Underworks lavafall' : 'Underworks magma';
  magma.defines = falls ? { UNDERWORKS_LAVAFALL: 1 } : {};
  magma.onBeforeCompile = (shader) => {
    shader.uniforms.underworksMagmaTime = seconds;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vMagma;
        varying vec3 vMagmaLocal;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 magmaPoint = vec4(transformed, 1.);
        #ifdef USE_INSTANCING
          magmaPoint = instanceMatrix * magmaPoint;
        #endif
        vMagma = (modelMatrix * magmaPoint).xyz;
        vMagmaLocal = position;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float underworksMagmaTime;
        varying vec3 vMagma;
        varying vec3 vMagmaLocal;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float t = underworksMagmaTime * 6.2831853 / 120.;
        #ifdef UNDERWORKS_LAVAFALL
          float x = vMagmaLocal.x * 11.;
          float y = vMagma.y;
          float strand = .5 + .5 * sin(x + .27 * sin(y * .6 + t * 17.));
          float slide = .5 + .5 * sin(y * 2.15 + t * 37. + sin(x * .71));
          diffuseColor.rgb = mix(vec3(.79, .09, .009), vec3(1., .45, .033), strand * (.56 + .44 * slide));
        #else
          vec2 p = vMagma.xz * vec2(1.09, 1.72);
          float phase = p.x + sin(p.y * .87 + t * 11.) * .66 + sin(p.x * .41 - p.y * .91 + t * 23.) * .84;
          float plates = sin(phase - t * 15.) * sin(p.y + sin(p.x * .81 + t * 12.) * .91);
          float glow = 1. - smoothstep(.018, .30 + fwidth(plates), abs(plates));
          float tint = .5 + .5 * sin(phase * 1.5 + t * 7.);
          diffuseColor.rgb = mix(vec3(.35, .024, .010), vec3(.82, .13, .021), tint);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1., .51, .083), glow * .84);
          if (vMagma.y > 0.) {
            float edge = max(abs(vMagmaLocal.x), abs(vMagmaLocal.z));
            float band = step(.86, edge);
            float stripe = step(.47, fract((vMagma.x + vMagma.z) * 2.6));
            diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(.08, .045, .051), vec3(.68, .36, .064), stripe), band);
          }
        #endif`);
  };
  materials.set(falls, magma);
  return magma;
}

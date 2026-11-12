import { MeshStandardMaterial } from 'three';

let material;
export function voidMaterial() {
  if (material) return material;
  material = new MeshStandardMaterial({ vertexColors: true, roughness: .78, metalness: .09 });
  // Saturated glass cores, route strips and status lights contribute their own light.
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
      #include <emissivemap_fragment>
      vec3 tint = vColor.rgb;
      float peak = max(max(tint.r, tint.g), tint.b);
      float floorValue = min(min(tint.r, tint.g), tint.b);
      float signal = smoothstep(.24, .76, peak) * smoothstep(.14, .51, peak - floorValue);
      totalEmissiveRadiance += tint * signal * .36;
    `);
  };
  return material;
}

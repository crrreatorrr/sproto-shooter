import * as THREE from 'three';
import { TUNING } from '../../data/tuning.js';
import { graphicsPixelRatio, normalizeGraphicsPreset } from '../graphicsPresets.js';

export function createRenderContext(container, initialPreset = 'high') {
  let preset = normalizeGraphicsPreset(initialPreset);
  const initialWidth = Math.max(1, container.clientWidth), initialHeight = Math.max(1, container.clientHeight);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.info.autoReset = false;
  renderer.setPixelRatio(graphicsPixelRatio(preset, initialWidth, initialHeight, window.devicePixelRatio));
  renderer.setSize(initialWidth, initialHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // One timer query in flight. The result lands a frame or two later; disjoint results are dropped.
  const gl = /** @type {WebGL2RenderingContext} */ (renderer.getContext());
  const timerExt = /** @type {any} */ (gl.getExtension('EXT_disjoint_timer_query_webgl2'));
  /** @type {{ q: WebGLQuery, open: boolean }[]} */
  const gpuQueue = [];
  let gpuMs = /** @type {number | null} */ (null);
  function beginGpu() {
    if (!timerExt || gpuQueue.some((q) => q.open)) return;
    if (gl.getParameter(timerExt.GPU_DISJOINT_EXT)) return;
    const q = gl.createQuery();
    if (!q) return;
    gl.beginQuery(timerExt.TIME_ELAPSED_EXT, q);
    gpuQueue.push({ q, open: true });
  }
  function endGpu() {
    const top = gpuQueue[gpuQueue.length - 1];
    if (!timerExt || !top || !top.open) return;
    gl.endQuery(timerExt.TIME_ELAPSED_EXT);
    top.open = false;
  }
  function pollGpu() {
    if (!timerExt) return;
    const disjoint = gl.getParameter(timerExt.GPU_DISJOINT_EXT);
    while (gpuQueue.length && !gpuQueue[0].open && gl.getQueryParameter(gpuQueue[0].q, gl.QUERY_RESULT_AVAILABLE)) {
      const item = gpuQueue.shift();
      if (item && !disjoint) gpuMs = gl.getQueryParameter(item.q, gl.QUERY_RESULT) / 1e6;
      if (item) gl.deleteQuery(item.q);
    }
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a1b4a);
  scene.fog = new THREE.Fog(0x2a1b4a, 40, 110);
  const camera = new THREE.PerspectiveCamera(TUNING.fovBase, initialWidth / initialHeight, 0.05, 300);
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  const hemi = new THREE.HemisphereLight(0xffe6ff, 0x3a2a55, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d6, 1.4);
  sun.position.set(20, 40, 10);
  scene.add(sun);
  const bounce = new THREE.DirectionalLight(0xff7a3a, 0.4);
  bounce.position.set(0, 4, 40);
  scene.add(bounce);
  // the first-person gun is drawn on its own layer in a second, depth-cleared pass (never clips into walls)
  const VM_LAYER = 1;
  for (const l of [hemi, sun, bounce]) l.layers.enable(VM_LAYER);
  const _v = new THREE.Vector3();
  function project(pos) {
    _v.set(pos.x, pos.y, pos.z).project(camera);
    return { x: (_v.x * 0.5 + 0.5) * renderer.domElement.clientWidth, y: (-_v.y * 0.5 + 0.5) * renderer.domElement.clientHeight, behind: _v.z > 1 };
  }

  let lastWidth = initialWidth, lastHeight = initialHeight, lastRatio = renderer.getPixelRatio();
  function resize() {
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    const ratio = graphicsPixelRatio(preset, w, h, window.devicePixelRatio);
    if (w === lastWidth && h === lastHeight && ratio === lastRatio) return;
    lastWidth = w; lastHeight = h; lastRatio = ratio;
    if (renderer.getPixelRatio() !== ratio) renderer.setPixelRatio(ratio);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  return {
    renderer, scene, camera, hemi, sun, bounce, VM_LAYER, beginGpu, endGpu, pollGpu,
    takeGpuMs: () => gpuMs, project, resize, canvas: renderer.domElement,
    setGraphicsPreset(value) { preset = normalizeGraphicsPreset(value); resize(); },
    info: () => renderer.info,
    counts() {
      const info = renderer.info;
      return {
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        programs: info.programs.length,
        textures: info.memory.textures,
        geometries: info.memory.geometries,
      };
    },
    renderScale() {
      const dpr = window.devicePixelRatio || 1;
      return renderer.getPixelRatio() / dpr;
    },
  };
}

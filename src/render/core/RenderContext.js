// @ts-check
import * as THREE from 'three';
import { TUNING } from '../../data/tuning.js';

/** WebGLRenderer, scene, camera, resize, and the once-per-frame info reset. */
export function createRenderContext(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.info.autoReset = false;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

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
  const camera = new THREE.PerspectiveCamera(TUNING.fovBase, container.clientWidth / Math.max(1, container.clientHeight), 0.05, 300);
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  const _v = new THREE.Vector3();
  function project(pos) {
    _v.set(pos.x, pos.y, pos.z).project(camera);
    return {
      x: (_v.x * 0.5 + 0.5) * renderer.domElement.clientWidth,
      y: (-_v.y * 0.5 + 0.5) * renderer.domElement.clientHeight,
      behind: _v.z > 1,
    };
  }
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  return {
    renderer, scene, camera, canvas: renderer.domElement, project, resize,
    beginFrame() { renderer.info.reset(); pollGpu(); beginGpu(); },
    endFrame() { renderer.render(scene, camera); endGpu(); },
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
    takeGpuMs() { return gpuMs; },
    info: () => renderer.info,
  };
}

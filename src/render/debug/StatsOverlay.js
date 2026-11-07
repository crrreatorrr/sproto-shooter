// @ts-check
// Fixed 260×120 canvas. Drawing is skipped while hidden so the per-frame cost stays under 0.05 ms.
import { drawFrameGraph } from './FrameGraph.js';

const W = 260;
const H = 120;

/**
 * @param {ParentNode} parent
 */
export function createStatsOverlay(parent) {
  const canvas = document.createElement('canvas');
  canvas.id = 'stats-overlay';
  canvas.width = W;
  canvas.height = H;
  canvas.hidden = true;
  parent.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('stats overlay canvas has no 2d context');

  return {
    setVisible(/** @type {boolean} */ on) { canvas.hidden = !on; },
    get visible() { return !canvas.hidden; },
    /**
     * @param {{
     *   fps: number, p95: number, frameMs: number,
     *   simMs: number, renderMs: number, hudMs: number, gpu: string,
     *   calls: number, tris: number, programs: number,
     *   geometries: number, textures: number, renderScale: number,
     *   enemies: number, projectiles: number, particles: number, pending: number,
     *   heap: string, gpuMB: string,
     *   graph: { simMs: number, renderCpuMs: number, hudMs: number }[],
     * }} view
     */
    draw(view) {
      if (canvas.hidden) return;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(8, 6, 16, 0.78)';
      ctx.fillRect(0, 0, W, H);
      drawFrameGraph(ctx, 4, 4, W - 8, 34, view.graph);
      ctx.fillStyle = '#fff7ec';
      ctx.font = '10px sans-serif';
      const lines = [
        `${view.fps.toFixed(0)} fps   p95 ${view.p95.toFixed(1)} ms   frame ${view.frameMs.toFixed(1)}`,
        `sim ${view.simMs.toFixed(2)}   render ${view.renderMs.toFixed(2)}   hud ${view.hudMs.toFixed(2)}   gpu ${view.gpu}`,
        `calls ${view.calls}   tris ${fmt(view.tris)}   prog ${view.programs}`,
        `geo ${view.geometries}   tex ${view.textures}   scale ${view.renderScale.toFixed(2)}`,
        `en ${view.enemies}   proj ${view.projectiles}   fx ${view.particles}   dl ${view.pending}`,
        `heap ${view.heap}   gpuMB ${view.gpuMB}`,
      ];
      for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], 6, 50 + i * 11);
    },
  };
}

function fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return String(n);
}

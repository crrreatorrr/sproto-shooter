// @ts-check
// Stacked sim / render / hud bars. The pink line is the 16.7 ms frame budget.

const BUDGET_MS = 16.7;
const SCALE_MS = 33.4;

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {{ simMs: number, renderCpuMs: number, hudMs: number }[]} samples oldest → newest
 */
export function drawFrameGraph(ctx, x, y, w, h, samples) {
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(x, y, w, h);
  if (!samples.length) return;
  const barW = w / samples.length;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    let top = y + h;
    const band = (ms, color) => {
      const bh = Math.max(0, Math.min(h, (ms / SCALE_MS) * h));
      top -= bh;
      ctx.fillStyle = color;
      ctx.fillRect(x + i * barW, top, Math.max(1, barW - 0.35), bh);
    };
    band(s.simMs, '#7fe36a');
    band(s.renderCpuMs, '#5ad7ff');
    band(s.hudMs, '#ffd166');
  }
  const yLine = y + h - (BUDGET_MS / SCALE_MS) * h;
  ctx.strokeStyle = 'rgba(255,94,196,0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, yLine);
  ctx.lineTo(x + w, yLine);
  ctx.stroke();
}

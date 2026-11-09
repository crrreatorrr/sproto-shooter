// Dev net graph for the free arena (SHOOTER-S3). Only in dev builds or with ?netgraph=1
// (?netgraph=0 turns it off in dev). It reads client.netGraph(); it never changes the match.

/** Whether to show the graph. `dev` is import.meta.env.DEV; `search` is location.search. */
export function netGraphEnabled(dev, search = '') {
  let flag = null;
  try { flag = new URLSearchParams(search || '').get('netgraph'); } catch { flag = null; }
  if (flag === '0') return false;
  return flag === '1' || !!dev;
}

function num(value, digits = 0, unit = '') {
  return value == null || !Number.isFinite(value) ? '—' : `${value.toFixed(digits)}${unit}`;
}

/** The graph's lines, from client.netGraph(). */
export function formatNetGraph(g) {
  if (!g) return ['net —'];
  return [
    `RTT ${num(g.rttMs, 0, ' ms')} (server ${num(g.serverRttMs, 0)})  jitter p95 ${num(g.jitterMs, 0, ' ms')}`,
    `buffer ${num(g.buffer)}  late ${num(g.latePct, 1, '%')}  lead ${num(g.lead)} (${num(g.leadNow, 2)})  clock ×${num(g.clockRate, 3)}`,
    `correction p50 ${num(g.correctionP50Cm, 1)} / p99 ${num(g.correctionP99Cm, 1)} cm`,
    `interp D ${num(g.interpMs, 0, ' ms')} → ${num(g.interpTargetMs, 0)}  rewind ${num(g.rewindMs, 0, ' ms')} (cap ${num(g.rewindCapMs, 0)})`,
    `starved ${num(g.starvedPct, 1, '%')}`,
  ];
}

const STYLE = 'position:absolute;right:8px;top:8px;z-index:3;pointer-events:none;padding:6px 8px;'
  + 'background:rgba(8,4,16,.78);color:#9ff5c8;font:11px/1.35 ui-monospace,Menlo,Consolas,monospace;'
  + 'border-radius:6px;white-space:pre';

export function createNetGraph(parent) {
  const el = document.createElement('div');
  el.dataset.pvpNetgraph = '1';
  el.style.cssText = STYLE;
  parent.appendChild(el);
  let last = '';
  return {
    update(graph) {
      const text = formatNetGraph(graph).join('\n');
      if (text !== last) {
        el.textContent = text;
        last = text;
      }
    },
    dispose() { el.remove(); },
  };
}

// @ts-check
// NOW before LATER. Prefetch never competes with something the current level needs.

export const NOW = 0;
export const LATER = 1;
export const PRIORITY = { NOW, LATER };
const MAX_PARALLEL = 4;

/** @type {{ path: string, start: () => Promise<any>, prio: number, resolve: (v: any) => void }[]} */
const queue = [];
let active = 0, activeNow = 0;
const requested = new Set();

export function schedule(path, start, prio) {
  requested.add(path);
  return new Promise((resolve) => { queue.push({ path, start, prio, resolve }); pump(); });
}
function pump() {
  while (active < MAX_PARALLEL && queue.length) {
    queue.sort((a, b) => a.prio - b.prio);
    if (queue[0].prio === LATER && activeNow > 0) break;
    const job = queue.shift();
    if (!job) break;
    const urgent = job.prio === NOW;
    active++; if (urgent) activeNow++;
    job.start().then(job.resolve, job.resolve).finally(() => { active--; if (urgent) activeNow--; pump(); });
  }
}
export function promote(path) { for (const q of queue) if (q.path === path) q.prio = NOW; pump(); }
/** Downloads waiting or in flight (for the HUD's loading hint). */
export const pendingDownloads = () => queue.length + active;
export const requestedPaths = () => [...requested];

// First-person rig lab: measure how much of the soldier's arms and body end up inside the held gun.
// Usage, with the dev server running (`npm run dev`, then open /?mode=sandbox), in the devtools console:
//   const lab = await import('/dev/fpLab.js'); await lab.setup();
//   await lab.matrix()            // every gun: hip, aim (F) and a reload sweep → penetrating vertices per body part
//   await lab.pose(0, 'reload', 0.4); lab.side()   // freeze a pose, look at it from an outside camera
//   lab.fpv()                     // back to the first-person view
// Counts are skinned vertices strictly inside the gun mesh (voxel parity test), grouped by side (L/R/B = body)
// and part; vertices hidden by the first-person clip planes are skipped. "clean" = nothing inside.
const game = () => window.__game;
const R = () => game().renderer;
const player = () => game().state.players[game().state.localPlayerId];

let THREE, FP, buildCollider, collectTriangles;
export async function setup({ guns = ['mg', 'shotgun', 'sniper', 'bazooka'] } = {}) {
  THREE = R().THREE;
  FP = R().firstPerson.debug().FP; // the live tunables (a fresh import would be a different module instance after edits)
  ({ buildCollider, collectTriangles } = await import('/src/render/gunCollider.js'));
  const p = player();
  const have = () => p.guns.map((g) => g && g.type);
  for (const t of guns) if (!have().includes(t)) game().queue({ type: 'debug', op: 'spawnGun', args: { type: t, quality: 'common', element: 'none' } });
  pump(20);
  for (const k of game().state.pickups.filter((k) => k.gun && guns.includes(k.gun.type) && !have().includes(k.gun.type))) game().queue({ type: 'pickupGun', pickupId: k.id });
  pump(20);
  // render-time override: freeze slot / aim / reload progress regardless of input (pointer lock is not needed)
  if (!R().__labWrapped) {
    const orig = R().render;
    R().render = function (state, alpha, look, opts) {
      const f = window.__labForce;
      if (f) {
        const pl = state.players[state.localPlayerId];
        pl.activeSlot = f.slot; pl.zooming = f.mode === 'aim'; pl.reloadT = f.mode === 'reload' ? f.total * (1 - f.t) : 0;
        look = { ...look, pitch: 0 };
      }
      return orig.call(this, state, alpha, look, opts);
    };
    R().__labWrapped = true;
  }
  // gun models load asynchronously on first equip: hold each slot until its real model (not the box) is in hand
  for (let slot = 0; slot < p.guns.length; slot++) {
    if (!p.guns[slot]) continue;
    window.__labForce = { slot, mode: 'hip', t: 0, total: 2 };
    for (let i = 0; i < 60; i++) { pump(2); const g = gunMesh(); if (g && g.userData.model) break; await sleep(200); }
  }
  window.__labForce = null;
  return have();
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Advance the game `n` frames synchronously on a simulated 60 Hz clock (works while the tab is hidden and
 * requestAnimationFrame is paused).
 */
// Time warp: performance.now (and the timestamps requestAnimationFrame hands the game) = real time + offset.
// pump() adds 1/60 s to the offset per simulated frame, so the clock every system sees only moves forward,
// whether a frame comes from pump() or from the browser.
let offset = 0, warped = false;
function warp() {
  if (warped) return;
  warped = true;
  const realNow = performance.now.bind(performance), realRaf = window.requestAnimationFrame.bind(window);
  performance.now = () => realNow() + offset;
  window.requestAnimationFrame = (cb) => (window.__labNoRaf ? 0 : realRaf(() => cb(performance.now())));
  // the loop's already-scheduled frame still carries a real timestamp: read the warped clock instead
  const g = game(), frame = g.frame.bind(g);
  g.frame = () => frame(performance.now());
}
export function pump(n = 60) {
  warp();
  window.__labNoRaf = true; // frame() re-schedules itself; don't stack extra loops
  try {
    for (let i = 0; i < n; i++) { offset += 1000 / 60; game().frame(performance.now()); }
  } finally { window.__labNoRaf = false; }
}

/** Hold slot `slot` in mode 'hip' | 'aim' | 'reload' (at progress t, 0..1) and let the springs settle. */
export async function pose(slot, mode, t = 0.45, total = 2) {
  if (mode === 'reload') game().bus.emit({ type: 'reloadStart', time: total });
  window.__labForce = { slot, mode, t, total };
  pump(60);
  return { slot, type: player().guns[slot].type, mode, t };
}
export function release() { window.__labForce = null; }

export function gunMesh() {
  let g = null;
  R().camera.traverse((o) => { if (!g && o.userData && o.userData.gunId != null) g = o; });
  return g;
}

/** Outside camera at `off` (camera space) looking at `look`. */
export function side(off = [1.4, 0.05, -0.3], look = [0.05, -0.22, -0.35], fov = 40) {
  const cam = R().camera;
  const dc = new THREE.PerspectiveCamera(fov, cam.aspect, 0.01, 50);
  cam.updateMatrixWorld(true);
  dc.position.copy(cam.localToWorld(new THREE.Vector3(...off)));
  dc.lookAt(cam.localToWorld(new THREE.Vector3(...look)));
  dc.updateMatrixWorld(true);
  window.__debugCam = dc;
}
export function fpv() { window.__debugCam = null; }

const colliders = new Map();
let skin = null;
function skinInfo() {
  if (skin) return skin;
  let sm;
  R().firstPerson.root.traverse((o) => { if (o.isSkinnedMesh) sm = o; });
  const si = sm.geometry.attributes.skinIndex, sw = sm.geometry.attributes.skinWeight, bones = sm.skeleton.bones;
  const n = sm.geometry.attributes.position.count;
  const part = new Array(n), side = new Array(n);
  for (let i = 0; i < n; i++) {
    let best = 0, bi = 0;
    for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > best) { best = w; bi = si.getComponent(i, k); } }
    const nm = bones[bi].name.replace(/^mixamorig:?/, '');
    side[i] = /^Left/.test(nm) ? 'L' : /^Right/.test(nm) ? 'R' : 'B';
    part[i] = /Hand(Index|Middle|Ring|Pinky|Thumb)/.test(nm) ? 'fingers' : /Hand$/.test(nm) ? 'hand' : /ForeArm/.test(nm) ? 'fore' : /Arm$/.test(nm) ? 'arm' : /Shoulder/.test(nm) ? 'shoulder' : 'body';
  }
  return (skin = { sm, part, side });
}

/**
 * Penetration of the current frame: { in: { L, R, B: { part: count } }, vis: same but only vertices inside the
 * viewmodel camera's frustum (base FOV), i.e. ones a player could see, deep: visible ones more than 1 cm inside
 * (shallower is skin pressed against the gun) }.
 */
export function measure() {
  const gun = gunMesh(), cam = R().camera;
  const key = gun.userData.type + ':' + gun.userData.gunId;
  if (!colliders.has(key)) colliders.set(key, buildCollider(collectTriangles(gun), { cell: 0.004, pad: 0.02 }));
  const col = colliders.get(key);
  gun.updateMatrixWorld(true); cam.updateMatrixWorld(true);
  const inv = gun.matrixWorld.clone().invert(), camInv = cam.matrixWorld.clone().invert();
  const { sm, part, side } = skinInfo();
  const v = new THREE.Vector3(), w = new THREE.Vector3();
  const res = { L: {}, R: {}, B: {} }, vis = { L: {}, R: {}, B: {} }, deep = { L: {}, R: {}, B: {} };
  const q = new THREE.Vector3();
  // deeper than 1 cm: still inside after a 1 cm step in each of the 6 axis directions (shallower = skin contact)
  const isDeep = (p) => [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].every(([x, y, z]) => col.inside(q.set(p.x + x * 0.01, p.y + y * 0.01, p.z + z * 0.01)));
  const tanV = Math.tan(((R().fovBase || 90) * Math.PI) / 360), tanH = tanV * cam.aspect;
  for (let i = 0; i < part.length; i++) {
    sm.getVertexPosition(i, v); v.applyMatrix4(sm.matrixWorld);
    w.copy(v).applyMatrix4(camInv);
    if (w.y > FP.clipY && w.z > FP.clipZ) continue; // clipped away, never drawn
    if (!col.inside(v.applyMatrix4(inv))) continue;
    res[side[i]][part[i]] = (res[side[i]][part[i]] || 0) + 1;
    const d = -w.z;
    if (d > 0.05 && Math.abs(w.y) < d * tanV && Math.abs(w.x) < d * tanH) {
      vis[side[i]][part[i]] = (vis[side[i]][part[i]] || 0) + 1;
      if (isDeep(v)) deep[side[i]][part[i]] = (deep[side[i]][part[i]] || 0) + 1;
    }
  }
  return { in: res, vis, deep };
}
const fmtOne = (m) => ['L', 'R', 'B'].map((s) => (Object.keys(m[s]).length ? s + '{' + Object.entries(m[s]).map(([k, n]) => k + ':' + n).join(',') + '}' : '')).filter(Boolean).join(' ') || 'clean';
/** "deep: … (visible, > 1 cm inside) | vis: … (visible) | all: …" */
export const fmt = (r) => `deep: ${fmtOne(r.deep)} | vis: ${fmtOne(r.vis)} | all: ${fmtOne(r.in)}`;
export const total = (r, key = 'in') => Object.values(r[key]).reduce((a, o) => a + Object.values(o).reduce((x, y) => x + y, 0), 0);

/** Every slot × hip / aim / reload sweep. */
export async function matrix(slots = [0, 1, 2, 3], ts = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85]) {
  const out = {};
  for (const s of slots) {
    const row = {};
    await pose(s, 'hip'); row.hip = fmt(measure());
    await pose(s, 'aim'); row.aim = fmt(measure());
    for (const t of ts) { await pose(s, 'reload', t); row['r' + t] = fmt(measure()); }
    out[player().guns[s].type] = row;
  }
  release();
  return out;
}

/** Wait for asset downloads, then setup(). */
export async function boot() {
  for (let i = 0; i < 80 && (!game() || !R().firstPerson.ready || R().pendingDownloads() > 0); i++) await sleep(250);
  return setup();
}

/**
 * Synchronous what-if for the held gun: place it at its hip ('hip') or aim ('aim') pose from userData.pose
 * (optionally overridden: { rest, ads, yaw, roll }), solve the arms and measure. Lets a tuning loop try many
 * poses without waiting for frames. Call while lab.pose(slot, ...) holds the slot.
 */
export function quick(mode, over = {}) {
  const g = gunMesh(), P = { ...g.userData.pose, ...over }, ads = mode === 'aim' ? 1 : 0;
  const pos = ads ? P.ads : P.rest;
  g.position.set(...pos); g.rotation.set(0, ads ? 0 : P.yaw, ads ? 0 : P.roll); g.updateMatrix(); g.updateMatrixWorld(true);
  for (let i = 0; i < 4; i++) R().firstPerson.update(true, { dt: 0.25, ads });
  return measure();
}

/**
 * Render one frame and POST the canvas as PNG to a local receiver (default http://127.0.0.1:5192/<name>), which
 * saves it. Works with the tab hidden: the canvas is read in the same task as the render, before compositing.
 */
export async function shot(name, url = 'http://127.0.0.1:5192/') {
  pump(1);
  const data = R().canvas.toDataURL('image/png');
  const res = await fetch(url + encodeURIComponent(name), { method: 'POST', body: data });
  return res.text();
}

/** Equip exactly these gun types in slots 1-4 (e.g. boss weapons that never drop in the sandbox), then setup(). */
export async function loadout(types) {
  const { generateGun } = await import('/src/sim/guns.js');
  const p = player();
  p.unlockedSlots = Math.max(p.unlockedSlots, types.length);
  types.forEach((type, i) => {
    const g = generateGun({ seed: 21 + i, level: 1, forced: { type, quality: 'rare', manufacturer: 'reliable', element: 'none' } });
    g.id = 9000 + i;
    p.guns[i] = g;
  });
  return setup({ guns: types });
}

/** Side profile of the held gun: solid z-runs (gun local, + = back) per height at the centre plane. */
export async function profile(step = 0.02) {
  const g = gunMesh(), col = R().firstPerson.debug().collider, sz = g.userData.size, p = new THREE.Vector3(), rows = [];
  for (let y = -sz.y / 2; y <= sz.y / 2; y += step) {
    const runs = []; let start = null;
    for (let z = -sz.z / 2; z <= sz.z / 2 + 0.005; z += 0.005) {
      const solid = [-0.02, 0, 0.02].some((x) => col.inside(p.set(x, y, z)));
      if (solid && start === null) start = z;
      if (!solid && start !== null) { runs.push(`${start.toFixed(2)}..${z.toFixed(2)}`); start = null; }
    }
    rows.push(`y=${y.toFixed(2)}: ${runs.join(' ')}`);
  }
  return { type: g.userData.type, size: [sz.x, sz.y, sz.z].map((v) => +v.toFixed(3)), rows };
}

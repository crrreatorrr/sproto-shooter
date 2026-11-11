// Private server-owned persistence, NOT an input accepted by reward endpoints.
// The digest is corruption detection, not authentication. The caller must load
// envelopes from trusted server storage and supply its expected artifact/binding.
import { exportCampaignCheckpoints, importCampaignCheckpoints } from '../sim/campaign/campaign.js';
import { fnv1a, stableStringify } from '../sim/hash.js';
import { getLevelRuntime } from '../sim/level/runtime.js';
import { CANONICAL_BOSSES } from '../data/serverManifest.js';

export const CHECKPOINT_VERSION = 1;
// Provisional resource bounds; CI reports corpus sizes. Never truncate snapshots.
export const CHECKPOINT_LIMITS = Object.freeze({ bytes: 16 * 1024 * 1024, depth: 64, nodes: 1000000, array: 100000, string: 16384, checkpoints: 64 });
const forbidden = new Set(['__proto__', 'constructor', 'prototype']);
const fail = () => { throw new Error('bad_private_checkpoint'); };
const integer = (n) => Number.isSafeInteger(n) && n >= 0;

// Bounded JSON projection. Export omits undefined object fields just as JSON
// does (optional authored data); import accepts only actual plain JSON values.
function project(value, exporting = false) {
  const ancestors = new Set();
  let nodes = 0;
  let bytes = 0;
  function add(n) { bytes += n; if (bytes > CHECKPOINT_LIMITS.bytes) fail(); }
  function textSize(s) {
    if (s.length > CHECKPOINT_LIMITS.string) fail();
    // Exact UTF-8 size of the escaped JSON string, without Node/browser APIs.
    const json = JSON.stringify(s);
    let n = 0;
    for (let i = 0; i < json.length; i++) {
      const c = json.charCodeAt(i);
      if (c < 128) n++;
      else if (c < 2048) n += 2;
      else if (c >= 0xd800 && c <= 0xdbff) { n += 4; i++; }
      else n += 3;
    }
    return n;
  }
  function walk(v, depth) {
    if (++nodes > CHECKPOINT_LIMITS.nodes || depth > CHECKPOINT_LIMITS.depth) fail();
    if (v === null) { add(4); return null; }
    if (typeof v === 'string') { add(textSize(v)); return v; }
    if (typeof v === 'boolean') { add(v ? 4 : 5); return v; }
    if (typeof v === 'number') { if (!Number.isFinite(v)) fail(); add(JSON.stringify(v).length); return v; }
    if (typeof v !== 'object' || ancestors.has(v)) fail();
    const proto = Object.getPrototypeOf(v);
    if (Array.isArray(v) ? proto !== Array.prototype : proto !== Object.prototype && proto !== null) fail();
    if (Object.getOwnPropertySymbols(v).length) fail();
    ancestors.add(v);
    let result;
    if (Array.isArray(v)) {
      if (v.length > CHECKPOINT_LIMITS.array || Object.keys(v).length !== v.length
        || Object.getOwnPropertyNames(v).length !== v.length + 1) fail();
      add(2 + Math.max(0, v.length - 1));
      result = [];
      for (let i = 0; i < v.length; i++) {
        const descriptor = Object.getOwnPropertyDescriptor(v, String(i));
        if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) fail();
        result.push(walk(descriptor.value, depth + 1));
      }
    } else {
      result = {};
      add(2);
      let count = 0;
      for (const key of Object.getOwnPropertyNames(v)) {
        if (forbidden.has(key)) fail();
        const descriptor = Object.getOwnPropertyDescriptor(v, key);
        if (!descriptor.enumerable || !('value' in descriptor)) fail();
        if (exporting && descriptor.value === undefined) continue;
        add(textSize(key) + 1 + (count++ ? 1 : 0));
        result[key] = walk(descriptor.value, depth + 1);
      }
    }
    ancestors.delete(v);
    return result;
  }
  return walk(value, 0);
}
function keys(value, expected) {
  if (!value || Array.isArray(value) || typeof value !== 'object') fail();
  const actual = Object.keys(value).sort();
  const wanted = expected.slice().sort();
  if (actual.length !== wanted.length || actual.some((key, i) => key !== wanted[i])) fail();
}
function manifestOk(manifest) {
  keys(manifest, ['artifact', 'sourceCommit', 'sha256', 'contentFingerprint', 'protocol']);
  if (manifest.artifact !== 'shooter-sim' || manifest.protocol !== 1
    || typeof manifest.sourceCommit !== 'string' || typeof manifest.contentFingerprint !== 'string'
    || typeof manifest.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(manifest.sha256)
    || !/^[0-9a-f]{40}$/.test(manifest.sourceCommit) || !/^[0-9a-f]{8}$/.test(manifest.contentFingerprint)) fail();
}
function bindingOk(binding) {
  keys(binding, ['accountId', 'sessionId', 'day', 'runId']);
  for (const key of Object.keys(binding)) if (typeof binding[key] !== 'string' || !binding[key].length || binding[key].length > 256) fail();
}
function stateOk(state) {
  if (!state || state.version !== 1 || !integer(state.tick) || !Number.isFinite(state.time) || state.time < 0
    || !integer(state.nextId) || !integer(state.localPlayerId) || !integer(state.seed) || state.seed > 4294967295
    || typeof state.mode !== 'string' || !state.mode.length) fail();
  keys(state.rng, ['a', 'b', 'c', 'd']);
  // sfc32 keeps signed int32 intermediate words as well as uint32 words.
  for (const word of Object.values(state.rng)) if (!Number.isInteger(word) || word < -2147483648 || word > 4294967295) fail();
  if (!state.players || Array.isArray(state.players) || typeof state.players !== 'object' || !state.players[state.localPlayerId]) fail();
  for (const [id, player] of Object.entries(state.players)) {
    if (String(player?.id) !== id || player.kind !== 'player') fail();
    for (const name of ['pos', 'prevPos', 'vel']) {
      if (!player[name] || !['x', 'y', 'z'].every((axis) => Number.isFinite(player[name][axis]))) fail();
    }
  }
  if (state.mode === 'campaign' && !state.level) fail();
  if (state.level) {
    if (typeof state.level.id !== 'string' || typeof state.level.section !== 'string') fail();
    const runtime = getLevelRuntime(state.level.id);
    // getLevelData accepts aliases and fallback spellings; persisted identity
    // must name the exact authored level and section instead.
    if (runtime.id !== state.level.id || !runtime.sections.some((section) => section.id === state.level.section)) fail();
  }
  const ids = new Set();
  const entities = Object.values(state.players);
  for (const name of ['enemies', 'allies', 'projectiles', 'pickups', 'hazards']) {
    if (!Array.isArray(state[name])) fail();
    for (const entity of state[name]) entities.push(entity);
  }
  for (const entity of entities) {
    if (!entity || !integer(entity.id) || entity.id >= state.nextId || ids.has(entity.id)) fail();
    ids.add(entity.id);
  }
}
function validate(body) {
  keys(body, ['v', 'manifest', 'binding', 'state', 'campaignCheckpoints', 'parts', 'counters']);
  if (body.v !== CHECKPOINT_VERSION) fail();
  manifestOk(body.manifest); bindingOk(body.binding); stateOk(body.state);
  keys(body.counters, ['frames', 'segments']);
  // Input cursor may advance beyond a terminal simulation tick. This unused
  // persistence helper preserves counters; it does not implement batch stepping.
  if (!integer(body.counters.frames) || !integer(body.counters.segments)) fail();
  if (!body.parts || Array.isArray(body.parts) || typeof body.parts !== 'object') fail();
  const partTypes = new Set(CANONICAL_BOSSES.flatMap((boss) => boss.parts));
  for (const [type, part] of Object.entries(body.parts)) {
    if (!partTypes.has(type)) fail();
    keys(part, ['type', 'spawned', 'dead', 'fled', 'sourceKind', 'sourceId']);
    if (part.type !== type || typeof part.spawned !== 'boolean' || typeof part.dead !== 'boolean'
      || typeof part.fled !== 'boolean' || (part.sourceKind !== null && typeof part.sourceKind !== 'string')
      || (part.sourceId !== null && !integer(part.sourceId))) fail();
  }
  if (!Array.isArray(body.campaignCheckpoints) || body.campaignCheckpoints.length > CHECKPOINT_LIMITS.checkpoints) fail();
  let allowed = new Set();
  if (body.state.level) {
    const runtime = getLevelRuntime(body.state.level.id);
    if (runtime.id !== body.state.level.id) fail();
    allowed = new Set(['start', ...runtime.sections.flatMap((sec) => (sec.checkpoints || []).map((cp) => cp.id))]);
  }
  const seen = new Set();
  for (const entry of body.campaignCheckpoints) {
    keys(entry, ['id', 'state']);
    if (typeof entry.id !== 'string' || !allowed.has(entry.id) || seen.has(entry.id)) fail();
    seen.add(entry.id); stateOk(entry.state);
    if (entry.state.seed !== body.state.seed || entry.state.localPlayerId !== body.state.localPlayerId
      || entry.state.tick > body.state.tick || entry.state.level?.id !== body.state.level?.id
      || entry.state.level?.checkpoint !== entry.id) fail();
    if ('campaignCheckpoints' in entry.state || 'privateCheckpoint' in entry.state) fail();
  }
  if (body.state.mode === 'campaign' && (!seen.has('start') || !seen.has(body.state.level.checkpoint))) fail();
}
function privateHash(body) { return fnv1a(stableStringify(body)); }

export function createPrivateCheckpoint(state, { manifest, binding, parts = {}, counters }) {
  const body = project({ v: CHECKPOINT_VERSION, manifest, binding, state,
    // Borrow trusted references only for the bounded projection below: do not
    // allocate a deep clone before checking the aggregate traversal budget.
    campaignCheckpoints: exportCampaignCheckpoints(state, (value) => value), parts,
    counters: counters === undefined ? { frames: 0, segments: 0 } : counters }, true);
  // Read defaults only from the bounded plain projection, never from an accessor.
  if (counters === undefined) body.counters.frames = body.state?.tick;
  validate(body);
  const envelope = { ...body, privateHash: privateHash(body) };
  return project(envelope);
}

export function restorePrivateCheckpoint(envelope, { manifest, binding }) {
  const copy = project(envelope);
  keys(copy, ['v', 'manifest', 'binding', 'state', 'campaignCheckpoints', 'parts', 'counters', 'privateHash']);
  const { privateHash: digest, ...body } = copy;
  validate(body);
  const expectedManifest = project(manifest), expectedBinding = project(binding);
  manifestOk(expectedManifest); bindingOk(expectedBinding);
  if (stableStringify(body.manifest) !== stableStringify(expectedManifest)
    || stableStringify(body.binding) !== stableStringify(expectedBinding)
    || typeof digest !== 'string' || digest !== privateHash(body)) fail();
  importCampaignCheckpoints(body.state, body.campaignCheckpoints);
  return { state: body.state, parts: body.parts, counters: body.counters };
}

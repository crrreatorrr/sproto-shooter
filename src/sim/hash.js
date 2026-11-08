// Stable state hash. FNV-1a over canonical JSON. Events are omitted.

export function stableStringify(value) {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'number') return Number.isFinite(value) ? JSON.stringify(value) : 'null';
  if (t === 'string' || t === 'boolean') return JSON.stringify(value);
  if (t !== 'object') return 'null';
  if (Array.isArray(value)) {
    let s = '[';
    for (let i = 0; i < value.length; i++) {
      if (i) s += ',';
      s += stableStringify(value[i]);
    }
    return s + ']';
  }
  const keys = Object.keys(value).sort();
  let s = '{';
  let n = 0;
  for (const k of keys) {
    const v = value[k];
    if (v === undefined) continue;
    if (n++) s += ',';
    s += JSON.stringify(k) + ':' + stableStringify(v);
  }
  return s + '}';
}

export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Engine-stable hash. Go's and V8's libm differ by 1 ulp, which changes
 * JSON digits but not hits or hit points. Micro-units (1e-6) keep checkpoints
 * identical in Node, browsers, and goja. `stateHash` itself is unchanged.
 */
function quantizeForHash(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * 1000000);
  }
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    const arr = new Array(value.length);
    for (let i = 0; i < value.length; i++) arr[i] = quantizeForHash(value[i]);
    return arr;
  }
  const out = {};
  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] === 'events') continue;
    out[keys[i]] = quantizeForHash(value[keys[i]]);
  }
  return out;
}

export function verifyStateHash(state) {
  return fnv1a(stableStringify(quantizeForHash(state)));
}

/** Hash of state minus `events` and any extra omitted keys. */
export function stateHash(state, opt = {}) {
  const omit = opt.omit || ['events'];
  const copy = { ...state };
  for (const k of omit) delete copy[k];
  if (!omit.includes('events')) delete copy.events;
  return fnv1a(stableStringify(copy));
}

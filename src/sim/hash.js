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

/** Hash of state minus `events` and any extra omitted keys. */
export function stateHash(state, opt = {}) {
  const omit = opt.omit || ['events'];
  const copy = { ...state };
  for (const k of omit) delete copy[k];
  if (!omit.includes('events')) delete copy.events;
  return fnv1a(stableStringify(copy));
}

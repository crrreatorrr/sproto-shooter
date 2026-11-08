// @ts-check
// Acquire / update / release. Keyed views go back to a pool (hidden, still in the scene).
// Unkeyed views are removed, matching the old releaseUnseen path. Linger is optional.

/**
 * @param {{ add: (o: any) => void, remove: (o: any) => void }} scene
 * @param {{ dispose?: (v: any) => void }} [hooks]
 */
export function createViewRegistry(scene, hooks = {}) {
  /** @type {Map<number, any>} */
  const views = new Map();
  /** @type {Map<string, any[]>} */
  const pools = new Map();
  const seen = new Set();

  function show(v) {
    v.obj.visible = true;
    if (v.extra) for (const x of v.extra) x.visible = true;
    if (v.obj.parent !== scene) scene.add(v.obj);
  }
  function hide(v) {
    v.obj.visible = false;
    if (v.extra) for (const x of v.extra) x.visible = false;
  }
  function drop(v) {
    if (hooks.dispose) { hooks.dispose(v); return; }
    scene.remove(v.obj);
    if (v.extra) v.extra.forEach((x) => scene.remove(x));
  }
  function release(v) {
    if (v.key != null) {
      hide(v);
      let pool = pools.get(v.key);
      if (!pool) { pool = []; pools.set(v.key, pool); }
      pool.push(v);
    } else drop(v);
  }

  return {
    /**
     * @param {number} id
     * @param {() => any} make
     * @param {string | null} [key]
     */
    sync(id, make, key = null) {
      seen.add(id);
      let v = views.get(id);
      if (v && key != null && v.key !== key) { release(v); views.delete(id); v = null; }
      if (!v) {
        const pool = key != null ? pools.get(key) : null;
        v = pool && pool.length ? pool.pop() : make();
        if (key != null) v.key = key;
        views.set(id, v);
        show(v);
      }
      return v;
    },
    endFrame() {
      for (const [id, v] of views) {
        if (seen.has(id)) continue;
        if (typeof v.linger === 'function' && v.linger(v)) continue;
        release(v);
        views.delete(id);
      }
      seen.clear();
    },
  };
}

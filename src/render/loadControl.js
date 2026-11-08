// Scene-neutral load book. The renderer supplies bytes and GPU disposal.
// A failed job stays an error until retry. Map presence is not readiness.
// Resident templates outside the current demand set are evicted, and an
// unpinned overflow past capBytes is evicted oldest-first. Live users are kept.

export function createLoadControl({ maxParallel = 4, capBytes = 128 * 1024 * 1024, now = 0, later = 1 } = {}) {
  const jobs = new Map();
  const queue = [];
  const requested = new Set();
  const users = new Map();
  const demandNow = new Set();
  const demandKeep = new Set();
  let active = 0;
  let activeNow = 0;
  let bytesDone = 0;
  let clock = 0;

  function pendingDownloads() {
    return queue.length + active;
  }

  function promote(path) {
    for (const item of queue) if (item.path === path) item.prio = now;
    pump();
  }

  function pump() {
    while (active < maxParallel && queue.length) {
      queue.sort((a, b) => a.prio - b.prio || a.job.lastUsed - b.job.lastUsed);
      if (queue[0].prio === later && activeNow > 0) break;
      const item = queue.shift();
      const urgent = item.prio === now;
      active += 1;
      if (urgent) activeNow += 1;
      Promise.resolve()
        .then(() => item.start())
        .then(
          (result) => {
            if (result == null) throw new Error('load failed');
            item.job.status = 'ready';
            item.job.result = result;
            item.job.error = null;
            item.job.lastUsed = ++clock;
            item.resolve(result);
          },
          (err) => {
            item.job.status = 'error';
            item.job.result = null;
            item.job.error = err instanceof Error ? err.message : String(err);
            item.resolve(null);
          },
        )
        .finally(() => {
          active -= 1;
          if (urgent) activeNow -= 1;
          pump();
        });
    }
  }

  function schedule(path, start, prio = now) {
    requested.add(path);
    const existing = jobs.get(path);
    if (existing) {
      if (prio === now && existing.status !== 'ready') promote(path);
      existing.lastUsed = ++clock;
      return existing.promise;
    }
    const job = {
      path,
      status: 'loading',
      error: null,
      result: null,
      decodedBytes: 0,
      lastUsed: ++clock,
      promise: null,
    };
    const promise = new Promise((resolve) => {
      queue.push({ path, start, prio, resolve, job });
      pump();
    });
    job.promise = promise;
    jobs.set(path, job);
    return promise;
  }

  function status(path) {
    const job = jobs.get(path);
    return job ? job.status : 'idle';
  }

  function isReady(path) {
    const job = jobs.get(path);
    return !!job && job.status === 'ready' && job.result != null;
  }

  function result(path) {
    const job = jobs.get(path);
    return job && job.status === 'ready' ? job.result : null;
  }

  function noteBytes(n) {
    if (n > 0) bytesDone += n;
  }

  function setDecoded(path, bytes) {
    const job = jobs.get(path);
    if (job && bytes > 0) job.decodedBytes = bytes;
  }

  function retain(path) {
    users.set(path, (users.get(path) || 0) + 1);
    const job = jobs.get(path);
    if (job) job.lastUsed = ++clock;
  }

  function release(path) {
    users.set(path, Math.max(0, (users.get(path) || 1) - 1));
  }

  function userCount(path) {
    return users.get(path) || 0;
  }

  function residentBytes() {
    let n = 0;
    for (const job of jobs.values()) if (job.status === 'ready') n += job.decodedBytes || 0;
    return n;
  }

  function take(job) {
    jobs.delete(job.path);
    const out = { path: job.path, result: job.result, decodedBytes: job.decodedBytes };
    job.result = null;
    job.status = 'idle';
    return out;
  }

  function evict() {
    const disposed = [];
    const stale = [...jobs.values()].filter((job) => (
      job.status === 'ready' && !demandKeep.has(job.path) && userCount(job.path) === 0
    ));
    stale.sort((a, b) => a.lastUsed - b.lastUsed);
    for (const job of stale) disposed.push(take(job));
    const overflow = [...jobs.values()].filter((job) => (
      job.status === 'ready' && !demandNow.has(job.path) && userCount(job.path) === 0
    ));
    overflow.sort((a, b) => a.lastUsed - b.lastUsed);
    for (const job of overflow) {
      if (residentBytes() <= capBytes) break;
      disposed.push(take(job));
    }
    return disposed;
  }

  function setDemand(nowPaths, laterPaths) {
    demandNow.clear();
    demandKeep.clear();
    for (const p of nowPaths || []) {
      demandNow.add(p);
      demandKeep.add(p);
    }
    for (const p of laterPaths || []) demandKeep.add(p);
    return evict();
  }

  function failures() {
    return [...jobs.values()]
      .filter((job) => job.status === 'error')
      .map((job) => ({ path: job.path, message: job.error || 'load failed' }));
  }

  function retryPaths() {
    const paths = [];
    for (const [path, job] of jobs) {
      if (job.status !== 'error') continue;
      jobs.delete(path);
      paths.push(path);
    }
    return paths;
  }

  function report() {
    let ready = 0;
    let loading = 0;
    for (const job of jobs.values()) {
      if (job.status === 'ready') ready += 1;
      else if (job.status === 'loading') loading += 1;
    }
    const failed = failures();
    return {
      pending: pendingDownloads(),
      ready,
      loading,
      failed,
      bytesDone,
      residentBytes: residentBytes(),
      capBytes,
      requested: requested.size,
    };
  }

  return {
    schedule,
    promote,
    status,
    isReady,
    result,
    noteBytes,
    setDecoded,
    retain,
    release,
    userCount,
    setDemand,
    evict,
    failures,
    retryPaths,
    report,
    pendingDownloads,
    requestedPaths: () => [...requested],
    residentBytes,
  };
}

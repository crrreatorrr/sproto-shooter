// Level authoring helpers. Pure data. Yaw is degrees about Y, 0 facing +Z.
// Box and ramp `at` is the centre. Cylinder `at` is the base centre.

function num(v) { return typeof v === 'number' && Number.isFinite(v); }

export function box({ id, at, size, yaw = 0, mat = 'stone', tag } = {}) {
  return { kind: 'box', id, at: at.slice(), size: size.slice(), yaw, mat, tag };
}

export function ramp({ id, at, size, yaw = 0, mat = 'stone', tag } = {}) {
  return { kind: 'ramp', id, at: at.slice(), size: size.slice(), yaw, mat, tag };
}

export function stairs(o = {}) {
  const steps = o.steps ?? Math.max(2, Math.round((o.size?.[2] || 1) / 0.3));
  return { ...ramp(o), visual: 'stairs', steps };
}

export function cylinder({ id, at, r, h, mat = 'pillar', tag } = {}) {
  return { kind: 'cylinder', id, at: at.slice(), r, h, mat, tag };
}

export function sphere({ id, at, r, mat = 'stone', tag } = {}) {
  return { kind: 'sphere', id, at: at.slice(), r, mat, tag };
}

export function cone({ id, at, r, h, mat = 'stone', tag } = {}) {
  return { kind: 'cone', id, at: at.slice(), r, h, mat, tag };
}

export function disc({ id, at, r, mat = 'neon', tag } = {}) {
  return { kind: 'disc', id, at: at.slice(), r, mat, tag };
}

export function terrain({ id, origin, size, cell = 2, seed = 1, noise = {}, mat = 'rock' } = {}) {
  return {
    kind: 'terrain', id, origin: origin.slice(), size: size.slice(), cell, seed, mat,
    noise: { amp: noise.amp ?? 0, freq: noise.freq ?? 0.02, octaves: noise.octaves ?? 1 },
  };
}

export function flattenGeometry(items, out = []) {
  for (const item of items || []) {
    if (item && item.kind === 'group') flattenGeometry(item.parts, out);
    else if (item) out.push(item);
  }
  return out;
}

function checkVec(errors, label, v, n) {
  if (!Array.isArray(v) || v.length < n || v.slice(0, n).some((x) => !num(x))) errors.push(`${label} needs ${n} numbers`);
}

function checkSolid(errors, g, index) {
  const where = g.id || `#${index}`;
  if (g.kind === 'box' || g.kind === 'ramp') {
    checkVec(errors, `${where} at`, g.at, 3);
    checkVec(errors, `${where} size`, g.size, 3);
    if (Array.isArray(g.size) && g.size.some((s) => !(s >= 0.5))) errors.push(`${where} is thinner than 0.5 m`);
  } else if (g.kind === 'cylinder') {
    checkVec(errors, `${where} at`, g.at, 3);
    if (!(g.r >= 0.25)) errors.push(`${where} radius must be >= 0.25`);
    if (!(g.h >= 0.5)) errors.push(`${where} height must be >= 0.5`);
  } else if (g.kind === 'sphere') {
    checkVec(errors, `${where} at`, g.at, 3);
    if (!(g.r >= 0.25)) errors.push(`${where} radius must be >= 0.25`);
  } else if (g.kind === 'cone') {
    checkVec(errors, `${where} at`, g.at, 3);
    if (!(g.r >= 0.25)) errors.push(`${where} radius must be >= 0.25`);
    if (!(g.h >= 0.5)) errors.push(`${where} height must be >= 0.5`);
  } else if (g.kind === 'disc') {
    checkVec(errors, `${where} at`, g.at, 3);
    if (!(g.r >= 0.25)) errors.push(`${where} radius must be >= 0.25`);
  } else if (g.kind === 'terrain') {
    if (!g.id) errors.push('terrain needs an id');
    checkVec(errors, `${where} origin`, g.origin, 3);
    checkVec(errors, `${where} size`, g.size, 2);
    if (!Number.isInteger(g.seed)) errors.push(`${where} seed must be an integer`);
  } else errors.push(`${where} has unknown kind ${g.kind}`);
}

export function validateLevel(level) {
  const errors = [];
  const warnings = [];
  if (!level || typeof level.id !== 'string') errors.push('id is required');
  if (!level || typeof level.name !== 'string') errors.push('name is required');
  checkVec(errors, 'bounds.min', level && level.bounds && level.bounds.min, 3);
  checkVec(errors, 'bounds.max', level && level.bounds && level.bounds.max, 3);
  const geometry = [];
  const sections = level && level.legacy ? [] : (level && level.sections) || [];
  if (level && level.legacy) {
    if (!(level.radius > 0)) errors.push('legacy level needs a radius');
  }
  for (const sec of sections) {
    if (!sec.id) errors.push('section needs an id');
    geometry.push(...flattenGeometry(sec.geometry));
    for (const w of sec.weapons || []) {
      if (!w.id) errors.push('rack needs an id');
      if (!w.why) errors.push(`rack ${w.id || ''} needs why`);
      if (!w.gun) errors.push(`rack ${w.id || ''} needs a gun`);
    }
    for (const e of sec.encounters || []) {
      if (!e.id) errors.push('encounter needs an id');
      if (!e.objective || !e.objective.kind) errors.push(`${e.id || 'encounter'} needs an objective`);
    }
  }
  geometry.forEach((g, i) => checkSolid(errors, g, i));
  const ids = new Set();
  for (const g of geometry) {
    if (!g.id) continue;
    if (ids.has(g.id)) errors.push(`duplicate id ${g.id}`);
    ids.add(g.id);
  }
  for (const sec of sections) {
    for (const list of [sec.mechanisms, sec.weapons, sec.checkpoints, sec.encounters]) {
      for (const item of list || []) {
        if (!item || item.id == null) continue;
        if (ids.has(item.id)) errors.push(`duplicate id ${item.id}`);
        ids.add(item.id);
      }
    }
  }
  return { ok: errors.length === 0, errors, warnings };
}

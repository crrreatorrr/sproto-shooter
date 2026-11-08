// Turns a short section list into the campaign level object the sim loads.
import { box } from './kit.js';

function shiftAt(at, dx) { return [at[0] + dx, at[1], at[2]]; }

export function makeLevel(def) {
  let cursor = 0;
  const sections = [];
  for (let i = 0; i < def.sections.length; i++) {
    const s = def.sections[i];
    const len = s.length ?? 46;
    const width = s.width ?? 22;
    const x0 = cursor;
    const x1 = x0 + len;
    const geometry = [
      box({ id: `${s.id}-floor`, at: [(x0 + x1) / 2, -0.25, width / 2], size: [len + 1, 0.5, width], mat: s.floor || 'stone' }),
      box({ id: `${s.id}-wallN`, at: [(x0 + x1) / 2, 1.6, 0.3], size: [len + 1, 3.2, 0.6], mat: 'stone' }),
      box({ id: `${s.id}-wallS`, at: [(x0 + x1) / 2, 1.6, width - 0.3], size: [len + 1, 3.2, 0.6], mat: 'stone' }),
    ];
    for (const c of s.cover || []) {
      const h = c.h || 1.2;
      geometry.push(box({
        id: `${s.id}-cov-${c.x}`, at: [x0 + c.x, h / 2, c.z ?? width * 0.32], size: [1.4, h, 1.4], mat: 'crate', tag: 'cover',
      }));
    }
    for (const prim of s.props || []) {
      const copy = { ...prim, at: prim.at ? shiftAt(prim.at, x0) : prim.at, origin: prim.origin ? shiftAt(prim.origin, x0) : prim.origin };
      geometry.push(copy);
    }
    const encounters = (s.encounters || []).map((e) => encounterAt(e, s.id, x0, width));
    const mechanisms = (s.mechanisms || []).map((m) => placeMech(m, s, x0, width));
    if (s.secret) {
      mechanisms.push({ kind: 'secret', id: `${s.id}-secret`, at: [x0 + s.secret.x, 1, width * 0.72], modifier: s.secret.modifier });
    }
    const weapons = (s.weapons || []).map((w) => ({
      kind: 'rack', id: w.id, at: [x0 + w.x, 0.9, width * 0.62], gun: w.gun, why: w.why,
    }));
    const checkpoints = (s.checkpoints || []).map((c) => ({
      id: c.id, at: [x0 + c.x, 0, width / 2], when: prefixRef(c.when, s),
    }));
    const next = def.sections[i + 1];
    const exit = next ? {
      min: [x1 - 4, -1, 2], max: [x1 - 0.4, 4, width - 2],
      to: next.id, kind: s.transition || 'seamless', card: s.card || null,
    } : null;
    sections.push({
      id: s.id, name: s.name, start: [x0 + 3.5, 0, width / 2], yaw: 0,
      geometry, encounters, mechanisms, weapons, checkpoints, exit,
      intro: s.intro || null,
    });
    cursor = x1 - 2;
  }
  const width = def.sections[0].width ?? 22;
  return {
    id: def.id,
    name: def.name,
    stage: def.stage,
    tier: def.tier,
    parTime: def.parTime,
    jetpack: def.jetpack || false,
    gravityMult: def.gravityMult || 1,
    lighting: def.lighting || null,
    bounds: { min: [-10, -25, -6], max: [cursor + 12, 48, width + 6] },
    sections,
    modifiers: def.modifiers || [],
  };
}

function prefixRef(opens, s) {
  if (!opens || typeof opens !== 'string') return opens;
  if (!opens.endsWith('.cleared')) return opens;
  const id = opens.slice(0, -'.cleared'.length);
  if ((s.encounters || []).some((e) => e.id === id)) return `${s.id}-${id}.cleared`;
  return opens;
}

function encounterAt(e, sid, x0, width) {
  const x = x0 + e.x;
  const at = [];
  const units = [];
  let n = 0;
  for (const [type, count] of e.units) {
    units.push({ type, count });
    for (let k = 0; k < count; k++) at.push([x + 7, 0, width / 2 - 3 + (n++ % 6) * 1.25]);
  }
  return {
    id: `${sid}-${e.id}`,
    space: e.space || 'corridor',
    zone: { min: [x - 8, -2, 1], max: [x + 16, 14, width - 1] },
    activate: { min: [x - 4, -1, 1.2], max: [x + 3, 6, width - 1.2] },
    objective: { kind: e.objective || 'clearAll' },
    maxAlive: e.maxAlive || 12,
    fleeAt: e.fleeAt || 0,
    squads: [{ delay: 0, units, at }],
  };
}

function placeMech(m, s, x0, width) {
  const x = x0 + m.x;
  const z = m.z ?? width * 0.28;
  const base = { kind: m.kind, id: m.id, opens: prefixRef(m.opens, s), modifier: m.modifier, dps: m.dps, slow: m.slow, power: m.power, speed: m.speed };
  if (m.kind === 'door') return { ...base, at: [x, 1.6, z], size: [0.8, 3.2, 3.2], yaw: 0 };
  if (m.kind === 'switch') return { ...base, at: [x, 1, z], holdTime: m.holdTime ?? 0.35 };
  if (m.kind === 'barrel') return { ...base, at: [x, 0.55, z], hp: 30 };
  if (m.kind === 'jumpPad') return { ...base, at: [x, 0.2, width / 2], power: m.power || 11, r: 1.4 };
  if (m.kind === 'hazard') return { ...base, min: [x - 2, -1, z - 2], max: [x + 2, 2, z + 2], dps: m.dps ?? 8, slow: m.slow ?? 0 };
  if (m.kind === 'mover' || m.kind === 'carpet' || m.kind === 'elevator') {
    return { ...base, kind: 'mover', from: [x, 0.4, 3], to: [x, m.y ?? 0.4, width - 3], speed: m.speed || 2.2 };
  }
  if (m.kind === 'zipline') return { ...base, from: [x, 3.5, width / 2], to: [x + 12, 2.2, width / 2] };
  if (m.kind === 'portal') return { ...base, at: [x, 1, 4], to: [x + (m.dx || 10), 0, width / 2] };
  if (m.kind === 'laser') return { ...base, at: [x, 1.2, 4], size: [0.4, 1.6, 3], dps: m.dps || 12 };
  if (m.kind === 'rail') return { ...base, from: [x, 0.3, width / 2], to: [x + 18, 0.3, width / 2], speed: m.speed || 10 };
  if (m.kind === 'crusher') return { ...base, at: [x, 2.6, z], size: [2.4, 1, 2.4], speed: 1.2 };
  if (m.kind === 'bridge') return { ...base, from: [x, 0, width / 2], to: [x + 6, 0, width / 2], width: 2 };
  if (m.kind === 'jetpack' || m.kind === 'fuel' || m.kind === 'power' || m.kind === 'depot') return { ...base, at: [x, 1, width * 0.4] };
  return { ...base, at: [x, 1, z] };
}

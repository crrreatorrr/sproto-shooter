// Assemble a format:'v2' campaign level. Section coordinates are local.
// origin is added so the sim sees one world. Solids are derived from geometry
// when the section loads.

function add(at, origin) {
  if (!at) return at;
  return [at[0] + origin[0], (at[1] || 0) + (origin[1] || 0), at[2] + origin[2]];
}

function shiftNav(bounds, origin) {
  if (!bounds) return null;
  return {
    min: [bounds.min[0] + origin[0], bounds.min[1] + origin[2]],
    max: [bounds.max[0] + origin[0], bounds.max[1] + origin[2]],
  };
}

function shiftBox(box, origin) {
  if (!box || !box.min || !box.max) return box;
  return { min: add(box.min, origin), max: add(box.max, origin) };
}

function shiftPrim(g, origin) {
  const next = { ...g };
  if (g.at) next.at = add(g.at, origin);
  if (g.origin) next.origin = add(g.origin, origin);
  return next;
}

function shiftSquad(squad, origin) {
  const at = (squad.at || []).map((p) => add(p, origin));
  return { ...squad, at, trigger: squad.trigger || { type: 'onEnter' }, method: squad.method || 'placed' };
}

export function makeV2Level(def) {
  const sections = (def.sections || []).map((sec, i) => {
    const origin = sec.origin || [0, 0, 0];
    const geometry = (sec.geometry || []).map((g) => shiftPrim(g, origin));
    const encounters = (sec.encounters || []).map((enc) => ({
      ...enc,
      objective: enc.objective || { kind: 'clearAll' },
      zone: shiftBox(enc.zone, origin),
      activate: shiftBox(enc.activate, origin),
      hold: shiftBox(enc.hold, origin),
      squads: (enc.squads || []).map((sq) => shiftSquad(sq, origin)),
      lockdown: enc.lockdown ? {
        ...enc.lockdown,
        threshold: shiftBox(enc.lockdown.threshold, origin),
      } : null,
    }));
    const next = def.sections[i + 1];
    return {
      ...sec,
      origin,
      geometry,
      encounters,
      mechanisms: (sec.mechanisms || []).map((m) => ({
        ...m,
        at: m.at ? add(m.at, origin) : m.at,
        from: m.from ? add(m.from, origin) : m.from,
        to: m.to ? add(m.to, origin) : m.to,
        min: m.min ? add(m.min, origin) : m.min,
        max: m.max ? add(m.max, origin) : m.max,
      })),
      weapons: (sec.weapons || []).map((w) => ({ ...w, at: w.at ? add(w.at, origin) : w.at })),
      navBounds: shiftNav(sec.navBounds, origin),
      flyerVolume: shiftBox(sec.flyerVolume, origin),
      checkpoints: (sec.checkpoints || []).map((c) => ({ ...c, at: add(c.at, origin) })),
      start: add(sec.start || [2, 0, 2], origin),
      yaw: sec.yaw || 0,
      exit: next ? shiftBox(sec.exit, origin) : null,
      intro: sec.intro || null,
    };
  });
  let maxX = 10, maxZ = 10;
  for (const sec of sections) {
    for (const g of sec.geometry) {
      const x = g.at ? g.at[0] : 0;
      const z = g.at ? g.at[2] : 0;
      if (x > maxX) maxX = x;
      if (z > maxZ) maxZ = z;
    }
  }
  return {
    format: 'v2',
    id: def.id,
    name: def.name,
    stage: def.stage || 'city',
    tier: def.tier || 1,
    parTime: def.parTime || 0,
    jetpack: def.jetpack || false,
    gravityMult: def.gravityMult || 1,
    lighting: def.lighting || null,
    maxAlive: def.maxAlive || 8,
    useNav: !!def.useNav,
    startAmmo: def.startAmmo || null,
    bounds: def.bounds || { min: [-10, -25, -10], max: [maxX + 10, 48, maxZ + 10] },
    sections,
    modifiers: def.modifiers || [],
  };
}

// What the HUD says when the player picks something up.
import { RESOURCES } from '../data/drops.js';

const RES = Object.fromEntries(RESOURCES.map((r) => [r.id, r]));
const AMMO = {
  bullets: ['Bullets', '#ffd166'], shells: ['Shells', '#ff6a3d'], sniper: ['Sniper rounds', '#4fe3ff'],
  rockets: ['Rockets', '#b07cff'], energy: ['Energy cells', '#6ff6ff'], heavy: ['Heavy rounds', '#ffa21f'],
  rubber: ['Rubber rounds', '#ffd23a'],
};
const PLAIN = {
  health: ['Health', '#ff4d6d'], bigHealth: ['Big Health', '#ff2255'], medkit: ['Medkit', '#ff4d6d'],
  mana: ['Mana', '#6aa8ff'], tickets: ['Run Cash', '#ffd700'],
};

/**
 * `{ key, name, color, amount }` for a sim `pickup` event, or null for a kind with nothing to say.
 * `key` groups pickups of the same thing, so a burst of drops reads as one line with a total.
 */
export function describePickup(ev) {
  const amount = Math.round(Number(ev.amount) || 0);
  if (ev.kind === 'ammo') {
    const [name, color] = AMMO[ev.ammoType] || ['Ammo', '#ffd166'];
    return { key: `ammo:${ev.ammoType}`, name, color, amount };
  }
  if (ev.kind === 'resource') {
    const r = RES[ev.resId];
    return { key: `res:${ev.resId}`, name: r ? r.name : 'Parts', color: r ? r.color : '#ffffff', amount: amount || 1 };
  }
  const plain = PLAIN[ev.kind];
  return plain ? { key: ev.kind, name: plain[0], color: plain[1], amount } : null;
}

/** "+60 Bullets", or just the name when there is no count. */
export function pickupLine(d) {
  return d.amount > 0 ? `+${d.amount} ${d.name}` : d.name;
}

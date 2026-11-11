// Words and angles the HUD shows for sim events. Pure, so the tests can read them without a DOM.
import { GUN_TYPES_BY_ID } from '../data/guns.js';

/** Secret modifiers: name and what it does, as shown when one is picked up. */
export const MODIFIER_INFO = {
  bigHead: ['Big Head Mode', 'Every enemy head is huge'],
  turbo: ['Turbo', 'You move 35% faster'],
  moonBoots: ['Moon Boots', 'Low gravity for the rest of the level'],
  fuel: ['Jet Fuel', 'Free jetpack fuel for 20 seconds'],
  overshield: ['Overshield', '+40 shield'],
  ironSproto: ['Iron Sproto', '+80 shield'],
  manaSurge: ['Mana Surge', 'A burst of mana'],
  swarmSurge: ['Swarm Surge', 'Three more Midgets. Sorry'],
  floorIsLava: ['The Floor Is Lava', 'The ground burns for 20 seconds. Keep jumping'],
  taxSeason: ['Tax Season', 'You move slower'],
  redTape: ['Red Tape', 'You move a little slower'],
  lightsOut: ['Lights Out', 'It gets dark'],
  confetti: ['Confetti', 'Just for show'],
  duckHunt: ['Duck Hunt', 'Just for show'],
};

/**
 * What the HUD does for a campaign event: { via: 'banner' | 'toast' | 'feed', html, cls, dur } or null.
 * `html` is trusted level data (titles and lines come from src/data/levels).
 */
export function campaignNotice(ev) {
  switch (ev.type) {
    case 'levelCard': {
      const lines = (ev.lines || []).join('<br>');
      return { via: 'banner', cls: 'card', dur: 2500, html: `${ev.title || ''}${lines ? `<em>${lines}</em>` : ''}` };
    }
    case 'checkpoint': return { via: 'toast', cls: 'good', html: 'Checkpoint' };
    case 'lockdown':
      return ev.sealed
        ? { via: 'banner', cls: 'boss', dur: 1800, html: 'LOCKDOWN<em>The doors are shut until the room is clear</em>' }
        : { via: 'toast', cls: 'good', html: 'Lockdown lifted' };
    case 'lockdownReset': return { via: 'banner', cls: 'fight', dur: 2000, html: 'REWOUND<em>Back to the start of the lockdown</em>' };
    case 'alarm':
      return ev.cut
        ? { via: 'toast', cls: 'good', html: 'Alarm cut' }
        : { via: 'banner', cls: 'boss', dur: 1600, html: 'ALARM<em>Reinforcements are coming</em>' };
    case 'modifier': {
      const info = MODIFIER_INFO[ev.id];
      return info ? { via: 'banner', cls: 'perk', dur: 2600, html: `<small>SECRET</small>${info[0]}<em>${info[1]}</em>` } : null;
    }
    // The event's own `type` field is the event name, so the caller passes the gun type it found in the slot.
    case 'worldGun': {
      const t = GUN_TYPES_BY_ID[ev.gunType];
      return { via: 'feed', html: `Picked up ${t ? t.name : 'a gun'}` };
    }
    case 'encounterClear': return { via: 'toast', cls: 'good', html: 'Area clear' };
    case 'voidRescue': return { via: 'toast', cls: 'bad', html: 'Pulled back from the edge' };
    case 'partDestroyed': return { via: 'toast', cls: 'good', html: 'Boss part destroyed!' };
    case 'whiteoutWarn': return { via: 'toast', cls: 'bad', html: 'Whiteout coming. Find cover' };
    case 'whiteout': return { via: 'banner', cls: 'fight', dur: 1400, html: 'WHITEOUT' };
    case 'whiteoutLift': return { via: 'toast', cls: 'good', html: 'The whiteout lifts' };
    default: return null;
  }
}

/** Events campaignNotice has something for. */
export const CAMPAIGN_NOTICE_EVENTS = ['levelCard', 'checkpoint', 'lockdown', 'lockdownReset', 'alarm', 'modifier', 'worldGun',
  'encounterClear', 'voidRescue', 'partDestroyed', 'whiteoutWarn', 'whiteout', 'whiteoutLift'];

/**
 * Screen angle of a hit, in radians clockwise from straight ahead (0 = in front, π/2 = from the right,
 * π = behind). `dir` is the playerDamaged event's world angle to the source, `yaw` the player's view yaw.
 */
export function damageArcAngle(dir, yaw) {
  let a = Math.PI - (dir - yaw);
  a %= Math.PI * 2;
  if (a > Math.PI) a -= Math.PI * 2;
  if (a <= -Math.PI) a += Math.PI * 2;
  return a;
}

/** One-line tips for a first Wave Mode run. `seen` is a plain object the caller keeps. Returns a tip or null. */
export function firstRunTip(ev, seen, { pad = false } = {}) {
  const once = (id, text) => { if (seen[id]) return null; seen[id] = true; return text; };
  switch (ev.type) {
    case 'wavePre': return ev.waveIndex === 0 ? once('move', pad ? 'Left stick moves, right trigger fires' : 'WASD to move · mouse to aim · left click to fire') : null;
    case 'waveStart': return once('sprint', pad ? 'Click the left stick to sprint. Slide and grapple while you run' : 'Shift sprints · C slides · B grapples to anything in reach');
    case 'damage': return ev.isWeak ? once('weak', 'BONK! Weak spots take extra damage') : null;
    case 'intermissionStart': return once('shop', pad ? 'The shop is open between waves. Spend your Run Cash' : 'Press O for the shop between waves · Enter when ready');
    case 'playerDowned': return once('downed', 'Downed! Get a kill before the timer runs out. Each Second Wind is shorter');
    default: return null;
  }
}

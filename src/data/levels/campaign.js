// The Great Sproto Audit. Ten levels, one section chain each.
// Coordinates are playable scale; the design doc's kilometre footprints are the target proportions.
import { makeLevel } from './assemble.js';

const card = (title, lines) => ({ title, lines });

export const L01 = makeLevel({
  id: 'L01', name: 'Sproto Landing', stage: 'city', tier: 1, parTime: 10 * 60,
  sections: [
    {
      id: 'S1', name: 'Drop Zone', length: 48,
      encounters: [{ id: 'E1', x: 16, space: 'corridor', units: [['midget', 4]] }],
      weapons: [{ id: 'sg-alley', x: 30, gun: 'shotgun', why: 'E2 mall corridors' }],
      mechanisms: [
        { kind: 'door', id: 'mall-door', x: 34, opens: 'E1.cleared' },
        { kind: 'switch', id: 'gate-switch', x: 12, opens: 'side-door' },
        { kind: 'door', id: 'side-door', x: 14, opens: 'switch:gate-switch' },
        { kind: 'barrel', id: 'barrel-1', x: 22 },
      ],
      checkpoints: [{ id: 'cp1', x: 36, when: 'E1.cleared' }],
      secret: { x: 10, modifier: 'bigHead' },
      cover: [{ x: 20, h: 1.2 }],
    },
    {
      id: 'S2', name: 'Mall', length: 48, transition: 'seamless',
      encounters: [{ id: 'E2', x: 16, space: 'interior', units: [['obama', 2], ['flyingMidget', 2]] }],
      mechanisms: [
        { kind: 'jumpPad', id: 'lift-pad', x: 12, power: 10 },
        { kind: 'mover', id: 'parking-lift', x: 28 },
      ],
      checkpoints: [{ id: 'cp2', x: 34, when: 'E2.cleared' }],
      cover: [{ x: 22, h: 1.4 }],
    },
    {
      id: 'S3', name: 'Gate Plaza', length: 48,
      intro: card('Gate Plaza', ['A Big Bitcoin Obama is counting the take.', 'The gate does not open until he drops it.']),
      encounters: [{ id: 'E3', x: 16, space: 'arena', units: [['bigObama', 1]] }],
      checkpoints: [{ id: 'cp3', x: 8, when: 'E3.cleared' }],
    },
  ],
});

export const L02 = makeLevel({
  id: 'L02', name: 'The Grand Bazaar', stage: 'desert', tier: 2, parTime: 18 * 60,
  sections: [
    {
      id: 'S1', name: 'Souk Alleys', length: 50, floor: 'sand',
      encounters: [{ id: 'E1', x: 16, space: 'corridor', units: [['riotMidget', 3], ['obama', 2]] }],
      weapons: [{ id: 'sg-souk', x: 28, gun: 'shotgun', why: 'phalanx in the alleys' }],
      mechanisms: [
        { kind: 'hazard', id: 'quicksand', x: 24, slow: 0.45, dps: 0 },
        { kind: 'barrel', id: 'spice-barrel', x: 20 },
      ],
      secret: { x: 8, modifier: 'confetti' },
    },
    {
      id: 'S2', name: 'Dune Sea', length: 52, floor: 'sand',
      intro: card('Into the Dunes', ['The souk was the easy part.', "Sahil's caravan route crosses the Dune Sea."]),
      encounters: [{ id: 'E2', x: 18, space: 'field', units: [['boomMidget', 4]] }],
      mechanisms: [
        { kind: 'jumpPad', id: 'sand-geyser', x: 12, power: 12 },
        { kind: 'carpet', id: 'carpet-1', x: 30 },
        { kind: 'power', id: 'overshield', x: 36, modifier: 'overshield' },
      ],
    },
    {
      id: 'S3', name: 'Canyon Rim', length: 50, floor: 'sand',
      encounters: [{ id: 'E3', x: 16, space: 'ledge', units: [['hexAcolyte', 3]] }],
      weapons: [{ id: 'sn-rim', x: 30, gun: 'sniper', why: 'acolytes across the rim' }],
      mechanisms: [{ kind: 'zipline', id: 'clothesline', x: 22 }],
    },
    {
      id: 'S4', name: 'Bazaar Gate', length: 48,
      intro: card('The Grand Bazaar', ['Sahil the RugMaster.', 'He sells the floor out from under you.']),
      encounters: [{ id: 'E4', x: 16, space: 'arena', objective: 'boss', units: [['sahil', 1]] }],
      weapons: [{ id: 'bz-sahil', x: 10, gun: 'bazooka', why: 'Sahil at the gate' }],
    },
  ],
});

export const L03 = makeLevel({
  id: 'L03', name: 'The Vegetable Grove', stage: 'grove', tier: 3, parTime: 18 * 60,
  sections: [
    {
      id: 'S1', name: 'Crop Fields', length: 52, floor: 'dirt',
      encounters: [{ id: 'E1', x: 18, space: 'field', units: [['floretSprout', 3]] }],
      weapons: [{ id: 'sn-field', x: 10, gun: 'sniper', why: 'sprouts across the furrows' }],
      mechanisms: [{ kind: 'jumpPad', id: 'mushroom', x: 28, power: 11 }],
      secret: { x: 8, modifier: 'floorIsLava' },
    },
    {
      id: 'S2', name: 'Hedge Maze', length: 52, floor: 'hedge',
      encounters: [{ id: 'E2', x: 16, space: 'corridor', units: [['sewerMidget', 4], ['daycare', 1]] }],
      weapons: [
        { id: 'mg-maze', x: 26, gun: 'mg', why: 'burrowers in the hedges' },
        { id: 'sg-maze', x: 30, gun: 'shotgun', why: 'close hedges' },
      ],
      mechanisms: [{ kind: 'bridge', id: 'vine-bridge', x: 34 }, { kind: 'power', id: 'turbo', x: 12, modifier: 'turbo' }],
      cover: [{ x: 20, h: 1.6, z: 8 }, { x: 22, h: 1.6, z: 14 }],
    },
    {
      id: 'S3', name: 'Greenhouses', length: 46, floor: 'dirt',
      encounters: [{ id: 'E3', x: 16, space: 'interior', units: [['floretSprout', 2], ['midget', 3]] }],
      mechanisms: [{ kind: 'hazard', id: 'runoff', x: 24, dps: 10 }, { kind: 'door', id: 'airlock', x: 34, opens: 'E3.cleared' }],
    },
    {
      id: 'S4', name: 'The Patch', length: 46,
      intro: card('Something Smells Green', ['The Floret Lord is only a sprout.', 'He will not stay for the whole fight.']),
      encounters: [{ id: 'E4', x: 16, space: 'arena', objective: 'boss', fleeAt: 0.5, units: [['broccoli', 1]] }],
      weapons: [{ id: 'bz-nest', x: 10, gun: 'bazooka', why: 'the sprout in the patch' }],
    },
  ],
});

export const L04 = makeLevel({
  id: 'L04', name: 'The Blockchain Void', stage: 'void', tier: 4, parTime: 18 * 60, jetpack: 'pickup',
  sections: [
    {
      id: 'S1', name: 'Candle Forest', length: 52, floor: 'metal',
      encounters: [{ id: 'E1', x: 18, space: 'sky', units: [['bitbug', 5]] }],
      weapons: [{ id: 'mg-bugs', x: 28, gun: 'mg', why: 'bitbug flocks' }],
      mechanisms: [
        { kind: 'jetpack', id: 'jetpack-1', x: 12 },
        { kind: 'jumpPad', id: 'updraft', x: 22, power: 14 },
      ],
      secret: { x: 8, modifier: 'moonBoots' },
    },
    {
      id: 'S2', name: 'Mine Field', length: 52, floor: 'metal',
      intro: card('Liquidity', ['Bitcoin Obama pumps the price. The Midget dumps it.', 'You ride the chart.']),
      encounters: [{ id: 'E2', x: 16, space: 'sky', units: [['jetObama', 2], ['balloonMidget', 3]] }],
      weapons: [{ id: 'sn-mine', x: 30, gun: 'sniper', why: 'jet Obamas between candles' }],
      mechanisms: [
        { kind: 'fuel', id: 'fuel-1', x: 12 },
        { kind: 'hazard', id: 'gravity-well', x: 24, slow: 0.4, dps: 0 },
        { kind: 'power', id: 'infinite-fuel', x: 36, modifier: 'fuel' },
      ],
    },
    {
      id: 'S3', name: 'The Exchange', length: 50,
      intro: card('The Blockchain Void', ['The Pump and Dump Duo.', 'One counts. One flies.']),
      encounters: [{ id: 'E3', x: 16, space: 'arena', objective: 'boss', units: [['obamaDuo', 1], ['midgetDuo', 1]] }],
      weapons: [{ id: 'bz-duo', x: 10, gun: 'bazooka', why: 'the duo on the exchange floor' }],
    },
  ],
});

export const L05 = makeLevel({
  id: 'L05', name: 'Frostspire Black Site', stage: 'glacier', tier: 5, parTime: 18 * 60,
  sections: [
    {
      id: 'S1', name: 'Snowfield', length: 54, floor: 'ice',
      encounters: [{ id: 'E1', x: 18, space: 'field', units: [['auditSniper', 2], ['miningRig', 1]] }],
      weapons: [
        { id: 'sn-snow', x: 10, gun: 'sniper', why: 'snipers on the snowfield' },
        { id: 'bz-turret', x: 14, gun: 'bazooka', why: 'mining rig turret' },
      ],
      mechanisms: [{ kind: 'hazard', id: 'ice-slick', x: 26, slow: 0.2, dps: 0 }],
      secret: { x: 8, modifier: 'taxSeason' },
    },
    {
      id: 'S2', name: 'Bunkers', length: 48, floor: 'ice',
      encounters: [{ id: 'E2', x: 16, space: 'interior', units: [['glowieAgent', 4]] }],
      mechanisms: [
        { kind: 'switch', id: 'generator', x: 12, opens: 'shield-gate' },
        { kind: 'door', id: 'shield-gate', x: 34, opens: 'switch:generator' },
      ],
    },
    {
      id: 'S3', name: 'Frost Halls', length: 48, floor: 'ice',
      encounters: [{ id: 'E3', x: 16, space: 'hold', units: [['glowieAgent', 2], ['auditSniper', 2]] }],
      weapons: [{ id: 'sg-hall', x: 28, gun: 'shotgun', why: 'frost halls' }],
      mechanisms: [{ kind: 'hazard', id: 'drone-strike', x: 22, dps: 6 }],
    },
  ],
});

export const L06 = makeLevel({
  id: 'L06', name: 'Vape Cabal Skyline', stage: 'city', tier: 6, parTime: 22 * 60, jetpack: true,
  lighting: { weather: 'rain' },
  sections: [
    {
      id: 'S1', name: 'Freeway', length: 56, floor: 'metal',
      encounters: [{ id: 'E1', x: 18, space: 'rail', units: [['boomMidget', 3], ['riotMidget', 2]] }],
      weapons: [{ id: 'sg-traffic', x: 30, gun: 'shotgun', why: 'traffic jam' }],
      mechanisms: [{ kind: 'crusher', id: 'bus-lane', x: 24 }],
      secret: { x: 8, modifier: 'duckHunt' },
    },
    {
      id: 'S2', name: 'Crane Yard', length: 50, floor: 'metal',
      encounters: [{ id: 'E2', x: 16, space: 'vertical', units: [['jetObama', 3]] }],
      weapons: [{ id: 'sn-crane', x: 28, gun: 'sniper', why: 'crane cab overlook' }],
      mechanisms: [{ kind: 'zipline', id: 'roof-line', x: 20 }, { kind: 'mover', id: 'crane-hook', x: 34 }],
    },
    {
      id: 'S3', name: 'Rain Canyon', length: 50, floor: 'metal',
      encounters: [{ id: 'E3', x: 16, space: 'sky', units: [['bitbug', 4], ['balloonMidget', 2]] }],
      weapons: [{ id: 'mg-canyon', x: 12, gun: 'mg', why: 'bitbugs in the canyon' }],
    },
    {
      id: 'S4', name: 'Cabal Streets', length: 48,
      intro: card('Los Angeles', ['Broccoli Head owns the night.', 'The clouds are not weather.']),
      encounters: [{ id: 'E4', x: 16, space: 'arena', objective: 'boss', units: [['broccoli', 1]] }],
      weapons: [{ id: 'bz-broc', x: 10, gun: 'bazooka', why: 'Broccoli Head' }],
    },
  ],
});

export const L07 = makeLevel({
  id: 'L07', name: 'Hellfire Underworks', stage: 'volcano', tier: 7, parTime: 16 * 60,
  sections: [
    {
      id: 'S1', name: 'Shafts', length: 48, floor: 'rock',
      encounters: [{ id: 'E1', x: 16, space: 'interior', units: [['miniTinubu', 2], ['midget', 2]] }],
      weapons: [{ id: 'sg-shaft', x: 28, gun: 'shotgun', why: 'chargers in the shafts' }],
      mechanisms: [{ kind: 'barrel', id: 'ore-barrel', x: 20 }],
      secret: { x: 8, modifier: 'lightsOut' },
    },
    {
      id: 'S2', name: 'Cart Run', length: 52, floor: 'rock',
      encounters: [{ id: 'E2', x: 18, space: 'rail', units: [['midget', 4]] }],
      weapons: [{ id: 'sn-cart', x: 12, gun: 'sniper', why: 'the cart ride' }],
      mechanisms: [{ kind: 'rail', id: 'mine-cart', x: 22 }],
    },
    {
      id: 'S3', name: 'Furnace Gallery', length: 48, floor: 'rock',
      encounters: [{ id: 'E3', x: 16, space: 'arena', units: [['miniTinubu', 2], ['boomMidget', 2]] }],
      mechanisms: [{ kind: 'hazard', id: 'lava-run', x: 26, dps: 14 }, { kind: 'crusher', id: 'press', x: 32 }],
    },
    {
      id: 'S4', name: 'Meltdown', length: 48, floor: 'rock',
      intro: card('MELTDOWN', ['Reactors at 300%.', "Tinubu calls this a controlled burn. Run."]),
      encounters: [{ id: 'E4', x: 16, space: 'corridor', units: [['miniTinubu', 2]] }],
      weapons: [{ id: 'bz-reactor', x: 10, gun: 'bazooka', why: 'the reactor ring' }],
    },
  ],
});

export const L08 = makeLevel({
  id: 'L08', name: 'Government Office', stage: 'office', tier: 8, parTime: 18 * 60,
  sections: [
    {
      id: 'S1', name: 'Lobby', length: 48, floor: 'metal',
      encounters: [{ id: 'E1', x: 16, space: 'interior', units: [['glowieAgent', 4]] }],
      weapons: [{ id: 'mg-lobby', x: 28, gun: 'mg', why: 'the lobby' }],
      mechanisms: [
        { kind: 'laser', id: 'lobby-laser', x: 22 },
        { kind: 'door', id: 'turnstile', x: 34, opens: 'E1.cleared' },
      ],
      secret: { x: 8, modifier: 'redTape' },
    },
    {
      id: 'S2', name: 'Cubicle Farm', length: 48, floor: 'metal',
      encounters: [{ id: 'E2', x: 16, space: 'corridor', units: [['riotMidget', 2], ['glowieAgent', 2]] }],
      weapons: [{ id: 'sg-cubes', x: 28, gun: 'shotgun', why: 'cubicle farm' }],
      mechanisms: [{ kind: 'elevator', id: 'lift-2', x: 34, y: 0.4 }],
    },
    {
      id: 'S3', name: 'Server Floor', length: 48, floor: 'metal',
      encounters: [{ id: 'E3', x: 16, space: 'interior', units: [['auditSniper', 2], ['hexAcolyte', 2]] }],
      weapons: [{ id: 'sn-atrium', x: 28, gun: 'sniper', why: 'the atrium sightline' }],
      mechanisms: [{ kind: 'laser', id: 'server-grid', x: 22, dps: 8 }],
    },
    {
      id: 'S4', name: 'The Roof', length: 48,
      intro: card('Government Office', ['Glowie has a badge and a flashbang.', 'Look away.']),
      encounters: [{ id: 'E4', x: 16, space: 'arena', objective: 'boss', units: [['glowie', 1]] }],
      weapons: [{ id: 'bz-glowie', x: 10, gun: 'bazooka', why: 'Glowie on the roof' }],
    },
  ],
});

export const L09 = makeLevel({
  id: 'L09', name: 'Moonlit Ruins', stage: 'moonlit', tier: 9, parTime: 28 * 60, jetpack: 'pickup',
  sections: [
    {
      id: 'S1', name: 'Ruin Plains', length: 56, floor: 'rock',
      encounters: [{ id: 'E1', x: 18, space: 'field', units: [['glowieAgent', 2], ['obama', 2], ['midget', 2]] }],
      weapons: [
        { id: 'mg-camp', x: 10, gun: 'mg', why: 'camp cache' },
        { id: 'sn-camp', x: 14, gun: 'sniper', why: 'camp cache' },
        { id: 'bz-camp', x: 18, gun: 'bazooka', why: 'camp cache' },
      ],
      mechanisms: [
        { kind: 'portal', id: 'moon-gate', x: 30, dx: 8 },
        { kind: 'jetpack', id: 'moon-pack', x: 36 },
        { kind: 'hazard', id: 'low-g', x: 24, slow: 0, dps: 0 },
      ],
      secret: { x: 8, modifier: 'swarmSurge' },
    },
    {
      id: 'S2', name: 'Catacombs', length: 50, floor: 'rock',
      intro: card('Descent', ['The plains were the map.', 'The dead keep the other one.']),
      encounters: [{ id: 'E2', x: 16, space: 'interior', units: [['hexAcolyte', 3], ['sewerMidget', 3]] }],
      weapons: [{ id: 'sg-cata', x: 28, gun: 'shotgun', why: 'catacomb standee' }],
    },
    {
      id: 'S3', name: 'Moon Gate', length: 50,
      intro: card('The Moon Gate', ['Two Big Obamas. One key.', 'Something older is waking up.']),
      encounters: [
        { id: 'E3', x: 14, space: 'arena', units: [['bigObama', 2]] },
        { id: 'E4', x: 28, space: 'arena', objective: 'boss', fleeAt: 0.7, units: [['tinubu', 1]] },
      ],
    },
  ],
});

export const L10 = makeLevel({
  id: 'L10', name: 'Hellfire Caldera', stage: 'volcano', tier: 10, parTime: 30 * 60, jetpack: true,
  sections: [
    {
      id: 'S1', name: 'Ridge Trail', length: 54, floor: 'rock',
      encounters: [{ id: 'E1', x: 18, space: 'ledge', units: [['miniTinubu', 2], ['auditSniper', 2]] }],
      weapons: [
        { id: 'mg-cache', x: 8, gun: 'mg', why: 'ridge cache' },
        { id: 'sg-cache', x: 12, gun: 'shotgun', why: 'ridge cache' },
        { id: 'sn-cache', x: 16, gun: 'sniper', why: 'ridge cache' },
        { id: 'bz-cache', x: 20, gun: 'bazooka', why: 'ridge cache' },
      ],
      mechanisms: [{ kind: 'bridge', id: 'rope-bridge', x: 32 }, { kind: 'barrel', id: 'ridge-barrel', x: 26 }],
      secret: { x: 6, modifier: 'ironSproto' },
    },
    {
      id: 'S2', name: 'Geyser Fields', length: 52, floor: 'rock',
      encounters: [{ id: 'E2', x: 16, space: 'field', units: [['boomMidget', 3], ['jetObama', 2]] }],
      mechanisms: [
        { kind: 'jumpPad', id: 'geyser', x: 12, power: 13 },
        { kind: 'hazard', id: 'lava-pool', x: 28, dps: 16 },
      ],
    },
    {
      id: 'S3', name: 'The Caldera', length: 50,
      intro: card('Hellfire Caldera', ['Tinubu the Unshackled Demon.', 'This is the audit.']),
      encounters: [{ id: 'E3', x: 16, space: 'arena', objective: 'boss', units: [['tinubu', 1]] }],
    },
    {
      id: 'S4', name: 'Eruption', length: 46, floor: 'rock',
      intro: card('ERUPTION', ['The Demon is down. The volcano disagrees.', 'Fly.']),
      encounters: [{ id: 'E4', x: 16, space: 'sky', units: [['flyingMidget', 3], ['bitbug', 3]] }],
      mechanisms: [{ kind: 'fuel', id: 'last-fuel', x: 10 }, { kind: 'jumpPad', id: 'vent', x: 24, power: 14 }],
    },
  ],
});

export const CAMPAIGN_LEVELS = [L01, L02, L03, L04, L05, L06, L07, L08, L09, L10];

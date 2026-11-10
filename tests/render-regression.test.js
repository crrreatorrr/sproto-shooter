import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { structureOf } from '../scripts/optimize-assets.mjs';

function glbJson(rel) {
  const buf = fs.readFileSync(rel);
  const jsonLen = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
}

describe('render structure', () => {
  it('does not recompress assets that are already inside the edge cap', () => {
    execFileSync(process.execPath, ['scripts/optimize-assets.mjs', '--check'], { stdio: 'pipe' });
  });

  it('keeps player feet, dragon clips, and gun materials', () => {
    const player = structureOf(glbJson('public/assets/models/characters/sproto_player.glb'));
    expect(player.meshopt).toBe(true);
    expect(player.skins.length).toBe(1);
    expect(player.skins[0]).toBeGreaterThan(20);
    expect(player.nodes.some((name) => name.includes('LeftFoot'))).toBe(true);
    expect(player.nodes.some((name) => name.includes('RightFoot'))).toBe(true);
    expect(player.nodes.some((name) => name.includes('Hips'))).toBe(true);
    expect(player.materials.length).toBeGreaterThan(0);

    const dragon = structureOf(glbJson('public/assets/models/characters/dragon.glb'));
    expect(dragon.meshopt).toBe(true);
    expect(dragon.clips.map((clip) => clip.name).sort()).toEqual(['fireball', 'fly', 'idle', 'run', 'walk']);
    expect(dragon.skins[0]).toBeGreaterThan(0);

    const monster = structureOf(glbJson('public/assets/models/characters/monster.glb'));
    expect(monster.clips.map((clip) => clip.name).sort()).toEqual(['idle', 'run', 'smash', 'walk']);
    expect(monster.nodes.some((name) => name.includes('LeftFoot'))).toBe(true);

    const sniper = structureOf(glbJson('public/assets/models/guns/toy_sniper.glb'));
    expect(sniper.meshopt).toBe(true);
    expect(sniper.materials).toEqual(['tripo_material_d5c03414-1c4c-4b55-b958-1b580dbef7b0']);
    const mg = structureOf(glbJson('public/assets/models/guns/toy_mg.glb'));
    expect(mg.materials).toEqual(['tripo_material_a4c1903b-26c4-42ce-8fa7-9708177cab02']);
  });

  it('ships a complete Pepe rig, weapon socket and arena clip set for each selectable skin', () => {
    for (const id of ['pepe', 'pepe-general', 'pepe-tux']) {
      const rig = structureOf(glbJson(`public/assets/models/characters/${id}.glb`));
      expect(rig.meshopt).toBe(true);
      expect(rig.skins.length).toBe(1);
      expect(rig.nodes).toEqual(expect.arrayContaining(['weapon_grip', 'weapon_aim']));
      expect(rig.clips.map(({ name }) => name).sort()).toEqual(['dash', 'idle', 'jog', 'ready', 'reload', 'shoot']);
      expect(rig.clips.every(({ channels }) => channels > 0)).toBe(true);
    }
  });

  it('ships the hands, reload, sniper, boss, and campaign shots', () => {
    for (const name of ['hands', 'reload', 'sniper', 'boss', 'campaign']) {
      const stat = fs.statSync(`tests/fixtures/screenshots/${name}.png`);
      expect(stat.size).toBeGreaterThan(1000);
    }
  });
});

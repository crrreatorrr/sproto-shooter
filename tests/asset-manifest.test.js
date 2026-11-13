import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BASELINE_COMMIT, buildManifest, fingerprint, walkFiles } from '../scripts/asset-report.mjs';

const fixture = JSON.parse(fs.readFileSync('tests/fixtures/asset-manifest.json', 'utf8'));

function runtimeFiles() {
  return walkFiles('public/assets').map((file) => path.relative('public/assets', file)).sort();
}

describe('asset manifest', () => {
  const manifest = buildManifest();

  it('matches the committed inventory from the accepted main', () => {
    expect(manifest.baselineCommit).toBe(BASELINE_COMMIT);
    expect(BASELINE_COMMIT).toBe('8a5676ed24700dafd15a759c1e2fa71b470180b9');
    expect(fingerprint(manifest)).toEqual(fingerprint(fixture));
  });

  it('fails closed on missing refs and does not delete unused files', () => {
    const before = runtimeFiles();
    const again = buildManifest();
    expect(again.missing).toEqual([]);
    expect(Array.isArray(again.unused)).toBe(true);
    expect(runtimeFiles()).toEqual(before);
  });

  it('includes dynamic stage and character paths', () => {
    const byPath = new Map(manifest.references.map((row) => [row.path, row]));
    expect(byPath.get('models/characters/midget_stage1.glb')?.kind).toBe('dynamic');
    expect(byPath.get('textures/stages/city/floor.jpg')?.kind).toBe('dynamic');
    expect(byPath.get('textures/stages/glacier/floor.jpg')?.kind).toBe('dynamic');
    expect(byPath.get('models/guns/toy_raygun.glb')?.kind).toContain('static');
    expect(byPath.get('models/characters/sproto_player.glb')?.kind).toContain('static');
  });

  it('records dimensions and decoded sizes', () => {
    const floor = manifest.assets.find((asset) => asset.path === 'textures/stages/city/floor.jpg');
    expect(floor.width).toBe(1024);
    expect(floor.height).toBe(1024);
    expect(floor.decodedBytes).toBe(1024 * 1024 * 4);
    const dragon = manifest.assets.find((asset) => asset.path === 'models/characters/dragon.glb');
    expect(dragon.meshopt).toBe(true);
    expect(dragon.images.length).toBeGreaterThan(0);
    expect(dragon.images.every((image) => image.width > 0 && image.decodedBytes === image.width * image.height * 4)).toBe(true);
    expect(dragon.decodedBytes).toBe(dragon.meshoptDecodedBytes + dragon.imageDecodedBytes);
  });

  it('keeps authoring Blender files out of the runtime set', () => {
    expect(manifest.authoring.blenderFiles.map((file) => file.path)).toEqual([
      'art/blender/blockchain_void.blend',
      'art/blender/boss_animations.blend',
      'art/blender/campaign_art_polish.blend',
      'art/blender/cartoon_kit.blend',
      'art/blender/frostspire_black_site.blend',
      'art/blender/fx_explosion.blend',
      'art/blender/fx_poof.blend',
      'art/blender/government_office.blend',
      'art/blender/grappler.blend',
      'art/blender/hellfire_underworks.blend',
      'art/blender/moonlit_ruins.blend',
      'art/blender/new_enemies.blend',
      'art/blender/vape_cabal_skyline.blend',
      'art/blender/vegetable_grove.blend',
      'art/blender/weapon_animations.blend',
    ]);
    expect(manifest.authoring.shippedInPublic).toBe(false);
    expect(manifest.assets.some((asset) => asset.path.endsWith('.blend'))).toBe(false);
  });
});

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((ent) => {
    const full = path.join(dir, ent.name);
    return ent.isDirectory() ? walk(full) : [full];
  });
}

describe('syntax', () => {
  it('parses first-party scripts', () => {
    const files = [
      ...walk('src').filter((file) => file.endsWith('.js')),
      ...walk('scripts').filter((file) => file.endsWith('.mjs')),
      'eslint.config.js',
    ];
    expect(files.length).toBeGreaterThan(50);
    for (const file of files) {
      try {
        execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
      } catch (err) {
        const detail = err.stderr ? err.stderr.toString() : err.message;
        throw new Error(`${file}\n${detail}`);
      }
    }
  });
});

describe('sim boundary', () => {
  it('sim and data never touch three, the DOM, Math.random, or the wall clock', () => {
    const files = [...walk('src/sim'), ...walk('src/data')].filter((file) => file.endsWith('.js'));
    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8');
      expect(src, file).not.toMatch(/from 'three'|\bwindow\.|\bdocument\.|Math\.random|Date\.now|performance\.now/);
    }
  });
});

describe('loading architecture', () => {
  it('keeps meshopt, the 4-wide priority queue, and per-level requests', () => {
    const assets = fs.readFileSync('src/render/assets.js', 'utf8');
    const hands = fs.readFileSync('src/render/firstPerson.js', 'utf8');
    const renderer = fs.readFileSync('src/render/renderer.js', 'utf8');
    expect(assets).toMatch(/setMeshoptDecoder\(MeshoptDecoder\)/);
    expect(assets).toMatch(/const NOW = 0, LATER = 1/);
    expect(assets).toMatch(/const MAX_PARALLEL = 4/);
    expect(hands).toMatch(/setMeshoptDecoder\(MeshoptDecoder\)/);
    expect(renderer).toMatch(/levelAssets\(/);
    expect(renderer).toMatch(/ensureStage\(/);
    expect(renderer).toMatch(/ensureCharacter\(/);
    expect(renderer).not.toMatch(/for\s*\([^)]*CHARACTER_MODELS/);
  });
});

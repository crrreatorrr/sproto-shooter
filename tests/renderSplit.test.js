import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

describe('renderer split', () => {
  it('keeps the facade small and every render module under 400 lines', () => {
    const files = walk('src/render').filter((f) => f.endsWith('.js'));
    const facade = files.find((f) => f.endsWith(`${path.sep}renderer.js`));
    expect(facade).toBeTruthy();
    const facadeLines = fs.readFileSync(facade, 'utf8').split('\n').length;
    expect(facadeLines).toBeLessThanOrEqual(200);
    for (const f of files) {
      const lines = fs.readFileSync(f, 'utf8').split('\n').length;
      expect(lines, f).toBeLessThanOrEqual(400);
    }
  });
});

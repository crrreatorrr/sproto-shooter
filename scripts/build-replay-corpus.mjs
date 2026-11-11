// Execute in GitHub Actions; outputs contain test inputs, never user recordings.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { CASES, generateCase } from '../tests/server/replay-corpus.js';

const out = process.argv[2];
if (!out) throw new Error('usage: node scripts/build-replay-corpus.mjs <output-directory>');
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
fs.mkdirSync(out, { recursive: true });
for (const spec of CASES) {
  const fixture = generateCase(spec, sourceCommit);
  fs.writeFileSync(path.join(out, `${spec.id}.json`), JSON.stringify(fixture) + '\n');
  console.log(JSON.stringify({ id: spec.id, outcome: fixture.expected.outcome, eligible: fixture.expected.eligible, tick: fixture.expected.tick, terminalTick: fixture.terminalTick }));
}

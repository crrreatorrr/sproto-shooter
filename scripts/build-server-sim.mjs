// Bundle the pure verifier for Node, browsers, and goja. No Tickets are minted.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { LIMITS, PROTOCOL_VERSION } from '../src/server/protocol.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'build');
const bundlePath = path.join(outDir, 'shooter-sim.js');
const pinPath = path.join(outDir, 'shooter-sim.pin.json');
const PLACEHOLDER = '0000000000000000000000000000000000000000';

const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
fs.mkdirSync(outDir, { recursive: true });

await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/server/verify.js'],
  bundle: true,
  format: 'iife',
  globalName: 'SprotoShooterSim',
  platform: 'neutral',
  target: 'es2020',
  outfile: bundlePath,
  legalComments: 'none',
  banner: { js: 'globalThis.__SPROTO_VERIFY_BUNDLE = true;' },
  footer: { js: 'globalThis.SprotoShooterSim = SprotoShooterSim;' },
});

let src = fs.readFileSync(bundlePath, 'utf8');
if (!src.includes(PLACEHOLDER)) throw new Error('source pin placeholder missing from bundle');
src = src.split(PLACEHOLDER).join(commit);
fs.writeFileSync(bundlePath, src);

const bundleSha256 = createHash('sha256').update(src).digest('hex');
const pin = {
  protocol: PROTOCOL_VERSION,
  global: 'SprotoShooterSim',
  entry: 'verifyRun',
  jsonEntry: 'verifyRunJSON',
  sourceCommit: commit,
  contentFingerprint: contentFingerprint(PROTOCOL_VERSION),
  bundlePath: 'build/shooter-sim.js',
  bundleBytes: Buffer.byteLength(src),
  bundleSha256,
  limits: LIMITS,
  mintsTickets: false,
};
fs.writeFileSync(pinPath, `${JSON.stringify(pin, null, 2)}\n`);
process.stdout.write(`${bundlePath}\n${bundleSha256}\n`);

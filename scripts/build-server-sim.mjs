// Bundle the pure verifier for Node, browsers, and goja. No Tickets are minted.
// The campaign bundle stays protocol 1. The free arena is a second export.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { LIMITS, PROTOCOL_VERSION } from '../src/server/protocol.js';
import {
  CONTENT_FINGERPRINT, INPUT_LIMITS, LEAD_IN_TICKS, LOADOUT_HASH, PVP_PROTOCOL_VERSION, PVP_SIM_VERSION,
  REPLAY_LIMITS, REWIND, matchmakerQuery,
} from '../src/sim/pvp/rules.js';
import { DIRECTOR_STATE_VERSION } from '../src/sim/pvp/director.js';
import { UPLOAD_PROTOCOL_VERSION, REPLAY_API_VERSION, INCREMENTAL_CHECKPOINT_SCHEMA_VERSION } from '../src/server/incremental.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLACEHOLDER = '0000000000000000000000000000000000000000';

// The paths metaverse-hub treats as sim sources (its scripts/shooter-main-pin.mjs). A bundle input
// outside them would let the bundle change without the hub noticing, so the build refuses it.
export const SIM_PATHS = ['src/sim/', 'src/server/', 'src/net/', 'src/data/', 'src/core/', 'scripts/build-server-sim.mjs'];

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

/**
 * The commit the bundles bake: the last one that changed a sim path, so a commit that only touches
 * the client, assets or docs rebuilds the same bytes and the hub's vendored pin stays current.
 * SHOOTER_SIM_COMMIT overrides it. A shallow clone that cannot see that far back (the hub
 * re-vendors from a depth-1 fetch) bakes HEAD, as before.
 */
export function simCommit() {
  const forced = process.env.SHOOTER_SIM_COMMIT || '';
  if (forced) {
    if (!/^[0-9a-f]{40}$/.test(forced)) throw new Error('SHOOTER_SIM_COMMIT must be a 40-hex commit');
    return forced;
  }
  const head = git(['rev-parse', 'HEAD']);
  const dirty = git(['status', '--porcelain', '--', ...SIM_PATHS]);
  if (dirty) return head; // uncommitted sim edits: never name an older commit for them
  const last = git(['log', '-1', '--format=%H', 'HEAD', '--', ...SIM_PATHS]);
  if (!/^[0-9a-f]{40}$/.test(last)) return head;
  const shallowFile = git(['rev-parse', '--git-path', 'shallow']);
  const boundary = fs.existsSync(path.resolve(root, shallowFile))
    ? fs.readFileSync(path.resolve(root, shallowFile), 'utf8').split(/\s+/).filter(Boolean)
    : [];
  // At a shallow boundary every file looks newly added, so `last` proves nothing.
  return boundary.includes(last) ? head : last;
}

function inputsOutsideSim(metafile) {
  return Object.keys(metafile.inputs).filter((file) => !SIM_PATHS.some((prefix) => file.startsWith(prefix)));
}

/** sha256 over the bundle's input files (path and bytes, sorted): the same for the same sim sources. */
function contentHashOf(metafile) {
  const hash = createHash('sha256');
  for (const file of Object.keys(metafile.inputs).sort()) {
    hash.update(`${file}\0`);
    hash.update(fs.readFileSync(path.join(root, file)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

async function bundle(entry, outfile, globalName, banner) {
  const commit = simCommit();
  const result = await esbuild.build({
    metafile: true,
    absWorkingDir: root,
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    globalName,
    platform: 'neutral',
    target: 'es2020',
    outfile,
    legalComments: 'none',
    banner: banner ? { js: banner } : undefined,
    footer: { js: `globalThis.${globalName} = ${globalName};` },
  });
  const outside = inputsOutsideSim(result.metafile);
  if (outside.length) throw new Error(`${outfile} bundles files outside the sim paths: ${outside.join(', ')}`);
  let src = fs.readFileSync(outfile, 'utf8');
  if (!src.includes(PLACEHOLDER)) throw new Error(`source pin placeholder missing from ${outfile}`);
  src = src.split(PLACEHOLDER).join(commit);
  fs.writeFileSync(outfile, src);
  return { src, commit, sha256: createHash('sha256').update(src).digest('hex'), contentHash: contentHashOf(result.metafile) };
}

export async function buildCampaignBundle(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const bundlePath = path.join(dir, 'shooter-sim.js');
  const built = await bundle('src/server/verify.js', bundlePath, 'SprotoShooterSim', 'globalThis.__SPROTO_VERIFY_BUNDLE = true;');
  const pin = {
    protocol: PROTOCOL_VERSION,
    global: 'SprotoShooterSim',
    entry: 'verifyRun',
    jsonEntry: 'verifyRunJSON',
    uploadProtocol: UPLOAD_PROTOCOL_VERSION,
    replayApiVersion: REPLAY_API_VERSION,
    checkpointSchema: INCREMENTAL_CHECKPOINT_SCHEMA_VERSION,
    sourceCommit: built.commit,
    sourceContentHash: built.contentHash,
    contentFingerprint: contentFingerprint(PROTOCOL_VERSION),
    bundlePath: 'build/shooter-sim.js',
    bundleBytes: Buffer.byteLength(built.src),
    bundleSha256: built.sha256,
    limits: LIMITS,
    mintsTickets: false,
  };
  fs.writeFileSync(path.join(dir, 'shooter-sim.pin.json'), `${JSON.stringify(pin, null, 2)}\n`);
  return pin;
}

export async function buildPvpBundle(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const bundlePath = path.join(dir, 'shooter-pvp-sim.js');
  const built = await bundle('src/sim/pvp/export.js', bundlePath, 'SprotoShooterPvp');
  const pin = {
    artifact: 'shooter-pvp',
    protocol: PVP_PROTOCOL_VERSION,
    sim: PVP_SIM_VERSION,
    contentFingerprint: CONTENT_FINGERPRINT,
    loadoutHash: LOADOUT_HASH,
    global: 'SprotoShooterPvp',
    entry: 'replayJSON',
    sourceCommit: built.commit,
    sourceContentHash: built.contentHash,
    bundlePath: 'build/shooter-pvp-sim.js',
    bundleBytes: Buffer.byteLength(built.src),
    bundleSha256: built.sha256,
    limits: INPUT_LIMITS,
    leadInTicks: LEAD_IN_TICKS,
    directorState: DIRECTOR_STATE_VERSION,
    replayVersion: 2,
    rewind: REWIND,
    replayLimits: REPLAY_LIMITS,
    crits: true,
    // sha256 commit in WELCOME/PHASE, reveal in RESULT; the RNG takes 128 bits of sha256(seed).
    combatSeed: 'sha256-commit-reveal-128',
    matchmakerQuery: matchmakerQuery(CONTENT_FINGERPRINT),
    mintsTickets: false,
    stakes: false,
    campaignProtocol: PROTOCOL_VERSION,
    campaignContentFingerprint: contentFingerprint(PROTOCOL_VERSION),
  };
  fs.writeFileSync(path.join(dir, 'shooter-pvp-sim.pin.json'), `${JSON.stringify(pin, null, 2)}\n`);
  return pin;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const outDir = path.join(root, 'build');
  const campaign = await buildCampaignBundle(outDir);
  const pvp = await buildPvpBundle(outDir);
  process.stdout.write(`${path.join(outDir, 'shooter-sim.js')}\n${campaign.bundleSha256}\n${path.join(outDir, 'shooter-pvp-sim.js')}\n${pvp.bundleSha256}\n`);
}

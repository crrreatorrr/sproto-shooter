// Runtime asset inventory for the accepted main baseline.
// Resolves static string refs and the dynamic stage/character paths the loader
// actually requests. Missing refs fail. Unused files are reported, not deleted.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { STAGE_IDS, stageAssets, CHARACTER_MODELS } from '../src/data/stages.js';
import { BOSSES } from '../src/data/enemies.js';
import { DUEL_BOSS_LIST } from '../src/data/duelBosses.js';

export const BASELINE_COMMIT = '8a5676ed24700dafd15a759c1e2fa71b470180b9';

const ASSET_EXT = 'glb|gltf|png|jpe?g|webp|gif|ktx2|basis';
const QUOTED_ASSET = new RegExp(`['"\`]([^'"\`\\n]*?\\.(?:${ASSET_EXT}))['"\`]`, 'gi');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

export function repoRoot() {
  return ROOT;
}

function posix(p) {
  return p.split(path.sep).join('/');
}

export function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkFiles(full));
    else if (ent.isFile()) out.push(full);
  }
  return out;
}

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function readJsonChunk(buf) {
  if (buf.toString('ascii', 0, 4) !== 'glTF') return null;
  const jsonLen = buf.readUInt32LE(12);
  const jsonType = buf.readUInt32LE(16);
  if (jsonType !== 0x4e4f534a) return null;
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  let offset = 20 + jsonLen;
  if (offset + 8 > buf.length) return { json, bin: Buffer.alloc(0) };
  const binLen = buf.readUInt32LE(offset);
  const binType = buf.readUInt32LE(offset + 4);
  if (binType !== 0x004e4942) return { json, bin: Buffer.alloc(0) };
  const bin = buf.subarray(offset + 8, offset + 8 + binLen);
  return { json, bin };
}

export function imageSize(buf) {
  if (buf.length >= 24 && buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') {
    return { mime: 'image/png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    const jpeg = jpegSize(buf);
    if (jpeg) return { mime: 'image/jpeg', ...jpeg };
  }
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const webp = webpSize(buf);
    if (webp) return { mime: 'image/webp', ...webp };
  }
  return null;
}

function jpegSize(buf) {
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i += 1; continue; }
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0xd9) { i += 2; continue; }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    const seglen = buf.readUInt16BE(i + 2);
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    if (seglen < 2) break;
    i += 2 + seglen;
  }
  return null;
}

function webpSize(buf) {
  let o = 12;
  while (o + 8 <= buf.length) {
    const tag = buf.toString('ascii', o, o + 4);
    const size = buf.readUInt32LE(o + 4);
    const data = o + 8;
    if (tag === 'VP8X' && size >= 10) {
      const width = 1 + (buf[data + 4] | (buf[data + 5] << 8) | (buf[data + 6] << 16));
      const height = 1 + (buf[data + 7] | (buf[data + 8] << 8) | (buf[data + 9] << 16));
      return { width, height };
    }
    if (tag === 'VP8 ' && size >= 10 && buf[data + 3] === 0x9d && buf[data + 4] === 0x01 && buf[data + 5] === 0x2a) {
      return { width: buf.readUInt16LE(data + 6) & 0x3fff, height: buf.readUInt16LE(data + 8) & 0x3fff };
    }
    if (tag === 'VP8L' && size >= 5 && buf[data] === 0x2f) {
      const bits = buf.readUInt32LE(data + 1);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    o += 8 + size + (size & 1);
  }
  return null;
}

function rgbaBytes(width, height) {
  if (!width || !height) return null;
  return width * height * 4;
}

function glbDetails(buf) {
  const parsed = readJsonChunk(buf);
  if (!parsed) return null;
  const { json, bin } = parsed;
  const images = [];
  for (const im of json.images || []) {
    if (im.bufferView == null) continue;
    const view = json.bufferViews?.[im.bufferView];
    if (!view || view.buffer !== 0) continue;
    const start = view.byteOffset || 0;
    const bytes = bin.subarray(start, start + view.byteLength);
    const dim = imageSize(bytes);
    const width = dim?.width ?? null;
    const height = dim?.height ?? null;
    images.push({
      name: im.name || null,
      mime: im.mimeType || dim?.mime || null,
      encodedBytes: view.byteLength,
      sha256: sha256(bytes),
      width,
      height,
      decodedBytes: rgbaBytes(width, height),
    });
  }
  const rig = {
    clips: (json.animations || []).map((clip) => clip.name || '').sort(),
    skins: (json.skins || []).length,
    joints: (json.skins || []).reduce((sum, skin) => sum + (skin.joints || []).length, 0),
    nodes: (json.nodes || []).length,
    materials: (json.materials || []).map((mat) => mat.name || '').sort(),
  };
  let meshoptDecodedBytes = 0;
  let triangles = 0;
  for (const view of json.bufferViews || []) {
    if (view.extensions?.EXT_meshopt_compression) meshoptDecodedBytes += view.byteLength || 0;
  }
  for (const mesh of json.meshes || []) {
    for (const prim of mesh.primitives || []) {
      const mode = prim.mode ?? 4;
      if (mode !== 4) continue;
      const accessorIndex = prim.indices ?? prim.attributes?.POSITION;
      const acc = accessorIndex == null ? null : json.accessors?.[accessorIndex];
      if (acc) triangles += Math.floor(acc.count / 3);
    }
  }
  const imageDecodedBytes = images.reduce((sum, im) => sum + (im.decodedBytes || 0), 0);
  return {
    meshopt: (json.extensionsUsed || []).includes('EXT_meshopt_compression'),
    meshoptDecodedBytes,
    imageDecodedBytes,
    decodedBytes: meshoptDecodedBytes + imageDecodedBytes,
    triangles,
    images,
    rig,
  };
}

function duplicateImages(assets) {
  const groups = new Map();
  const add = (hash, where, bytes) => {
    if (!hash) return;
    let row = groups.get(hash);
    if (!row) {
      row = { sha256: hash, bytes, uses: [] };
      groups.set(hash, row);
    }
    row.uses.push(where);
  };
  for (const asset of assets) {
    if (asset.kind === 'image') add(asset.sha256, asset.path, asset.bytes);
    for (const image of asset.images || []) add(image.sha256, `${asset.path}#${image.name || image.sha256.slice(0, 8)}`, image.encodedBytes);
  }
  return [...groups.values()]
    .filter((row) => row.uses.length > 1)
    .map((row) => ({ ...row, uses: row.uses.sort() }))
    .sort((a, b) => b.bytes - a.bytes || a.sha256.localeCompare(b.sha256));
}

function duplicateRigs(assets) {
  const groups = new Map();
  for (const asset of assets) {
    if (!asset.rig || !asset.rig.joints) continue;
    const key = JSON.stringify([asset.rig.clips, asset.rig.joints, asset.rig.nodes]);
    let row = groups.get(key);
    if (!row) {
      row = { clips: asset.rig.clips, joints: asset.rig.joints, nodes: asset.rig.nodes, paths: [] };
      groups.set(key, row);
    }
    row.paths.push(asset.path);
  }
  return [...groups.values()]
    .filter((row) => row.paths.length > 1)
    .map((row) => ({ ...row, paths: row.paths.sort() }))
    .sort((a, b) => a.paths[0].localeCompare(b.paths[0]));
}

function addRef(map, assetPath, from, kind) {
  const key = String(assetPath).replace(/^\/+/, '').replace(/^assets\//, '');
  if (!key || key.includes('${') || key.includes('://')) return;
  let row = map.get(key);
  if (!row) {
    row = { path: key, from: new Set(), kinds: new Set() };
    map.set(key, row);
  }
  row.from.add(from);
  row.kinds.add(kind);
}

function kindOf(kinds) {
  const hasStatic = kinds.has('static');
  const hasDynamic = kinds.has('dynamic');
  if (hasStatic && hasDynamic) return 'static+dynamic';
  if (hasDynamic) return 'dynamic';
  return 'static';
}

function scanTextRefs(map) {
  const files = [
    ...walkFiles(path.join(ROOT, 'src')).filter((f) => f.endsWith('.js') || f.endsWith('.css')),
    path.join(ROOT, 'index.html'),
  ];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    const from = posix(path.relative(ROOT, file));
    for (const match of text.matchAll(QUOTED_ASSET)) {
      addRef(map, match[1], from, 'static');
    }
  }
}

function scanDynamicRefs(map) {
  const from = 'src/data/stages.js';
  for (const id of STAGE_IDS) {
    const assets = stageAssets(id);
    for (const assetPath of Object.values(assets)) addRef(map, assetPath, from, 'dynamic');
  }
  for (const paths of Object.values(CHARACTER_MODELS)) {
    for (const assetPath of paths) addRef(map, assetPath, from, 'dynamic');
  }
  for (const boss of Object.values(BOSSES)) {
    for (const portrait of boss.portraits || []) addRef(map, portrait, 'src/data/enemies.js', 'static');
  }
  for (const boss of DUEL_BOSS_LIST) {
    for (const portrait of boss.portraits || []) addRef(map, portrait, 'src/data/duelBosses.js', 'static');
  }
}

function findBlender() {
  const art = path.join(ROOT, 'art');
  return walkFiles(art)
    .filter((f) => f.endsWith('.blend'))
    .map((f) => ({ path: posix(path.relative(ROOT, f)), bytes: fs.statSync(f).size }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function describeAsset(relPath, buf, ref) {
  const ext = path.extname(relPath).toLowerCase();
  const record = {
    path: relPath,
    bytes: buf.length,
    sha256: sha256(buf),
    referenced: !!ref,
    referenceKind: ref ? kindOf(ref.kinds) : null,
    referencedFrom: ref ? [...ref.from].sort() : [],
  };
  if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp' || ext === '.gif') {
    const dim = imageSize(buf);
    record.kind = 'image';
    record.width = dim?.width ?? null;
    record.height = dim?.height ?? null;
    record.decodedBytes = rgbaBytes(record.width, record.height);
    record.decodedNote = 'RGBA8 upload estimate, width * height * 4';
    return record;
  }
  if (ext === '.glb' || ext === '.gltf') {
    const details = ext === '.glb' ? glbDetails(buf) : null;
    record.kind = 'glb';
    record.width = null;
    record.height = null;
    record.meshopt = details?.meshopt ?? false;
    record.triangles = details?.triangles ?? null;
    record.meshoptDecodedBytes = details?.meshoptDecodedBytes ?? null;
    record.imageDecodedBytes = details?.imageDecodedBytes ?? null;
    record.decodedBytes = details?.decodedBytes ?? null;
    record.decodedNote = 'Embedded image RGBA8 plus meshopt-decoded buffer views. Meshopt views are the uncompressed payload, not a second codec.';
    record.images = details?.images ?? [];
    record.rig = details?.rig ?? null;
    return record;
  }
  record.kind = 'other';
  record.decodedBytes = null;
  return record;
}

export function buildManifest() {
  const refs = new Map();
  scanTextRefs(refs);
  scanDynamicRefs(refs);
  const assetRoot = path.join(ROOT, 'public', 'assets');
  const files = walkFiles(assetRoot).sort();
  const present = new Set();
  const assets = [];
  for (const file of files) {
    const relPath = posix(path.relative(assetRoot, file));
    present.add(relPath);
    const buf = fs.readFileSync(file);
    assets.push(describeAsset(relPath, buf, refs.get(relPath)));
  }
  assets.sort((a, b) => a.path.localeCompare(b.path));
  const references = [...refs.values()]
    .map((row) => ({ path: row.path, kind: kindOf(row.kinds), from: [...row.from].sort() }))
    .sort((a, b) => a.path.localeCompare(b.path));
  const missing = references.filter((row) => !present.has(row.path)).map((row) => row.path);
  const unused = assets.filter((asset) => !asset.referenced).map((asset) => ({
    path: asset.path,
    bytes: asset.bytes,
    sha256: asset.sha256,
  }));
  const blenderFiles = findBlender();
  const publicBlend = walkFiles(path.join(ROOT, 'public')).filter((f) => f.endsWith('.blend'));
  const dynamicPatterns = [
    {
      id: 'stageAssets',
      from: 'src/data/stages.js',
      template: 'textures/stages/${folder}/{floor,sky,stone}.jpg and models/stages/${folder}/{pillar,prop}.glb',
      note: 'folder is STAGE_TEXTURE[id] or the stage id, for every STAGE_IDS entry',
      paths: [...new Set(STAGE_IDS.flatMap((id) => Object.values(stageAssets(id))))].sort(),
    },
    {
      id: 'CHARACTER_MODELS',
      from: 'src/data/stages.js',
      template: 'per-model path list, including midget_stage${n}.glb style names',
      paths: [...new Set(Object.values(CHARACTER_MODELS).flat())].sort(),
    },
  ];
  return {
    schema: 'sproto-shooter.asset-manifest.v1',
    baselineCommit: BASELINE_COMMIT,
    runtimeRoot: 'public/assets',
    decodedNote: 'decodedBytes is an RGBA8 upload estimate plus meshopt-decoded buffer views. It is not a GPU timing. KTX2 is not used; resized JPEG/PNG is the measured transfer and decode win, without a transcoder.',
    duplicates: duplicateImages(assets),
    duplicateRigs: duplicateRigs(assets),
    counts: {
      runtimeFiles: assets.length,
      runtimeBytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
      decodedBytes: assets.reduce((sum, asset) => sum + (asset.decodedBytes || 0), 0),
      referenced: references.length,
      dynamic: references.filter((row) => row.kind !== 'static').length,
      missing: missing.length,
      unused: unused.length,
      duplicateImageGroups: duplicateImages(assets).length,
      duplicateRigGroups: duplicateRigs(assets).length,
    },
    missing,
    unused,
    dynamicPatterns,
    references,
    assets,
    authoring: {
      blenderFiles,
      shippedInPublic: publicBlend.length > 0,
      note: 'Authoring Blender files stay under art/. They are not runtime assets and must not appear in dist.',
    },
  };
}

export function fingerprint(manifest) {
  return {
    schema: manifest.schema,
    baselineCommit: manifest.baselineCommit,
    runtimeRoot: manifest.runtimeRoot,
    counts: manifest.counts,
    missing: manifest.missing,
    unused: manifest.unused,
    duplicates: manifest.duplicates,
    duplicateRigs: manifest.duplicateRigs,
    dynamicPatterns: manifest.dynamicPatterns,
    references: manifest.references,
    assets: manifest.assets,
    authoring: manifest.authoring,
  };
}

function readFixture(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function main() {
  const check = process.argv.includes('--check');
  const outIndex = process.argv.indexOf('--out');
  const out = outIndex === -1 ? null : process.argv[outIndex + 1];
  const manifest = buildManifest();
  const fixturePath = path.join(ROOT, 'tests', 'fixtures', 'asset-manifest.json');
  if (check) {
    const fixture = readFixture(fixturePath);
    const same = JSON.stringify(fingerprint(manifest)) === JSON.stringify(fingerprint(fixture));
    if (!same || manifest.missing.length) {
      console.error('asset manifest drift or missing refs');
      console.error(JSON.stringify({ missing: manifest.missing, unused: manifest.unused.map((row) => row.path) }, null, 2));
      process.exit(1);
    }
    console.log(`asset manifest ok (${manifest.counts.runtimeFiles} files, ${manifest.counts.missing} missing, ${manifest.counts.unused} unused)`);
    return;
  }
  const text = `${JSON.stringify(manifest, null, 2)}\n`;
  if (out) {
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(path.resolve(out), text);
    console.log(`wrote ${out}`);
  } else {
    process.stdout.write(text);
  }
  if (manifest.missing.length) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();

// Pinned offline texture optimization. Geometry, skins, clips, and material
// names stay byte-for-byte inside their buffer views. Images over the edge
// cap are resized once. A second run sees the cap and does not re-encode.
// KTX2 is intentionally not produced: the transcoder would add a critical
// request, and the resized JPEG/PNG already cuts transfer and the RGBA8 estimate.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

export const JPEG_QUALITY = 78;
export const PNG_EFFORT = 9;
export const PALETTE_QUALITY = 70;

export const EDGE_RULES = [
  { test: /^models\/guns\//, maxEdge: 1024 },
  { test: /sproto_player\.glb$/, maxEdge: 1024 },
  { test: /\/dragon\.glb$/, maxEdge: 1024 },
  { test: /^models\/characters\//, maxEdge: 512 },
  { test: /^models\/projectiles\//, maxEdge: 512 },
  // The campaign-only sets are far scenery. They ship at half the edge of the arena sets.
  { test: /^models\/stages\/(desert|grove|office)\//, maxEdge: 256 },
  { test: /^models\/stages\//, maxEdge: 512 },
  { test: /^models\/obstacles\//, maxEdge: 512 },
  { test: /^textures\/stages\//, maxEdge: 1024 },
  { test: /^ui\//, maxEdge: 512, palette: true },
];

export function ruleFor(rel) {
  return EDGE_RULES.find((rule) => rule.test.test(rel)) || { maxEdge: 1024 };
}

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function parseGlb(buf) {
  if (buf.toString('ascii', 0, 4) !== 'glTF') return null;
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  let offset = 20 + jsonLen;
  const binLen = buf.readUInt32LE(offset);
  const bin = buf.subarray(offset + 8, offset + 8 + binLen);
  return { json, bin };
}

function packGlb(json, bin) {
  const jsonBuf = Buffer.from(JSON.stringify(json));
  const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
  const jsonChunk = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);
  const binPad = (4 - (bin.length % 4)) % 4;
  const binChunk = Buffer.concat([bin, Buffer.alloc(binPad)]);
  const total = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
  const out = Buffer.alloc(total);
  out.write('glTF', 0, 'ascii');
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(total, 8);
  let cursor = 12;
  out.writeUInt32LE(jsonChunk.length, cursor);
  out.writeUInt32LE(0x4e4f534a, cursor + 4);
  jsonChunk.copy(out, cursor + 8);
  cursor += 8 + jsonChunk.length;
  out.writeUInt32LE(binChunk.length, cursor);
  out.writeUInt32LE(0x004e4942, cursor + 4);
  binChunk.copy(out, cursor + 8);
  return out;
}

export function structureOf(json) {
  return {
    clips: (json.animations || []).map((clip) => ({
      name: clip.name || '',
      samplers: (clip.samplers || []).length,
      channels: (clip.channels || []).length,
    })),
    nodes: (json.nodes || []).map((node) => node.name || ''),
    skins: (json.skins || []).map((skin) => (skin.joints || []).length),
    materials: (json.materials || []).map((mat) => mat.name || ''),
    meshes: (json.meshes || []).length,
    meshopt: (json.extensionsUsed || []).includes('EXT_meshopt_compression'),
  };
}

function bufferPieces(json) {
  const pieces = [];
  for (let index = 0; index < (json.bufferViews || []).length; index += 1) {
    const view = json.bufferViews[index];
    if ((view.buffer ?? 0) === 0) {
      pieces.push({ type: 'view', index, offset: view.byteOffset || 0, length: view.byteLength || 0 });
    }
    const ext = view.extensions?.EXT_meshopt_compression;
    if (ext && (ext.buffer ?? 0) === 0) {
      pieces.push({ type: 'ext', index, offset: ext.byteOffset || 0, length: ext.byteLength || 0 });
    }
  }
  pieces.sort((a, b) => a.offset - b.offset || a.index - b.index);
  for (let i = 1; i < pieces.length; i += 1) {
    if (pieces[i].offset < pieces[i - 1].offset + pieces[i - 1].length) return null;
  }
  return pieces;
}

function pngIndexed(buf) {
  return buf.length > 26 && buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG' && buf[25] === 3;
}

export async function transcodeImage(buf, { maxEdge, palette = false, mime = '' }) {
  const meta = await sharp(buf, { failOn: 'none' }).metadata();
  if (!meta.width || !meta.height) return null;
  const edge = Math.max(meta.width, meta.height);
  const wantsPalette = palette && (meta.format === 'png' || mime === 'image/png') && !pngIndexed(buf);
  if (edge <= maxEdge && !wantsPalette) return null;
  let pipeline = sharp(buf, { failOn: 'none' }).resize({
    width: maxEdge,
    height: maxEdge,
    fit: 'inside',
    withoutEnlargement: true,
    kernel: 'lanczos3',
  });
  const format = meta.format === 'png' || mime === 'image/png' ? 'png'
    : meta.format === 'webp' || mime === 'image/webp' ? 'webp'
      : 'jpeg';
  if (format === 'png') {
    pipeline = wantsPalette || palette
      ? pipeline.png({ compressionLevel: PNG_EFFORT, palette: true, quality: PALETTE_QUALITY, effort: 10 })
      : pipeline.png({ compressionLevel: PNG_EFFORT });
  } else if (format === 'webp') {
    pipeline = pipeline.webp({ quality: JPEG_QUALITY, effort: 4, alphaQuality: 80 });
  } else {
    pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true, chromaSubsampling: '4:2:0' });
  }
  const next = await pipeline.toBuffer();
  if (next.length >= buf.length) return null;
  return next;
}

export async function optimizeGlb(buf, rule) {
  const parsed = parseGlb(buf);
  if (!parsed) throw new Error('not a glb');
  const { json } = parsed;
  const bin = Buffer.from(parsed.bin);
  const pieces = bufferPieces(json);
  if (!pieces) return { buf, changed: false, reason: 'overlapping-views' };
  const accessorViews = new Set((json.accessors || []).map((acc) => acc.bufferView).filter((v) => v != null));
  const before = JSON.stringify(structureOf(json));
  const replacements = new Map();
  for (const image of json.images || []) {
    if (image.bufferView == null || accessorViews.has(image.bufferView)) continue;
    const view = json.bufferViews[image.bufferView];
    if (!view || (view.buffer ?? 0) !== 0) continue;
    const start = view.byteOffset || 0;
    const bytes = bin.subarray(start, start + view.byteLength);
    const next = await transcodeImage(bytes, { maxEdge: rule.maxEdge, mime: image.mimeType || '' });
    if (!next) continue;
    replacements.set(image.bufferView, next);
  }
  if (!replacements.size) return { buf, changed: false, reason: 'within-cap' };
  const parts = [];
  let cursor = 0;
  for (const piece of pieces) {
    const pad = (4 - (cursor % 4)) % 4;
    if (pad) parts.push(Buffer.alloc(pad));
    cursor += pad;
    const view = json.bufferViews[piece.index];
    if (piece.type === 'view') {
      const data = replacements.get(piece.index) || Buffer.from(bin.subarray(piece.offset, piece.offset + piece.length));
      view.byteOffset = cursor;
      view.byteLength = data.length;
      parts.push(data);
      cursor += data.length;
    } else {
      const data = Buffer.from(bin.subarray(piece.offset, piece.offset + piece.length));
      view.extensions.EXT_meshopt_compression.byteOffset = cursor;
      parts.push(data);
      cursor += data.length;
    }
  }
  const endPad = (4 - (cursor % 4)) % 4;
  if (endPad) parts.push(Buffer.alloc(endPad));
  const newBin = Buffer.concat(parts);
  if (json.buffers && json.buffers[0]) json.buffers[0].byteLength = newBin.length;
  const after = JSON.stringify(structureOf(json));
  if (before !== after) throw new Error('glb structure changed');
  const packed = packGlb(json, newBin);
  if (packed.length >= buf.length) return { buf, changed: false, reason: 'not-smaller' };
  return { buf: packed, changed: true, reason: 'resized' };
}

async function optimizeFile(file, root) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  const rule = ruleFor(rel);
  const buf = fs.readFileSync(file);
  const ext = path.extname(file).toLowerCase();
  if (ext === '.glb') {
    const out = await optimizeGlb(buf, rule);
    return { rel, before: buf.length, after: out.buf.length, changed: out.changed, reason: out.reason, buf: out.buf };
  }
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp') {
    const next = await transcodeImage(buf, { maxEdge: rule.maxEdge, palette: !!rule.palette });
    if (!next) return { rel, before: buf.length, after: buf.length, changed: false, reason: 'within-cap', buf };
    return { rel, before: buf.length, after: next.length, changed: true, reason: 'resized', buf: next };
  }
  return { rel, before: buf.length, after: buf.length, changed: false, reason: 'skipped', buf };
}

async function main() {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'assets');
  const check = process.argv.includes('--check');
  const files = walk(root).filter((file) => /\.(glb|png|jpe?g|webp)$/i.test(file)).sort();
  const rows = [];
  for (const file of files) {
    const row = await optimizeFile(file, root);
    rows.push(row);
    if (!check && row.changed) fs.writeFileSync(file, row.buf);
  }
  const changed = rows.filter((row) => row.changed);
  const saved = changed.reduce((sum, row) => sum + (row.before - row.after), 0);
  const summary = {
    files: rows.length,
    changed: changed.length,
    saved,
    sharp: sharp.versions,
    jpegQuality: JPEG_QUALITY,
    rules: EDGE_RULES.map((rule) => ({ maxEdge: rule.maxEdge, palette: !!rule.palette, source: rule.test.source })),
    changedFiles: changed.map((row) => ({ path: row.rel, before: row.before, after: row.after })),
  };
  console.log(JSON.stringify(summary, null, 2));
  if (check && changed.length) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

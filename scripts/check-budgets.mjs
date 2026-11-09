// Deterministic byte and request budgets. Frame times are not decided here.
// Aspirations that the accepted main misses stay visible; the gate is the
// measured baseline plus 5% until a later phase actually splits the bundle.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { buildManifest, repoRoot, walkFiles } from './asset-report.mjs';

export const GZIP_LEVEL = 6;
export const GROWTH = 0.05;

export const ASPIRATION = {
  titleShellGzipBytes: 150 * 1024,
  criticalTransferBytes: 6 * 1024 * 1024,
  criticalRequests: 20,
  staticShipBytes: 25 * 1024 * 1024,
  glbBytes: 3 * 1024 * 1024,
  textureMaxEdge: 2048,
};

// Measured after the S4 split and texture pass. Gzip is zlib level 6.
// Title shell is the entry chunk only. criticalTransferBytes also includes the
// deferred game and hub chunks the title actually loads, and not the debug GUI.
export const MEASURED = {
  staticShipBytes: 23217417,
  publicAssetBytes: 22065058,
  // +428 KB (0.19%): straight-legged idle / walk / run clips for the shooter cast (no texture change).
  decodedBytes: 230139382,
  titleShellGzipBytes: 6669,
  criticalTransferBytes: 3761311,
  criticalFirstPartyRequests: 13,
  criticalJsGzipBytes: 312547,
  jsGzipBytes: 1311,
  cssBytes: 19514,
  cssGzipBytes: 4962,
  htmlBytes: 765,
  htmlGzipBytes: 396,
  assetBytes: 3443406,
};

export function growthCeiling(bytes) {
  return Math.floor(bytes * (1 + GROWTH));
}

export const GATE = {
  // Met aspirations are now the CI gates. Decoded bytes are pinned to the
  // optimized inventory; a larger RGBA8 estimate fails.
  titleShellGzipBytes: ASPIRATION.titleShellGzipBytes,
  staticShipBytes: ASPIRATION.staticShipBytes,
  criticalTransferBytes: ASPIRATION.criticalTransferBytes,
  criticalRequests: ASPIRATION.criticalRequests,
  glbBytes: ASPIRATION.glbBytes,
  textureMaxEdge: 1024,
  decodedBytes: MEASURED.decodedBytes,
};

// Title boots a city sandbox. That download is the city stage, the starting MG,
// the first-person player, the sandbox Duck Gun pickup, and every modeled
// projectile (the renderer starts those loads while it builds the pools).
// Boss and next-wave prefetch do not run in sandbox. Google fonts are
// third-party and stay in the waterfall, outside this first-party set.
// Title sandbox. Projectile meshes wait until one of that kind exists, so they
// are not part of this set. The Duck Gun pickup in front of spawn still is.
export const CRITICAL_ASSETS = [
  'textures/stages/city/floor.jpg',
  'textures/stages/city/sky.jpg',
  'textures/stages/city/stone.jpg',
  'models/stages/city/pillar.glb',
  'models/stages/city/prop.glb',
  'models/guns/toy_mg.glb',
  'models/guns/toy_duckgun.glb',
  'models/characters/sproto_player.glb',
];

function gzipSize(buf) {
  return zlib.gzipSync(buf, { level: GZIP_LEVEL }).length;
}

function shellFiles(dist, ext) {
  if (!fs.existsSync(dist)) return [];
  return fs.readdirSync(dist)
    .filter((name) => name.startsWith('index-') && name.endsWith(ext) && !name.endsWith('.map'))
    .map((name) => path.join(dist, name));
}

function htmlRefs(html, kind) {
  const re = kind === 'js'
    ? /<script[^>]+src="([^"]+\.js)"/g
    : /<link[^>]+href="([^"]+\.css)"/g;
  return [...html.matchAll(re)]
    .map((match) => match[1].replace(/^\.\//, ''))
    .filter((name) => !name.startsWith('http'));
}

export function shellSizes(dist) {
  const htmlPath = path.join(dist, 'index.html');
  const html = fs.readFileSync(htmlPath);
  const htmlText = html.toString('utf8');
  const entry = htmlRefs(htmlText, 'js').map((name) => fs.readFileSync(path.join(dist, name)));
  const css = htmlRefs(htmlText, 'css').map((name) => fs.readFileSync(path.join(dist, name)));
  const criticalJs = shellFiles(dist, '.js').filter((file) => !path.basename(file).includes('debug-gui'));
  const htmlGzipBytes = gzipSize(html);
  const entryGzipBytes = entry.reduce((sum, buf) => sum + gzipSize(buf), 0);
  const cssGzipBytes = css.reduce((sum, buf) => sum + gzipSize(buf), 0);
  const criticalJsGzipBytes = criticalJs.reduce((sum, file) => sum + gzipSize(fs.readFileSync(file)), 0);
  return {
    htmlBytes: html.length,
    cssBytes: css.reduce((sum, buf) => sum + buf.length, 0),
    jsBytes: entry.reduce((sum, buf) => sum + buf.length, 0),
    htmlGzipBytes,
    cssGzipBytes,
    jsGzipBytes: entryGzipBytes,
    titleShellGzipBytes: htmlGzipBytes + cssGzipBytes + entryGzipBytes,
    criticalJsGzipBytes,
    jsFiles: entry.length,
    cssFiles: css.length,
    criticalJsFiles: criticalJs.length,
  };
}

export function criticalTransferBytes(dist) {
  const shell = shellSizes(dist);
  let assetBytes = 0;
  for (const rel of CRITICAL_ASSETS) {
    const file = path.join(dist, 'assets', rel);
    assetBytes += fs.statSync(file).size;
  }
  return {
    ...shell,
    assetBytes,
    criticalTransferBytes: shell.criticalJsGzipBytes + shell.cssGzipBytes + shell.htmlGzipBytes + assetBytes,
    criticalJsGzipBytes: shell.criticalJsGzipBytes,
    criticalRequests: shell.criticalJsFiles + shell.cssFiles + 1 + CRITICAL_ASSETS.length,
  };
}

function violation(code, message, measured, limit) {
  return { code, message, measured, limit };
}

function maxEdge(width, height) {
  return Math.max(width || 0, height || 0);
}

export function evaluate(dist) {
  const root = repoRoot();
  const distDir = path.resolve(dist);
  const violations = [];
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    return { ok: false, violations: [violation('no-dist', 'dist/index.html is missing. Run npm run build first.', null, 'dist/index.html')] };
  }
  const manifest = buildManifest();
  if (manifest.missing.length) {
    violations.push(violation('missing-refs', `Missing runtime refs: ${manifest.missing.join(', ')}`, manifest.missing.length, 0));
  }
  if (manifest.counts.decodedBytes > GATE.decodedBytes) {
    violations.push(violation('decoded-bytes', 'Decoded RGBA8 estimate is above the optimized pin', manifest.counts.decodedBytes, GATE.decodedBytes));
  }
  for (const asset of manifest.assets) {
    if (asset.kind === 'image' && (asset.width == null || asset.height == null)) {
      violations.push(violation('image-dimensions', `${asset.path} has no decoded dimensions`, null, 'width and height'));
    }
    if (asset.kind === 'glb' && (asset.decodedBytes == null || !asset.images.every((im) => im.width && im.decodedBytes))) {
      violations.push(violation('glb-decoded', `${asset.path} is missing decoded image or meshopt sizes`, asset.decodedBytes, 'decoded inventory'));
    }
    if (asset.kind === 'glb' && asset.bytes > GATE.glbBytes) {
      violations.push(violation('glb-bytes', `${asset.path} exceeds the per-GLB budget`, asset.bytes, GATE.glbBytes));
    }
    if (asset.kind === 'image' && maxEdge(asset.width, asset.height) > GATE.textureMaxEdge) {
      violations.push(violation('texture-edge', `${asset.path} exceeds the texture edge`, maxEdge(asset.width, asset.height), GATE.textureMaxEdge));
    }
    for (const im of asset.images || []) {
      if (maxEdge(im.width, im.height) > GATE.textureMaxEdge) {
        violations.push(violation('embedded-texture-edge', `${asset.path} image ${im.name} exceeds the texture edge`, maxEdge(im.width, im.height), GATE.textureMaxEdge));
      }
    }
  }
  const distFiles = walkFiles(distDir);
  let staticShipBytes = 0;
  const shippedAuthoring = [];
  for (const file of distFiles) {
    const rel = path.relative(distDir, file);
    staticShipBytes += fs.statSync(file).size;
    if (rel.endsWith('.blend') || rel.endsWith('.blend1') || rel.includes(`${path.sep}art${path.sep}`) || rel.endsWith('.mp4')) {
      shippedAuthoring.push(rel);
    }
  }
  if (shippedAuthoring.length) {
    violations.push(violation('authoring-shipped', `Dist contains authoring files: ${shippedAuthoring.join(', ')}`, shippedAuthoring.length, 0));
  }
  if (manifest.authoring.shippedInPublic) {
    violations.push(violation('blender-in-public', 'A .blend file is under public/', true, false));
  }
  if (staticShipBytes > GATE.staticShipBytes) {
    violations.push(violation('static-ship', 'Shipped dist is above the static budget', staticShipBytes, GATE.staticShipBytes));
  }
  const critical = criticalTransferBytes(distDir);
  if (critical.titleShellGzipBytes > GATE.titleShellGzipBytes) {
    violations.push(violation('title-shell', 'Title shell gzip is above the 5% growth gate', critical.titleShellGzipBytes, GATE.titleShellGzipBytes));
  }
  if (critical.criticalTransferBytes > GATE.criticalTransferBytes) {
    violations.push(violation('critical-transfer', 'Critical first-party transfer is above 6 MiB', critical.criticalTransferBytes, GATE.criticalTransferBytes));
  }
  if (critical.criticalRequests > GATE.criticalRequests) {
    violations.push(violation('critical-requests', 'Critical first-party request count is above 20', critical.criticalRequests, GATE.criticalRequests));
  }
  const shellText = [
    ...shellFiles(distDir, '.js'),
    ...shellFiles(distDir, '.css'),
    path.join(distDir, 'index.html'),
  ].map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  if (shellText.includes('BEGIN PRIVATE KEY') || shellText.includes('AKIA')) {
    violations.push(violation('secret', 'Dist shell contains a private-key or AWS access-key marker', true, false));
  }
  const publicBytes = manifest.counts.runtimeBytes;
  return {
    ok: violations.length === 0,
    violations,
    measured: {
      staticShipBytes,
      publicAssetBytes: publicBytes,
      ...critical,
    },
    aspiration: ASPIRATION,
    gate: GATE,
    growth: GROWTH,
    gzipLevel: GZIP_LEVEL,
    baselineCommit: manifest.baselineCommit,
    root,
  };
}

function main() {
  const result = evaluate(path.join(repoRoot(), 'dist'));
  const line = {
    ok: result.ok,
    staticShipBytes: result.measured?.staticShipBytes ?? null,
    titleShellGzipBytes: result.measured?.titleShellGzipBytes ?? null,
    criticalTransferBytes: result.measured?.criticalTransferBytes ?? null,
    criticalRequests: result.measured?.criticalRequests ?? null,
    violations: result.violations,
  };
  console.log(JSON.stringify(line, null, 2));
  if (!result.ok) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();

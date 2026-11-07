// Gzip budgets for the production build. Plan B §6.4.
// Entry chunk ≤ 120 KB, three chunk ≤ 190 KB, all JS ≤ 330 KB.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const dir = path.resolve('dist/build');
const htmlPath = path.resolve('dist/index.html');
const LIMITS = { entry: 120 * 1024, three: 190 * 1024, total: 330 * 1024 };

if (!fs.existsSync(dir) || !fs.existsSync(htmlPath)) {
  console.error('check:bundle: dist/ is missing. Run `npm run build` first.');
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf8');
const entryName = [...html.matchAll(/src="[^"]*\/([^"/]+\.js)"/g)].map((m) => m[1])[0];
if (!entryName) {
  console.error('check:bundle: could not find the entry script in dist/index.html');
  process.exit(1);
}

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
let total = 0;
let threeGz = 0;
let entryGz = 0;
const rows = [];
for (const file of files) {
  const gz = zlib.gzipSync(fs.readFileSync(path.join(dir, file))).length;
  total += gz;
  const kind = file === entryName ? 'entry' : file.includes('three') ? 'three' : 'chunk';
  if (kind === 'entry') entryGz = gz;
  if (kind === 'three') threeGz += gz;
  rows.push({ file, kind, gzipKB: (gz / 1024).toFixed(1) });
}

console.table(rows);
console.log(`entry ${(entryGz / 1024).toFixed(1)} KB  three ${(threeGz / 1024).toFixed(1)} KB  total ${(total / 1024).toFixed(1)} KB`);

const fails = [];
if (entryGz > LIMITS.entry) fails.push(`entry ${entryGz} > ${LIMITS.entry}`);
if (threeGz > LIMITS.three) fails.push(`three ${threeGz} > ${LIMITS.three}`);
if (total > LIMITS.total) fails.push(`total ${total} > ${LIMITS.total}`);
if (fails.length) {
  console.error('check:bundle failed:\n' + fails.map((f) => '  - ' + f).join('\n'));
  process.exit(1);
}
console.log('check:bundle ok');

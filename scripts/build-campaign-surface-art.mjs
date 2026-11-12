// Run with the two original ImageGen sheets, in A/B order.
import sharp from 'sharp';

const [sheetA, sheetB] = process.argv.slice(2);
if (!sheetA || !sheetB) throw new Error('Supply the paths to campaign-surface-art-a.png and campaign-surface-art-b.png');

const size = 160, gutter = 4, cell = size + 2 * gutter;
const width = cell * 4, height = cell * 6;
const atlas = Buffer.alloc(width * height * 4);
const byte = n => Math.max(0, Math.min(255, Math.round(n)));
const smooth = (start, end, x) => {
  const t = Math.max(0, Math.min(1, (x - start) / (end - start)));
  return t * t * (3 - 2 * t);
};

function lampMask(tile, r, g, b) {
  const luma = r * .21 + g * .72 + b * .07;
  if (tile === 9 || tile === 11) return smooth(25, 65, g - r) * smooth(128, 190, luma);
  if (tile === 10 || tile === 23) return smooth(176, 231, luma);
  return 0;
}

function matchEdges(pixels) {
  const blend = 7;
  for (let side = 0; side < 2; side++) {
    for (let across = 0; across < size; across++) for (let d = 0; d < blend; d++) {
      const start = side ? d * size + across : across * size + d;
      const end = side ? (size - 1 - d) * size + across : across * size + size - 1 - d;
      const k = .5 * (1 - smooth(0, blend, d));
      for (let channel = 0; channel < 4; channel++) {
        const a = start * 4 + channel, b = end * 4 + channel;
        const left = pixels[a], right = pixels[b];
        pixels[a] = byte(left + (right - left) * k);
        pixels[b] = byte(right + (left - right) * k);
      }
    }
  }
}

async function pack(file, rowOffset) {
  const { width: w, height: h } = await sharp(file).metadata();
  if (w % 4 || h % 3) throw new Error(`Expected a regular 4 by 3 sheet: ${file}`);
  const sw = w / 4, sh = h / 3;
  for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
    const tile = (row + rowOffset) * 4 + col;
    const rgb = await sharp(file).extract({ left: col * sw + 3, top: row * sh + 3, width: sw - 6, height: sh - 6 })
      .resize(size, size, { fit: 'fill' }).removeAlpha().raw().toBuffer();
    const average = [0, 0, 0];
    for (let i = 0; i < rgb.length; i++) average[i % 3] += rgb[i];
    for (let c = 0; c < 3; c++) average[c] /= size * size;
    const mask = new Float32Array(size * size);
    for (let i = 0; i < mask.length; i++) mask[i] = lampMask(tile, rgb[3 * i], rgb[3 * i + 1], rgb[3 * i + 2]);
    const detail = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = y * size + x;
      for (let c = 0; c < 3; c++) detail[4 * i + c] = byte(128 + (rgb[3 * i + c] - average[c]) * 1.13);
      let halo = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        halo += mask[((y + dy + size) % size) * size + (x + dx + size) % size];
      }
      // Half-alpha stores no emission while keeping the detail RGB available to WebP decoders.
      detail[4 * i + 3] = byte(128 + 127 * Math.max(mask[i], halo * .017));
    }
    matchEdges(detail);
    for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
      const sy = (y - gutter + size) % size, sx = (x - gutter + size) % size;
      const target = ((row + rowOffset) * cell + y) * width + col * cell + x;
      detail.copy(atlas, target * 4, (sy * size + sx) * 4, (sy * size + sx) * 4 + 4);
    }
  }
}

await pack(sheetA, 0);
await pack(sheetB, 3);
const path = new URL('../public/assets/textures/campaign/surface-art.webp', import.meta.url);
await sharp(atlas, { raw: { width, height, channels: 4 } })
  .webp({ quality: 81, alphaQuality: 100, effort: 6 }).toFile(path.pathname);

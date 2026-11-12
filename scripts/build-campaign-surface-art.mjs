// Use the two original ImageGen sheets in A/B order, or --skyline with the Skyline sheet and panorama.
import sharp from 'sharp';

const [first, second, third] = process.argv.slice(2);
const skyline = first === '--skyline';
if (!first || !second || (skyline && !third)) {
  throw new Error('Supply both campaign surface sheets, or --skyline <2 × 2 surface sheet> <panorama>');
}

const size = 160, gutter = 4, cell = size + 2 * gutter;
const cols = skyline ? 2 : 4, rows = skyline ? 2 : 3;
const width = cell * cols, height = cell * (skyline ? rows : 2 * rows);
const atlas = Buffer.alloc(width * height * 4);
const byte = n => Math.max(0, Math.min(255, Math.round(n)));
const smooth = (start, end, x) => {
  const t = Math.max(0, Math.min(1, (x - start) / (end - start)));
  return t * t * (3 - 2 * t);
};

function lampMask(tile, r, g, b) {
  const luma = r * .21 + g * .72 + b * .07;
  if (skyline) {
    if (tile === 1) return smooth(158, 224, Math.max(r, g)) * smooth(22, 62, Math.abs(g - r));
    if (tile === 2) return smooth(157, 224, luma);
    return 0;
  }
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
  if (w % cols || h % rows) throw new Error(`Expected a regular ${cols} by ${rows} sheet: ${file}`);
  const sw = w / cols, sh = h / rows;
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const tile = (row + rowOffset) * cols + col;
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

const campaignTextures = new URL('../public/assets/textures/campaign/', import.meta.url);
if (skyline) {
  await pack(second, 0);
  // Match the east/west seam of the sky sphere.
  const w = 896, h = 448, blend = 26;
  const sky = await sharp(third).resize(w, h, { fit: 'fill' }).removeAlpha().raw().toBuffer();
  for (let y = 0; y < h; y++) for (let x = 0; x < blend; x++) {
    const weight = .5 * (1 - smooth(0, blend, x));
    for (let channel = 0; channel < 3; channel++) {
      const a = (y * w + x) * 3 + channel, b = (y * w + w - 1 - x) * 3 + channel;
      const delta = (sky[b] - sky[a]) * weight;
      sky[a] = byte(sky[a] + delta);
      sky[b] = byte(sky[b] - delta);
    }
  }
  await sharp(sky, { raw: { width: w, height: h, channels: 3 } })
    .webp({ quality: 86, effort: 6 }).toFile(new URL('skyline-night.webp', campaignTextures).pathname);
} else {
  await pack(first, 0);
  await pack(second, rows);
}
const name = skyline ? 'skyline-surface.webp' : 'surface-art.webp';
await sharp(atlas, { raw: { width, height, channels: 4 } })
  .webp({ quality: 81, alphaQuality: 100, effort: 6 }).toFile(new URL(name, campaignTextures).pathname);

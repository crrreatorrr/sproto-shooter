// Stage texture decode. createImageBitmap decodes off the main thread where it honours
// imageOrientation; Safari and Firefox before 98 keep the <img> path (same rule as three's GLTFLoader).
import * as THREE from 'three';

const texLoader = new THREE.TextureLoader();

export const BITMAP_DECODE = (() => {
  if (typeof createImageBitmap !== 'function' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/^((?!chrome|android).)*safari/i.test(ua)) return false;
  const firefox = ua.match(/Firefox\/([0-9]+)\./);
  return !(firefox && Number(firefox[1]) < 98);
})();

// Flipped while decoding, as THREE.ImageBitmapLoader does, and not premultiplied, like the <img> path.
const BITMAP_OPTIONS = { imageOrientation: 'flipY', premultiplyAlpha: 'none' };

/** A THREE.Texture from fetched image bytes. */
export async function decodeTexture(buf) {
  if (BITMAP_DECODE) {
    const t = new THREE.Texture(await createImageBitmap(new Blob([buf]), BITMAP_OPTIONS));
    t.flipY = false;
    t.needsUpdate = true;
    return t;
  }
  const url = URL.createObjectURL(new Blob([buf]));
  try {
    const t = await texLoader.loadAsync(url);
    if (!t || !t.isTexture) throw new Error('load failed');
    return t;
  } finally {
    URL.revokeObjectURL(url);
  }
}

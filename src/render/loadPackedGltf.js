export async function loadPackedGltf(loader, path) {
  const url = `${import.meta.env.BASE_URL}assets/${path}`;
  if (!path.endsWith('.gz')) return loader.loadAsync(url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${path}: HTTP ${response.status}`);
  // Static hosts may serve the wrapper as a file or apply HTTP Content-Encoding.
  const bytes = await response.arrayBuffer();
  const magic = new Uint8Array(bytes);
  const glb = magic[0] === 0x1f && magic[1] === 0x8b
    ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
    : bytes;
  return loader.parseAsync(glb, '');
}

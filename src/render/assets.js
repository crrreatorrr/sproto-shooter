// @ts-check
// Re-export shim. Callers keep importing ./assets.js for one milestone (plan B M3).
export { pendingDownloads, requestedPaths, PRIORITY } from './assets/DownloadQueue.js';
export {
  assetsVersion, onAssetsChanged, loadTexture, peekTexture, peekModel,
  ensureStage, stageReady, ensureCharacter, characterReady,
  instantiateStatic, instantiateCharacter,
} from './assets/AssetStore.js';

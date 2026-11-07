# Vendored @metaverse/hub-sdk

- repo: https://github.com/crrreatorrr/metaverse-hub
- branch: cursor/sproto-shooter-hub-c0c0
- sha: 94f10af
- package: packages/hub-sdk @ 0.6.2
- built with: `node scripts/vendor-sdk.mjs`

This copy is hub-sdk 0.6.2, which adds the `sproto-shooter` game id. The hub commit above is the registration (plaza ring, migration `0038_sproto_shooter`). It could not be pushed: the GitHub token for this agent cannot write to `crrreatorrr/metaverse-hub`. `metaverse-hub.patch` in this folder is that commit (`git am` it on metaverse-hub `main`).

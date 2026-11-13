# Vendored @metaverse/hub-sdk

- repo: https://github.com/crrreatorrr/metaverse-hub
- branch: claude/account-progress
- sha: 77c6efc
- package: packages/hub-sdk @ 0.8.0
- built with: `node scripts/vendor-sdk.mjs`
- iife: dist/hub-sdk.iife.js (global HubSDK; classic script, not a CDN import)
- iife sha256: 2056e1b33a7fd7c6ef1df24abec382194d7ee085c7c7a9da5e93241d46a9a372
- source src/createHubSdk.ts: 4ae184ef8b4a6e97192769a4118ea855fcd4463176ee7bac295a884e449ebcdf
- source src/env.ts: c3a8eb38ea73539fa4d971da705e004355bed8258079a73a2ecbda912c35ef46
- source src/errors.ts: 4eaba836a4dfad994b3926d90b66a158c4384ce6f100bf8a0791877c0646b541
- source src/events.ts: 584d264acb48d7e63746bc63b56767577dd4370a0b5fbdf4ddd73fc0fd2b9f64
- source src/feedback.ts: 3ee200cafc7d07ca4b0c995a56a0d3ef5a6046e262fc62c7aef0bb903e83cf67
- source src/index.ts: b7db97e20962db7bdfc123f539af28a47e109062cf5ed74a374e09ef4b3cd457
- source src/live.ts: 9272fe0acd8c0b8171028f163df42f7e9545408d28194da7de19e037f0417527
- source src/nakama.ts: 67a701b47178244f1a63b433f8d715aea824b1599a49f140b35b401950ee266a
- source src/pageShot.ts: 8e562aa07991d5b716d9f83aa2f659dbd43782b5b6e063d411895f52dfc84af9
- source src/pbShop.ts: 3bbeff5bcf3b6e2c724409eadce9907432e1e52b02988938ff5e6f2ebdfe0faf
- source src/progress.ts: 01934b6fa1f0b05e490f0448d216fea78b1cf4598de3a7755d48284e8676667d
- source src/realtime/chatRules.ts: 26913facb5c4c28c0a3529a4ecb6a3a50fadfe067736c74fb571184a9aa81b0e
- source src/realtime/client.ts: 09b799cc261ae06eb36a3141722e7752b603c58eac66fdb2b2a4f88f4ae08b79
- source src/realtime/friends.ts: d2b309fca509ab6e46def7d4be20e470d7d932f6eacef63287ce7697225f86ef
- source src/realtime/mock.ts: e476f22d8c78c0b1e0dc5cb0e7fc553bfd3534dd22d45920aeb903c8dfa049a7
- source src/realtime/protocol.ts: 9f25c52103c82110eb518043395fed92a71f5c713f70c6e7369072ce988ea14e
- source src/realtime/types.ts: dc8a6a5f62c5e0f2874819a79dd473b5b41b3cbdb29aad8bfd2a0fc4687734cf
- source src/save.ts: 098fb0a6834e43bdad620c2729b0abf28a9551b8c4ab8cc7cb3428ebba8aea98
- source src/storage.ts: 7a1f52e2f432026590ed99e85c318ea21ef10c6fe83b9e0c1ebe8c173ced5344
- source src/third_party/modern-screenshot.d.ts: 22372ef230b98655ee2597c8c741d75e397405f22dbb5c2f45521e6fe9950056
- source src/third_party/modern-screenshot.js: c1d44ba7cf8a296754c7013a12c79266235550b0564d17487a76e006f8472721
- source src/ticket.ts: b01e1635c7031dd0e6855ecb22b99af1654395c41f0296863b627a31ded41033
- source src/types.ts: 90b551a3fe2b4e85f81b82bc7c9c1909654715f2a45a85cb7d683f6f05d309ab

This copy is hub-sdk 0.8.0, built from metaverse-hub branch `claude/account-progress` at 77c6efc, ahead of that branch's PR. It must be re-vendored from hub `main` once that PR merges, before this game's account-progress PR merges. 0.8.0 adds `createProgressStore` and `hubVisitStarting` (`src/progress.ts`): progress per hub account, kept in the browser under `<key>@<playerId>` and synced through the cloud save with a merge that only keeps or improves progress. It also raises the cloud save limit (`SAVE_MAX_BYTES`) to 16384 bytes. The game's model is `src/save/progress.js`. 

From 0.7.2: the feedback screenshot shows the whole page: the canvases named by the adapter's `canvases` are copied directly and the page's HTML (title, HUD, pause and other menus) is drawn over them by `dist/pageShot.js` with the vendored modern-screenshot (`dist/third_party/modern-screenshot.js`, MIT, loaded as a separate chunk a few seconds after start). The Google Fonts `<link>` in `index.html` carries `crossorigin="anonymous"` so Bungee and Baloo 2 are drawn too. 0.7.1 adds the optional `tickets` field on event results (Tickets a server event credited); this game does not read it. 0.7.0 added the in-game feedback window (`installFeedback`, `feedbackTransportFromSdk`, `src/feedback.ts`) and the `feedbackAccess` / `submitFeedback` SDK calls; the game's adapter is `src/hub/feedback.js`. Everything from 0.6.4 is unchanged: the `marina_anchor` and `dragon_scale` Relics and the `shooter.wave_clear` event (clearing wave 1 of Wave Mode reports `{ wave: 1, godMode }` and grants the Dragon Scale once). The classic IIFE is `dist/hub-sdk.iife.js` (global `HubSDK`). Shooter loads the ESM build from the same commit. This folder does not carry a patch to apply.

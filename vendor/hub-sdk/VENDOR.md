# Vendored @metaverse/hub-sdk

- repo: https://github.com/crrreatorrr/metaverse-hub
- branch: claude/nifty-einstein-ptgr08
- sha: 2a6a4bc
- package: packages/hub-sdk @ 0.7.2
- built with: `node scripts/vendor-sdk.mjs`
- iife: dist/hub-sdk.iife.js (global HubSDK; classic script, not a CDN import)
- iife sha256: 25b989eb2cda2227e4395c84965c7a4bea5f937c3df442c08aad8ab8c40e5a35
- source src/createHubSdk.ts: 4ae184ef8b4a6e97192769a4118ea855fcd4463176ee7bac295a884e449ebcdf
- source src/env.ts: c3a8eb38ea73539fa4d971da705e004355bed8258079a73a2ecbda912c35ef46
- source src/errors.ts: 4eaba836a4dfad994b3926d90b66a158c4384ce6f100bf8a0791877c0646b541
- source src/events.ts: 584d264acb48d7e63746bc63b56767577dd4370a0b5fbdf4ddd73fc0fd2b9f64
- source src/feedback.ts: 6c241cc2493bf80c846251ae59255cf828499207d3146ddfd5da76b8d1d2cd18
- source src/index.ts: 4f1d93041a8b2fb275e4a25761a2c4ed465e88ac4692c2fc856c704b3cd90767
- source src/live.ts: 9272fe0acd8c0b8171028f163df42f7e9545408d28194da7de19e037f0417527
- source src/nakama.ts: 67a701b47178244f1a63b433f8d715aea824b1599a49f140b35b401950ee266a
- source src/pageShot.ts: 349f3196a47b9582dca4201437145b662c2d4216f2ca94c186bb9c304062fc26
- source src/pbShop.ts: 3bbeff5bcf3b6e2c724409eadce9907432e1e52b02988938ff5e6f2ebdfe0faf
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
- source src/types.ts: b3ac546d5c67e094d2755de3940d2c4a061a665b9974f1f574786f925a1c39df

This copy is hub-sdk 0.7.2, built from metaverse-hub 2a6a4bc on the `claude/nifty-einstein-ptgr08` branch. That commit is not on hub `main` yet; re-vendor from `main` once it merges, and update this file, `SOURCE.pin.json`, `package-lock.json` and the pin in `tests/hub-lifecycle.test.js` together. 0.7.2 makes the feedback screenshot show the whole page: the canvases named by the adapter's `canvases` are copied directly and the page's HTML (title, HUD, pause and other menus) is drawn over them by `dist/pageShot.js` with the vendored modern-screenshot (`dist/third_party/modern-screenshot.js`, MIT, loaded as a separate chunk a few seconds after start). The Google Fonts `<link>` in `index.html` carries `crossorigin="anonymous"` so Bungee and Baloo 2 are drawn too. 0.7.1 adds the optional `tickets` field on event results (Tickets a server event credited); this game does not read it. 0.7.0 added the in-game feedback window (`installFeedback`, `feedbackTransportFromSdk`, `src/feedback.ts`) and the `feedbackAccess` / `submitFeedback` SDK calls; the game's adapter is `src/hub/feedback.js`. Everything from 0.6.4 is unchanged: the `marina_anchor` and `dragon_scale` Relics and the `shooter.wave_clear` event (clearing wave 1 of Wave Mode reports `{ wave: 1, godMode }` and grants the Dragon Scale once). The classic IIFE is `dist/hub-sdk.iife.js` (global `HubSDK`). Shooter loads the ESM build from the same commit. This folder does not carry a patch to apply.

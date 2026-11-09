// Browser import surface for the opt-in Nakama suites. Vite transforms this file.
// It does not change the game. The free-queue screen still does not join a match;
// the online suite uses these exports to drive the same client the wager screen uses.
export { createPvpClient } from '../../src/net/client.js';
export { realtimeFromSdk } from '@metaverse/hub-sdk';

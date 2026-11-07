// @ts-check
// Central sim typedefs. Presentation must not invent parallel copies of these shapes.
// Strict checking starts here and grows as modules are annotated (plan B §2.1).

/**
 * @typedef {{ x: number, y: number, z: number }} Vec3
 */

/**
 * @typedef {{ x: number, z: number }} VecXZ
 */

/**
 * Plain object emitted through state.events. Payload fields are event-specific.
 * @typedef {{ type: string, tick: number, [key: string]: unknown }} SimEvent
 */

/**
 * Seeded RNG state. Advance only through src/core/rng.js.
 * @typedef {{ s: number }} Rng
 */

export {};

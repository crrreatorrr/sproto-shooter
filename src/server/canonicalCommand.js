// Reward-mode command representation only. This does not authenticate a client,
// import issued state, choose eligibility, or grant permission to upload/pay.
import { quantizeCommand, encodeQuantized, decodeFrames, ProtocolError } from './protocol.js';

/** A fixed 12-byte frame and the exact command decoded from those bytes/actions. */
export function canonicalCommand(rawCommand) {
  const encoded = encodeQuantized([quantizeCommand(rawCommand)]);
  const decoded = decodeFrames(encoded.frames, encoded.n, encoded.actions);
  if (decoded.error || decoded.commands.length !== 1) throw new ProtocolError(decoded.error || 'malformed');
  const command = decoded.commands[0];
  Object.freeze(command.held);
  Object.freeze(command.pressed);
  for (const action of command.actions) Object.freeze(action);
  Object.freeze(command.actions);
  Object.freeze(command);
  for (const action of encoded.actions) Object.freeze(action);
  Object.freeze(encoded.actions);
  return Object.freeze({ command, frame: Object.freeze(encoded) });
}

import { createLegacyGame } from '../../src/adapters/legacy';
import type { GameDefinition } from '../../src/core/types';
import manifest from './manifest.json';

// Keep Phaser and the standalone DOM in their own browsing context.
// The generated page receives the platform's standard lifecycle/audio bridge.
export function createGame() {
  return createLegacyGame({
    ...manifest,
    engine: 'legacy',
    module: 'sample_game/GOATinAnger/index.html',
  } as GameDefinition);
}

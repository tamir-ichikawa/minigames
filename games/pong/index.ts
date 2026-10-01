import { createPhaserModule } from '../../src/adapters/phaser';
import type { Score } from '../../src/core/types';
import { StarScene } from './scene';

export function createGame() {
  let score: Score | null = null;
  return createPhaserModule({
    width: 480, height: 760, loadTimeoutMs: 60000,
    createScene: (context, ready) => new StarScene(context, ready, value => { score = value; }),
    getScore: () => score
  });
}

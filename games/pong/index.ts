import { createGame as createStoryGame } from '../../sample_game/STAR_BOUNCE/index';

// Preserve the existing public id and URL while upgrading to the story edition.
export function createGame() {
  return createStoryGame({ managed: true });
}

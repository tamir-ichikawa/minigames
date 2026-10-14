import '../sample_game/GOATinAnger/tests/navigation.test.js';
import '../sample_game/GOATinAnger/tests/rules.test.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverGames } from '../scripts/registry.mjs';
import { readFile } from 'node:fs/promises';

test('GOAT in ANGER is registered with an isolated Phaser adapter', async () => {
  const games = await discoverGames(process.cwd());
  const game = games.find(game => game.id === 'goatinanger');
  assert.equal(game?.title, 'GOAT in ANGER');
  assert.equal(game?.engine, 'phaser');
  assert.equal(game?.module, 'games/goatinanger/index.ts');
});
test('GOAT assets resolve within the game under subdirectory hosting', async () => {
  const html = await readFile(new URL('../sample_game/GOATinAnger/index.html', import.meta.url), 'utf8');
  const script = await readFile(new URL('../sample_game/GOATinAnger/src/main.js', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /src=["']\/assets\//);
  assert.doesNotMatch(script, /[`"']\/assets\//);
});

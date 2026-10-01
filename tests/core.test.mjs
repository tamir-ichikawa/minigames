import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { discoverGames } from '../scripts/registry.mjs';
async function loadTs(file) {
  const result = await build({ entryPoints: [file], bundle: true, write: false, format: 'esm', platform: 'node' });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
test('registry discovers a folder, excludes disabled, tolerates removal, rejects broken enabled module and duplicate ID', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'minigames-registry-'));
  try {
    await mkdir(path.join(root, 'games/a'), { recursive: true });
    await writeFile(path.join(root, 'thumb.svg'), '<svg/>'); await writeFile(path.join(root, 'games/a/index.ts'), '');
    const manifest = { id:'a', title:'A', description:'Example', category:'action', enabled:true, engine:'canvas', module:'games/a/index.ts', thumbnail:'thumb.svg', color:'#fff', icon:'a', order:1 };
    const save = data => writeFile(path.join(root, 'games/a/manifest.json'), JSON.stringify(data));
    await save(manifest); assert.equal((await discoverGames(root)).length, 1);
    await save({ ...manifest, enabled:false, module:'does-not-exist.ts' }); assert.equal((await discoverGames(root)).length, 0);
    await save({ ...manifest, module:'does-not-exist.ts' }); await assert.rejects(discoverGames(root), /ENOENT/);
    await save({ ...manifest, module:'../escape.ts' }); await assert.rejects(discoverGames(root), /project-relative/);
    await save(manifest); await mkdir(path.join(root, 'games/b')); await writeFile(path.join(root, 'games/b/manifest.json'), JSON.stringify(manifest));
    await assert.rejects(discoverGames(root), /duplicate/);
    await rm(path.join(root, 'games/b'), { recursive:true }); await rm(path.join(root, 'games/a'), { recursive:true }); assert.equal((await discoverGames(root)).length, 0);
  } finally { await rm(root, { recursive:true, force:true }); }
});
test('registered games and fallback paths exist', async () => {
  const games = await discoverGames(process.cwd()); assert.ok(games.length > 0);
  assert.equal(games.find(g => g.id === 'reflex').engine, 'phaser');
  for (const id of ['15-puzzle','speed_tap','tsumiki']) assert.equal(games.find(g => g.id === id).module, `games/${id}/index.html`);
});
test('reflex: exactly five attempts, early taps excluded, duplicate taps ignored, average and restart', async () => {
  const { ReflexRound } = await loadTs('games/reflex/model.ts'); const round = new ReflexRound();
  round.begin(); assert.equal(round.tap(30), null); assert.equal(round.tap(31), undefined); round.next();
  for (const duration of [100,200,300,400]) { round.green(1000); assert.equal(round.tap(1000+duration), duration); round.next(); }
  assert.equal(round.phase, 'result'); assert.deepEqual(round.summary, { average:250, best:100, worst:400 });
  assert.equal(round.tap(5000), undefined); round.begin(); assert.deepEqual(round.results, []);
  for (let i=0;i<5;i++) { round.tap(0); round.next(); } assert.equal(round.summary, null);
});
test('host serializes pause/resume/reset/exit and destroys failed initialization', async () => {
  const { GameHost } = await loadTs('src/core/host.ts'); const calls=[];
  const module = Object.fromEntries(['init','start','pause','resume','reset','destroy'].map(key => [key, async () => { await Promise.resolve(); calls.push(key); }]));
  const host = new GameHost(() => {}); const definition = { load: async () => ({ createGame: () => module }) };
  await host.load(definition, {});
  await Promise.all([host.pause(), host.pause(), host.resume(), host.reset(), host.destroy()]);
  assert.deepEqual(calls, ['init','start','pause','resume','reset','start','destroy']); assert.equal(host.state,'idle');
  module.init = () => { throw new Error('broken'); };
  await assert.rejects(host.load(definition, {}), /broken/); assert.equal(host.state,'error'); assert.equal(calls.at(-1),'destroy'); assert.equal(host.module,undefined);
});
test('browser storage denied falls back to in-memory settings and reports persistence failure', async () => {
  const { createWebPlatform } = await loadTs('src/platform/web.ts');
  const platform = createWebPlatform(); assert.equal(platform.storage.write('x', 42), false);
  assert.equal(platform.storage.read('x', 0), 42); assert.equal(platform.storage.read('missing', 5),5);
  assert.equal(platform.readLegacyNumber('rfx1'), null);
});

import { build } from 'esbuild';
import { cp, mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverGames } from './registry.mjs';
import { serve } from './serve.mjs';
import { buildStarBounce } from '../sample_game/STAR_BOUNCE/build.mjs';
import { buildGoatInAnger } from '../sample_game/GOATinAnger/build.mjs';
import { buildMaro } from '../sample_game/斉藤さんゲーム/build.mjs';
import { buildDance } from '../Dance/build.mjs';
const root = fileURLToPath(new URL('../', import.meta.url)), out = path.join(root, 'dist');
async function walk(dir) {
  const files = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const filename = path.join(dir, item.name);
    if (item.isDirectory()) files.push(...await walk(filename)); else files.push(filename);
  }
  return files;
}
async function compile() {
  const games = await discoverGames(root);
  await rm(out, { recursive: true, force: true }); await mkdir(out, { recursive: true });
  for (const name of ['index.html','play.html','.nojekyll','collection','enzine-rythm','assets','styles','sky-jump.html','games']) {
    await cp(path.join(root, name), path.join(out, name), { recursive: true, filter: file => !file.endsWith('.ts') && !file.endsWith('.DS_Store') });
  }
  await mkdir(path.join(out, 'scripts'), { recursive: true });
  for (const name of ['sky-jump.js','goat-kid.js']) await cp(path.join(root, 'scripts', name), path.join(out, 'scripts', name));
  await mkdir(path.join(out, 'sample_game'), { recursive: true });
  for (const name of ['15-puzzle.html','whack-a-mole.html','memory-match.html']) await cp(path.join(root, 'sample_game', name), path.join(out, 'sample_game', name));
  for (const name of ['invader-attack','pakkunman','rallypeke']) await cp(path.join(root, 'sample_game', name), path.join(out, 'sample_game', name), {recursive:true,filter:file=>!file.endsWith('.DS_Store')});
  await mkdir(path.join(out, 'src/launcher'), { recursive: true });
  await cp(path.join(root, 'src/launcher/player.css'), path.join(out, 'src/launcher/player.css'));
  if (games.some(game => game.id === 'goatinanger')) await buildGoatInAnger(out);
  if (games.some(game => game.id === 'pong')) await buildStarBounce(out);
  if (games.some(game => game.id === 'maro-adventure')) await buildMaro(out);
  if (games.some(game => game.id === 'dance')) await buildDance(out);
  const registryPlugin = {
    name: 'game-registry', setup(builder) {
      builder.onResolve({ filter: /^virtual:games$/ }, () => ({ path: 'games', namespace: 'registry' }));
      builder.onLoad({ filter: /.*/, namespace: 'registry' }, () => ({
        resolveDir: root, loader: 'ts',
        contents: `export const games = [${games.map(game => {
          const loader = game.engine === 'legacy'
            ? `() => import('./src/adapters/legacy.ts').then(m => ({createGame: () => m.createLegacyGame(${JSON.stringify(game)})}))`
            : `() => import('./${game.module}')`;
          return `{...${JSON.stringify(game)}, load: ${loader}}`;
        }).join(',')}];`
      }));
    }
  };
  await build({ absWorkingDir: root, entryPoints: { catalog: 'src/launcher/catalog.ts', player: 'src/launcher/player.ts' },
    outdir: path.join(out, 'app'), bundle: true, splitting: true, format: 'esm', target: 'es2022',
    minify: true, sourcemap: true, plugins: [registryPlugin], chunkNames: 'chunks/[name]-[hash]', logLevel: 'warning' });
  await build({ absWorkingDir: root, entryPoints: ['src/adapters/legacy-bridge.ts'], outfile: path.join(out, 'app/legacy-bridge.js'),
    bundle: true, format: 'iife', target: 'es2022', minify: true, sourcemap: true });
  // Inject only generated compatibility pages. Standalone source files remain untouched.
  for (const file of (await walk(out)).filter(f => f.endsWith('.html'))) {
    const html = await readFile(file, 'utf8');
    if (!html.includes('<head>')) continue;
    const bridge = path.relative(path.dirname(file), path.join(out, 'app/legacy-bridge.js')).split(path.sep).join('/');
    const shell = /<script[^>]+src=["'][^"']*shared\/shell\.js/.test(html);
    await writeFile(file, html.replace('<head>', `<head><script src="${bridge}" data-shell="${shell}"></script>`));
  }
  await writeFile(path.join(out, 'game-registry.json'), JSON.stringify(games, null, 2) + '\n');
  console.log(`Built ${games.length} games → dist/`);
}
await compile();
if (process.argv.includes('--serve')) {
  await serve({ root: out, port: Number(process.env.PORT || 4173) });
  let timer, building = false, again = false;
  async function rebuild() {
    if (building) { again = true; return; } building = true;
    try { await compile(); console.log('Updated. Reload your browser.'); } catch (error) { console.error(error); }
    finally { building = false; if (again) { again = false; void rebuild(); } }
  }
  watch(root, { recursive: true }, (_event, filename) => {
    if (!filename || /^Dance\/(\.build|original)(\/|$)/.test(filename)) return;
    const maroSource = /^sample_game\/斉藤さんゲーム\//.test(filename.normalize('NFC')) &&
      !/^sample_game\/斉藤さんゲーム\/(\.build|素材)(\/|$)/.test(filename.normalize('NFC')) && !filename.endsWith('.DS_Store');
    const gameSource = maroSource || /^sample_game\/(GOATinAnger|STAR_BOUNCE|invader-attack|pakkunman|rallypeke)\//.test(filename) &&
      !/^sample_game\/(GOATinAnger|STAR_BOUNCE|invader-attack|pakkunman|rallypeke)\/(node_modules|dist|\.build|素材|sozai)(\/|$)/.test(filename) && !filename.endsWith('.DS_Store');
    if (!gameSource && /^(dist|node_modules|\.git|\.test-output|sample_game|deliverables|backups)(\/|$)/.test(filename)) return;
    clearTimeout(timer); timer = setTimeout(rebuild, 180);
  });
}

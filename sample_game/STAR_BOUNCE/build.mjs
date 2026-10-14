import { build } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { writeChimes, writeSwings } from './audio.mjs';

export async function buildStarBounce(outputRoot) {
  const source = fileURLToPath(new URL('./', import.meta.url));
  const destination = path.join(outputRoot, 'sample_game/STAR_BOUNCE');
  await mkdir(destination, { recursive: true });
  for (const name of ['index.html', 'style.css', 'assets']) {
    await cp(path.join(source, name), path.join(destination, name), {
      recursive: true, filter: file => !file.endsWith('.DS_Store') && !file.endsWith('bonus-sheet.png')
    });
  }
  const assets = pathToFileURL(path.join(destination, 'assets') + path.sep);
  await writeChimes(assets); await writeSwings(assets);
  await build({ absWorkingDir: source, entryPoints: ['main.ts'], outfile: path.join(destination, 'app.js'),
    bundle: true, format: 'esm', target: 'es2022', minify: true, logLevel: 'warning' });
}

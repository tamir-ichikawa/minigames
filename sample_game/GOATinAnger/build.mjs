import { build } from 'esbuild';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Used by the parent minigame build. Vite remains available for standalone development.
export async function buildGoatInAnger(outputRoot) {
  const source = fileURLToPath(new URL('./', import.meta.url));
  const destination = path.join(outputRoot, 'sample_game/GOATinAnger');
  await mkdir(destination, { recursive: true });
  await cp(path.join(source, 'public/assets'), path.join(destination, 'assets'), {
    recursive: true, filter: file => path.extname(file) === '' || file.endsWith('-v2.png')
  });
  await build({
    absWorkingDir: source, entryPoints: ['src/main.js'], outfile: path.join(destination, 'game.js'),
    bundle: true, format: 'esm', target: 'es2022', minify: true,
    define: { 'import.meta.env.DEV': 'false' }, logLevel: 'warning'
  });
  const html = (await readFile(path.join(source, 'index.html'), 'utf8'))
    .replace('src="./src/main.js"', 'src="./game.js"')
    .replace('</head>', '  <link rel="stylesheet" href="./game.css" />\n  </head>');
  await writeFile(path.join(destination, 'index.html'), html);
}

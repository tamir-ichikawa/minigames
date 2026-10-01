import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
const id = process.argv[2];
if (!id || !/^[a-z0-9][a-z0-9_-]*$/.test(id)) throw new Error('Usage: npm run new-game -- my-game');
const folder = path.resolve('games', id);
await mkdir(folder); // Never overwrite an existing module.
try {
  const title = id;
  const source = (await readFile('templates/phaser/index.ts.template', 'utf8')).replaceAll('__ID__', id).replaceAll('__TITLE__', title);
  await writeFile(path.join(folder, 'index.ts'), source);
  await writeFile(path.join(folder, 'thumbnail.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="32" fill="#203454"/><circle cx="80" cy="80" r="36" fill="#c0edc4"/><path d="M65 80h30M80 65v30" stroke="#203454" stroke-width="10" stroke-linecap="round"/></svg>');
  await writeFile(path.join(folder, 'manifest.json'), JSON.stringify({ id, title, description:'新しいミニゲーム', thumbnail:`games/${id}/thumbnail.svg`, category:'action', enabled:true, engine:'phaser', module:`games/${id}/index.ts`, order:100, color:'#d5eeeb', icon:'🎮' }, null, 2)+'\n');
  console.log(`Created games/${id}/. Edit the scene and manifest; the next build registers it automatically.`);
} catch (error) { await rm(folder, { recursive:true, force:true }); throw error; }

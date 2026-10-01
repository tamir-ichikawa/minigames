import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
export async function discoverGames(root) {
  const result = [], ids = new Set();
  const folders = await readdir(path.join(root, 'games'), { withFileTypes: true });
  for (const folder of folders.filter(f => f.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const filename = path.join(root, 'games', folder.name, 'manifest.json');
    let text;
    try { text = await readFile(filename, 'utf8'); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    const game = JSON.parse(text);
    if (typeof game.enabled !== 'boolean') throw new Error(`${filename}: enabled must be boolean`);
    if (!game.enabled) continue; // Disabled modules may be absent or under construction.
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(game.id) || ids.has(game.id)) throw new Error(`${filename}: invalid/duplicate id`);
    ids.add(game.id);
    for (const key of ['title', 'description', 'thumbnail', 'module', 'icon', 'color']) {
      if (typeof game[key] !== 'string' || !game[key]) throw new Error(`${filename}: missing ${key}`);
    }
    if (!['action', 'puzzle', 'brain', 'other'].includes(game.category)) throw new Error(`${filename}: invalid category`);
    if (!['legacy', 'phaser', 'canvas', 'webgl'].includes(game.engine)) throw new Error(`${filename}: invalid engine`);
    if (!Number.isFinite(game.order)) throw new Error(`${filename}: invalid order`);
    for (const key of ['module', 'thumbnail', 'legacyUrl']) {
      if (!game[key]) continue;
      const file = game[key];
      if (file.startsWith('/') || file.includes('\\') || file.split('/').includes('..') || /^[a-z]+:/i.test(file)) throw new Error(`${filename}: ${key} must be a project-relative path`);
      await access(path.join(root, file));
    }
    if (game.engine === 'legacy' && !game.module.endsWith('.html')) throw new Error(`${filename}: legacy module must be HTML`);
    if (game.engine !== 'legacy' && !game.module.endsWith('.ts')) throw new Error(`${filename}: native module must be TypeScript`);
    if (game.score && (typeof game.score.selector !== 'string' || !['higher', 'lower'].includes(game.score.direction) || typeof game.score.unit !== 'string')) throw new Error(`${filename}: invalid score descriptor`);
    result.push(game);
  }
  return result.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

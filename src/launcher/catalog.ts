import { games } from 'virtual:games';
const base = new URL(document.body.dataset.base ?? './', location.href);
const collection = document.body.dataset.launcher === 'collection';
const grid = document.querySelector<HTMLElement>(collection ? '#games' : '.game-grid')!;
const categories = { all: 'すべて', action: 'アクション', puzzle: 'パズル', brain: 'ことば・頭の体操', other: 'その他' };
let filters = document.getElementById('filters');
if (!filters) { filters = document.createElement('nav'); filters.id = 'filters'; filters.setAttribute('aria-label', 'ジャンル'); grid.before(filters); }
filters.replaceChildren();
for (const [key, title] of Object.entries(categories)) {
  const button = document.createElement('button'); button.textContent = title; button.dataset.filter = key;
  button.onclick = () => render(key); filters.append(button);
}
function render(filter: string) {
  const list = games.filter(game => filter === 'all' || game.category === filter);
  filters!.querySelectorAll('button').forEach(button => { const active = button.dataset.filter === filter; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  grid.replaceChildren();
  for (const game of list) {
    const card = document.createElement('a'); card.className = 'game-card'; card.href = new URL(`play.html?game=${encodeURIComponent(game.id)}`, base).href;
    card.dataset.game = game.id; card.setAttribute('aria-label', game.title + 'をプレイ');
    const cover = document.createElement('div'); cover.className = collection ? 'cover' : 'card-art collection-art';
    cover.style.setProperty('--game-color', game.color); cover.style.setProperty('--accent', game.color);
    const image = document.createElement('img'); image.src = new URL(game.thumbnail, base).href; image.alt = ''; image.width = image.height = 104; image.loading = 'lazy'; cover.append(image);
    const body = document.createElement('div'); body.className = collection ? 'card-text' : 'card-body';
    const kicker = document.createElement('p'); kicker.className = 'card-kicker'; kicker.textContent = categories[game.category];
    const title = document.createElement('h3'); title.className = 'card-title'; title.textContent = game.title;
    const description = document.createElement('p'); description.className = 'card-description'; description.textContent = game.description;
    const cta = document.createElement('span'); cta.className = 'card-cta'; cta.textContent = 'プレイする →';
    if (!collection) body.append(kicker); body.append(title, description); if (!collection) body.append(cta);
    card.append(cover, body); grid.append(card);
  }
  const count = document.querySelector(collection ? '#count' : '.selection-copy');
  if (count) count.textContent = `${list.length}ゲーム。好きなゲームを選んでスタートしよう。`;
  if (collection) document.querySelector('footer')!.textContent = `全${games.length}ゲーム。タップでも、キーボードでも。`;
}
render('all');
const showGames = () => { document.getElementById('opening')?.classList.add('is-hidden'); document.getElementById('selection')?.classList.add('is-visible'); };
document.getElementById('show-games')?.addEventListener('click', () => { showGames(); history.replaceState(null, '', '#selection'); });
if (location.hash === '#selection') showGames();

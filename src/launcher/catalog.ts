import { games } from 'virtual:games';
const base = new URL(document.body.dataset.base ?? './', location.href);
const collection = document.body.dataset.launcher === 'collection';
const grid = document.querySelector<HTMLElement>(collection ? '#games' : '.game-grid')!;
const recommended = document.createElement('section');
recommended.id = 'recommended'; recommended.setAttribute('aria-labelledby', 'recommended-title');
const recommendedHeading = document.createElement('h3');
recommendedHeading.id = 'recommended-title'; recommendedHeading.className = 'catalog-heading'; recommendedHeading.textContent = 'おすすめ';
const recommendedCopy = document.createElement('p'); recommendedCopy.className = 'catalog-copy';
recommendedCopy.textContent = '遊びやすさや演出を磨いてきたゲームをピックアップ。';
const recommendedGrid = document.createElement('div'); recommendedGrid.className = collection ? 'grid recommended-grid' : 'game-grid recommended-grid';
recommended.append(recommendedHeading, recommendedCopy, recommendedGrid);
const otherHeading = document.createElement('h3'); otherHeading.className = 'catalog-heading other-games-heading'; otherHeading.textContent = 'ほかのゲーム';
const categories = { all: 'すべて', action: 'アクション', puzzle: 'パズル', brain: 'ことば・頭の体操', other: 'その他' };
let filters = document.getElementById('filters');
if (!filters) { filters = document.createElement('nav'); filters.id = 'filters'; filters.setAttribute('aria-label', 'ジャンル'); grid.before(filters); }
filters.replaceChildren();
for (const [key, title] of Object.entries(categories)) {
  const button = document.createElement('button'); button.textContent = title; button.dataset.filter = key;
  button.onclick = () => render(key); filters.append(button);
}
grid.before(recommended, otherHeading);
function render(filter: string) {
  const list = games.filter(game => filter === 'all' || game.category === filter);
  const picks = list.filter(game => game.recommendation).sort((a, b) => a.recommendation!.order - b.recommendation!.order || a.order - b.order || a.id.localeCompare(b.id));
  const others = list.filter(game => !game.recommendation);
  filters!.querySelectorAll('button').forEach(button => { const active = button.dataset.filter === filter; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  grid.replaceChildren(); recommendedGrid.replaceChildren();
  recommended.hidden = picks.length === 0;
  otherHeading.hidden = picks.length === 0 || others.length === 0;
  grid.hidden = others.length === 0;
  for (const game of [...picks, ...others]) {
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
    if (game.recommendation) {
      card.classList.add('recommended-card');
      const badge = document.createElement('span'); badge.className = 'recommended-badge'; badge.textContent = '★ おすすめ'; cover.append(badge);
      const reason = document.createElement('p'); reason.className = 'recommendation-note'; reason.textContent = game.recommendation.reason;
      title.after(reason);
      image.loading = 'eager';
    }
    card.append(cover, body); (game.recommendation ? recommendedGrid : grid).append(card);
  }
  const count = document.querySelector(collection ? '#count' : '.selection-copy');
  if (count) count.textContent = `${list.length}ゲーム。好きなゲームを選んでスタートしよう。`;
  if (collection) document.querySelector('footer')!.textContent = `全${games.length}ゲーム。タップでも、キーボードでも。`;
}
render('all');
const showGames = () => { document.getElementById('opening')?.classList.add('is-hidden'); document.getElementById('selection')?.classList.add('is-visible'); };
document.getElementById('show-games')?.addEventListener('click', () => { showGames(); history.replaceState(null, '', '#selection'); });
if (location.hash === '#selection') showGames();

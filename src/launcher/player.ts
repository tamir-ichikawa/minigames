import { games } from 'virtual:games';
import { GameHost } from '../core/host';
import { createWebPlatform } from '../platform/web';
import type { GameContext, Settings } from '../core/types';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const platform = createWebPlatform();
const stored = platform.storage.read<Settings>('settings', { muted: false });
const settings: Settings = { muted: stored?.muted === true };
const base = new URL('./', location.href);
const game = games.find(g => g.id === new URL(location.href).searchParams.get('game'));
const pause = $<HTMLButtonElement>('pause'), reset = $<HTMLButtonElement>('reset');
const host = new GameHost(state => {
  document.body.dataset.state = state;
  pause.disabled = reset.disabled = !['running', 'paused'].includes(state);
  pause.textContent = state === 'paused' ? '再開' : '一時停止';
  $('paused').hidden = state !== 'paused';
  $('stage').inert = state === 'paused';
  $('loading').hidden = state !== 'loading';
});
const fail = (error: unknown) => { $('error').hidden = false; $('error-message').textContent = error instanceof Error ? error.message : String(error); };
async function exit() { await host.destroy().catch(console.error); location.href = new URL('index.html#selection', base).href; }
const context: GameContext = {
  container: $('stage'), platform, settings,
  assetUrl: path => new URL(path, base).href,
  reportScore: score => { $('score').textContent = score ? `${score.value.toLocaleString()} ${score.unit}` : '記録はゲーム画面で確認'; },
  requestExit: () => { void exit(); }
};
$('exit').onclick = () => { void exit(); };
pause.onclick = () => { void (host.state === 'paused' ? host.resume() : host.pause()).catch(fail); };
$('resume').onclick = () => { void host.resume().catch(fail); };
reset.onclick = () => { $('error').hidden = true; void host.reset().catch(fail); };
const mute = $<HTMLInputElement>('mute'); mute.checked = settings.muted;
mute.onchange = () => {
  settings.muted = mute.checked; host.module?.setSettings(settings);
  if (!platform.storage.write('settings', settings)) $('notice').textContent = '音の設定はこの起動中のみ保存されます。';
};
const unsubscribe = platform.onSuspend(() => { void host.pause().catch(fail); });
window.addEventListener('pagehide', () => { unsubscribe(); void host.destroy(); }, { once: true });
document.addEventListener('keydown', event => { if (event.code === 'Escape' && !event.repeat) { event.preventDefault(); pause.click(); } });
if (!game) fail(new Error('このゲームは削除または無効化されています。一覧から選び直してください。'));
else {
  document.title = `${game.title} | ミニゲームシリーズ`; $('game-title').textContent = game.title;
  if (game.legacyUrl) { const link = $<HTMLAnchorElement>('legacy'); link.href = context.assetUrl(game.legacyUrl); link.hidden = false; }
  void host.load(game, context).then(() => { if (document.hidden) return host.pause(); }).catch(fail);
}

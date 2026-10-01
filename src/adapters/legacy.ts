import type { GameContext, GameDefinition, GameModule, Score, Settings } from '../core/types';
export function createLegacyGame(definition: GameDefinition): GameModule {
  let context: GameContext, frame: HTMLIFrameElement | undefined, score: Score | null = null;
  let session = '', ready: (() => void) | undefined;
  const pending = new Map<number, { resolve(): void; reject(error: Error): void; timer: number }>();
  let request = 0;
  const receive = (event: MessageEvent) => {
    const msg = event.data;
    if (event.source !== frame?.contentWindow || event.origin !== location.origin || msg?.channel !== 'minigames-v1' || msg.session !== session) return;
    if (msg.type === 'ready') ready?.();
    if (msg.type === 'score') { score = msg.score; context.reportScore(score); }
    if (msg.type === 'exit') context.requestExit();
    if (msg.type === 'ack') { const job = pending.get(msg.request); if (job) { clearTimeout(job.timer); pending.delete(msg.request); job.resolve(); } }
  };
  function send(type: string, extra = {}): Promise<void> {
    if (!frame?.contentWindow) return Promise.resolve();
    const id = ++request;
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => { pending.delete(id); reject(new Error('ゲームとの通信がタイムアウトしました。再読み込みしてください。')); }, 5000);
      pending.set(id, { resolve, reject, timer });
      frame!.contentWindow!.postMessage({ channel: 'minigames-v1', session, type, request: id, ...extra }, location.origin);
    });
  }
  async function mount() {
    score = null; context.reportScore(null);
    session = crypto.randomUUID();
    frame = document.createElement('iframe');
    frame.title = definition.title; frame.className = 'legacy-frame';
    frame.allow = 'autoplay; fullscreen';
    const url = new URL(context.assetUrl(definition.module)); url.searchParams.set('minigame', session);
    const loaded = new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => { ready = undefined; reject(new Error('ゲームを読み込めませんでした。')); }, 12000);
      ready = () => { clearTimeout(timeout); ready = undefined; resolve(); };
    });
    frame.src = url.href; context.container.replaceChildren(frame);
    await loaded;
    await send('configure', { settings: context.settings, score: definition.score });
  }
  function remove() {
    for (const job of pending.values()) { clearTimeout(job.timer); job.resolve(); } pending.clear();
    frame?.remove(); frame = undefined; score = null;
  }
  return {
    async init(ctx) { context = ctx; window.addEventListener('message', receive); await mount(); },
    start() { frame?.contentWindow?.focus(); },
    pause() { return send('pause'); },
    async resume() { await send('resume'); frame?.contentWindow?.focus(); },
    async reset() { await send('destroy').catch(() => {}); remove(); await mount(); frame?.contentWindow?.focus(); },
    async destroy() { await send('destroy').catch(() => {}); remove(); window.removeEventListener('message', receive); },
    getScore() { return score; },
    setSettings(settings: Settings) { context.settings = settings; void send('settings', { settings }).catch(console.error); }
  };
}

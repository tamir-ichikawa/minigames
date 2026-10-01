import Phaser from 'phaser';
import type { GameContext, GameModule, Score, Settings } from '../core/types';
export interface PhaserModuleOptions {
  width?: number;
  height?: number;
  /** Asset-heavy games can allow more time on slow connections. */
  loadTimeoutMs?: number;
  createScene(context: GameContext, ready: () => void): Phaser.Scene;
  getScore(): Score | null;
}
/** Only this adapter owns Phaser.Game. Custom CanvasTextures / pipelines stay in scenes. */
export function createPhaserModule(options: PhaserModuleOptions): GameModule {
  let context: GameContext, game: Phaser.Game | undefined;
  async function mount() {
    context.container.replaceChildren();
    const stage = document.createElement('div'); stage.className = 'phaser-stage'; context.container.append(stage);
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('Phaser の初期化がタイムアウトしました。')), options.loadTimeoutMs ?? 12000);
      const scene = options.createScene(context, () => { clearTimeout(timeout); resolve(); });
      game = new Phaser.Game({
        type: Phaser.AUTO, parent: stage, width: options.width ?? 480, height: options.height ?? 640,
        backgroundColor: '#141d36', scene: [scene],
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        input: { activePointers: 2 }, audio: { disableWebAudio: false },
        callbacks: { postBoot: instance => { instance.sound.mute = context.settings.muted; } }
      });
    });
  }
  async function destroyGame() {
    if (!game) return;
    const current = game; game = undefined;
    await new Promise<void>(resolve => {
      current.events.once(Phaser.Core.Events.DESTROY, () => resolve());
      // Destruction is processed on the next frame, including when manually paused.
      current.resume(); current.loop.wake(); current.destroy(true);
    });
    context.container.replaceChildren();
  }
  return {
    async init(ctx) { context = ctx; await mount(); },
    start() { game?.canvas?.focus(); },
    pause() { if (game) { game.input.enabled = false; game.sound.pauseAll(); game.pause(); } },
    resume() { if (game) { game.resume(); game.input.enabled = true; game.sound.resumeAll(); game.canvas.focus(); } },
    async reset() { await destroyGame(); await mount(); },
    destroy: destroyGame,
    getScore: options.getScore,
    setSettings(settings: Settings) { context.settings = settings; if (game) game.sound.mute = settings.muted; }
  };
}

import type { GameContext, GameModule, RegisteredGame } from './types';
export type HostState = 'idle' | 'loading' | 'running' | 'paused' | 'error';
/** A single owner serializes lifecycle transitions and cleans up partial initialization. */
export class GameHost {
  module?: GameModule;
  state: HostState = 'idle';
  private queue: Promise<void> = Promise.resolve();
  constructor(private changed: (state: HostState) => void) {}
  private set(state: HostState) { this.state = state; this.changed(state); }
  private run(action: () => Promise<void>) {
    const task = this.queue.then(action);
    this.queue = task.catch(() => {});
    return task;
  }
  load(definition: RegisteredGame, context: GameContext) {
    return this.run(async () => {
      await this.dispose(); this.set('loading');
      try {
        const { createGame } = await definition.load();
        this.module = createGame();
        await this.module.init(context); await this.module.start(); this.set('running');
      } catch (error) { await this.dispose(); this.set('error'); throw error; }
    });
  }
  pause() { return this.run(async () => { if (this.state !== 'running') return; await this.module!.pause(); this.set('paused'); }); }
  resume() { return this.run(async () => { if (this.state !== 'paused') return; await this.module!.resume(); this.set('running'); }); }
  reset() { return this.run(async () => {
    if (!this.module) return;
    this.set('loading');
    try { await this.module.reset(); await this.module.start(); this.set('running'); }
    catch (error) { await this.dispose(); this.set('error'); throw error; }
  }); }
  destroy() { return this.run(() => this.dispose()); }
  private async dispose() {
    const current = this.module; this.module = undefined;
    try { await current?.destroy(); } finally { this.set('idle'); }
  }
}

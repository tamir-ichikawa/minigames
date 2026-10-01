import Phaser from 'phaser';
import { createPhaserModule } from '../../src/adapters/phaser';
import type { GameContext, Score } from '../../src/core/types';
import { ReflexRound } from './model';
export function createGame() {
  let score: Score | null = null;
  class ReflexScene extends Phaser.Scene {
    model = new ReflexRound();
    elapsed = 0;
    best = 9999;
    text!: Phaser.GameObjects.Text;
    detail!: Phaser.GameObjects.Text;
    history!: Phaser.GameObjects.Text;
    action!: HTMLButtonElement;
    live!: HTMLParagraphElement;
    wait?: Phaser.Time.TimerEvent;
    constructor(private ctx: GameContext, private ready: () => void) { super('reflex'); }
    create() {
      score = null; this.ctx.reportScore(null);
      const saved = this.ctx.platform.storage.read<number>('reflex:best-ms', 9999);
      const legacy = this.ctx.platform.readLegacyNumber('rfx1') ?? 9999;
      this.best = Math.min(Number.isFinite(saved) && saved >= 0 ? saved : 9999, legacy >= 0 ? legacy : 9999);
      this.add.text(240, 62, '反射神経テスト', { fontFamily: 'sans-serif', fontSize: '32px', color: '#ffffff' }).setOrigin(.5);
      this.text = this.add.text(240, 230, '', { fontFamily: 'sans-serif', fontSize: '32px', align: 'center', wordWrap: { width: 430 } }).setOrigin(.5);
      this.detail = this.add.text(240, 335, '', { fontFamily: 'sans-serif', fontSize: '21px', align: 'center', wordWrap: { width: 420 }, lineSpacing: 10 }).setOrigin(.5);
      this.history = this.add.text(240, 482, '', { fontFamily: 'sans-serif', fontSize: '20px', align: 'center', wordWrap: { width: 420 } }).setOrigin(.5);
      this.add.text(240, 580, 'タップ / Space / Enter', { fontFamily: 'sans-serif', fontSize: '18px', color: '#c4cde2' }).setOrigin(.5);
      const controls = document.createElement('div'); controls.className = 'native-controls';
      this.action = document.createElement('button'); this.action.type = 'button'; this.action.onclick = () => this.press();
      this.live = document.createElement('p'); this.live.className = 'sr-only'; this.live.setAttribute('aria-live', 'polite');
      controls.append(this.action, this.live); this.ctx.container.append(controls);
      this.game.canvas.tabIndex = 0; this.game.canvas.setAttribute('aria-label', '反射神経テスト。下のボタン、Space、Enterでも操作できます。');
      this.input.on('pointerdown', () => this.press());
      this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
        if (['Space','Enter'].includes(event.code) && !event.repeat && !(event.target instanceof HTMLButtonElement)) { event.preventDefault(); this.press(); }
      });
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => controls.remove());
      this.events.once(Phaser.Scenes.Events.DESTROY, () => controls.remove());
      this.show('緑になったらタップ！', '5回の反応時間を計測します\n早すぎるタップはフライングです', 'スタート（5回勝負）');
      this.history.setText(`歴代最速: ${this.best === 9999 ? '—' : this.best + ' ms'}`);
      this.ready();
    }
    update(_time: number, delta: number) { this.elapsed += delta; }
    show(title: string, detail: string, action: string) {
      this.text.setText(title); this.detail.setText(detail); this.action.textContent = action;
      this.live.textContent = `${title} ${detail}`;
      this.ctx.container.dataset.phase = this.model.phase;
    }
    press() {
      if (this.model.phase === 'title' || this.model.phase === 'result') { this.model.begin(); score = null; this.ctx.reportScore(null); this.startRound(); return; }
      const value = this.model.tap(this.elapsed);
      if (value === undefined) return;
      this.wait?.remove();
      this.cameras.main.setBackgroundColor(value === null ? '#75354b' : '#183c42');
      this.show(value === null ? 'はやすぎ！' : `${value} ms`, value === null ? '緑に変わるまで待ってね' : value < 200 ? 'はやい！' : value < 350 ? 'いいかんじ！' : '次も挑戦しよう', '次の計測を待っています');
      this.action.disabled = true;
      this.renderHistory();
      this.time.delayedCall(1500, () => { this.action.disabled = false; this.model.next(); this.model.phase === 'result' ? this.finish() : this.startRound(); });
    }
    renderHistory() { this.history.setText(this.model.results.map((n, i) => `${i + 1}: ${n === null ? 'フライング' : n + ' ms'}`).join('\n')); }
    startRound() {
      this.cameras.main.setBackgroundColor('#623249');
      this.show('まってね…', `${this.model.results.length + 1} / 5\n緑になったらタップ！`, '緑になったらタップ');
      this.renderHistory();
      this.wait = this.time.delayedCall(1500 + Math.random() * 2500, () => {
        this.model.green(this.elapsed); this.cameras.main.setBackgroundColor('#207744');
        this.show('タップ！', '今すぐ！', '今すぐタップ！');
      });
    }
    finish() {
      const summary = this.model.summary;
      this.cameras.main.setBackgroundColor('#141d36');
      if (summary) {
        this.best = Math.min(this.best, summary.best);
        const persisted = this.ctx.platform.storage.write('reflex:best-ms', this.best);
        score = { value: summary.average, unit: 'ms（平均）', direction: 'lower' };
        this.ctx.reportScore(score);
        this.show('計測完了！', `平均 ${summary.average} ms\n最速 ${summary.best} / 最遅 ${summary.worst} ms\n歴代最速 ${this.best} ms${persisted ? '' : '\n記録はこの起動中のみ保存'}`, 'もう一回');
      } else { score = null; this.ctx.reportScore(null); this.show('全部フライング！', '次は緑を待ってタップしよう', 'もう一回'); }
      this.renderHistory();
    }
  }
  return createPhaserModule({ createScene: (ctx, ready) => new ReflexScene(ctx, ready), getScore: () => score });
}

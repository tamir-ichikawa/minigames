import Phaser from 'phaser';
import type { GameContext, Score } from '../../src/core/types';
import { FIELD, StarRally, type Mood, type RallyEvent } from './model';
import { STAR_COLORS, STAR_STAGES, type StarStage } from './stages';

const FONT = '"Trebuchet MS", "Hiragino Kaku Gothic ProN", sans-serif';
const MOODS: Mood[] = ['idle', 'sad', 'happy', 'return'];
const BONUS_ART = {
  // Per-frame pivots align the painted subject with the physics center (627px cells).
  ufo: { file: 'ufo-flight-sheet.png', size: 68, fps: 7, pivots: [[323,334],[295,334],[323,307],[300,302]] },
  comet: { file: 'comet-flight-sheet.png', size: 100, fps: 9, pivots: [[471,375],[447,376],[471,295],[447,297]] }
};

/** The scene owns presentation and input; StarRally owns the rules. */
export class StarScene extends Phaser.Scene {
  model!: StarRally;
  private stage: StarStage = STAR_STAGES[0];
  private view: 'select' | 'playing' | 'over' = 'select';
  private world!: Phaser.GameObjects.Container;
  private actor!: Phaser.GameObjects.Sprite;
  private speech!: Phaser.GameObjects.Text;
  private ink!: Phaser.GameObjects.Graphics;
  private bonusLayer!: Phaser.GameObjects.Container;
  private bonusSprites = new Map<number, Phaser.GameObjects.Sprite>();
  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private countdown!: Phaser.GameObjects.Text;
  private stars: Phaser.GameObjects.Star[] = [];
  private clock = 0;
  private mood: Mood = 'idle';
  private moodUntil = 0;
  private best = 0;
  private persisted = true;
  private trail: {x: number; y: number}[] = [];
  private controls!: HTMLDivElement;
  private live!: HTMLParagraphElement;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private held = 0;
  private heldPointer?: number;
  constructor(private ctx: GameContext, private ready: () => void, private scoreChanged: (score: Score | null) => void) { super('star-bounce'); }

  preload() {
    for (const stage of STAR_STAGES) {
      this.load.image(`${stage.id}-space`, this.ctx.assetUrl(stage.background));
      for (const mood of MOODS) this.load.image(`${stage.id}-${mood}`, this.ctx.assetUrl(`games/pong/assets/${stage.sprites[mood]}`));
    }
    for (const tone of ['return', 'goal', 'miss', 'bonus']) this.load.audio(`star-${tone}`, this.ctx.assetUrl(`games/pong/assets/${tone}.wav`));
    for (const [kind, art] of Object.entries(BONUS_ART)) this.load.image(`bonus-${kind}`, this.ctx.assetUrl(`games/pong/assets/${art.file}`));
  }
  create() {
    for (const stage of STAR_STAGES) for (const mood of MOODS) {
      this.createSheetAnimation(`${stage.id}-${mood}`, mood === 'idle' ? 4 : 7, mood === 'idle' ? -1 : 0);
    }
    for (const [kind, art] of Object.entries(BONUS_ART)) this.createSheetAnimation(`bonus-${kind}`, art.fps, -1);
    const styles = document.createElement('style');
    styles.textContent = `.star-controls{display:flex;justify-content:center;align-items:center;gap:10px;flex-wrap:wrap;padding:9px 14px max(9px,env(safe-area-inset-bottom));background:#101322;border-top:1px solid #30334c;flex-shrink:0}.star-controls button{min-height:42px;border-radius:24px;font-weight:700;padding:9px 23px}.star-controls .star-primary{background:#d0ffa6;color:#192c28;border-color:#d0ffa6;box-shadow:0 3px 18px #b7fa8920}.star-controls select{max-width:170px;background:#1b253b;color:#e4edee;border:1px solid #607494;border-radius:8px;padding:10px;font:inherit;font-size:12px}.star-controls small{color:#c6c5d9;font-size:12px}.star-controls .star-direction{min-width:56px;padding:8px;touch-action:none}.star-controls button:focus-visible,.star-controls select:focus-visible{outline:3px solid #ffe39b;outline-offset:2px}@media(max-height:550px){.star-controls{padding:4px;gap:6px}.star-controls button{min-height:32px;padding:4px 16px}}`;
    this.controls = document.createElement('div'); this.controls.className = 'star-controls';
    this.live = document.createElement('p'); this.live.className = 'sr-only'; this.live.setAttribute('aria-live', 'polite');
    this.ctx.container.append(styles, this.controls, this.live);
    this.game.canvas.tabIndex = 0;
    this.game.canvas.style.touchAction = 'none';
    this.game.canvas.setAttribute('aria-label', 'STAR BOUNCE。左右にドラッグ、矢印キー、または下の左右ボタンで光のバーを動かします。');
    this.keys = this.input.keyboard?.addKeys('LEFT,RIGHT,A,D') as typeof this.keys;
    const move = (pointer: Phaser.Input.Pointer) => {
      if (this.view === 'playing' && (pointer.isDown || pointer.wasTouch === false)) this.model.movePlayer(pointer.x);
    };
    this.input.on('pointerdown', move); this.input.on('pointermove', move);
    const clearInput = () => { this.held = 0; this.heldPointer = undefined; this.input.keyboard?.resetKeys(); };
    this.game.events.on(Phaser.Core.Events.PAUSE, clearInput);
    this.game.events.on(Phaser.Core.Events.BLUR, clearInput);
    // Controls can change the available canvas height without a window resize.
    const observer = new ResizeObserver(() => this.fitCanvas());
    observer.observe(this.game.canvas.parentElement!);
    const cleanup = () => {
      observer.disconnect();
      this.bonusSprites.clear();
      styles.remove(); this.controls.remove(); this.live.remove();
      this.game.events.off(Phaser.Core.Events.PAUSE, clearInput); this.game.events.off(Phaser.Core.Events.BLUR, clearInput);
      for (const key of ['phase','hp','mood','gameScore']) delete this.ctx.container.dataset[key];
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
    this.showSelection(); this.ready();
  }
  private createSheetAnimation(key: string, frameRate: number, repeat: number) {
    const texture = this.textures.get(key);
    const width = texture.getSourceImage().width / 2, height = texture.getSourceImage().height / 2;
    for (let frame = 0; frame < 4; frame++) texture.add(frame, 0, frame % 2 * width, Math.floor(frame / 2) * height, width, height);
    this.anims.create({ key, frames: [0, 1, 2, 3].map(frame => ({ key, frame })), frameRate, repeat });
  }
  private text(x: number, y: number, content: string, size = 16, color = '#e8edf5', centered = false) {
    const text = this.add.text(x, y, content, { fontFamily: FONT, fontSize: `${size}px`, color, align: centered ? 'center' : 'left', lineSpacing: 7 }).setOrigin(centered ? .5 : 0, .5);
    this.world.add(text); return text;
  }
  private panel(x: number, y: number, width: number, height: number, fill = 0x141d32, alpha = .92, stroke = 0x536076) {
    const g = this.add.graphics().fillStyle(fill, alpha).fillRoundedRect(x, y, width, height, 24).lineStyle(1, stroke, .7).strokeRoundedRect(x, y, width, height, 24);
    this.world.add(g); return g;
  }
  private background() {
    this.tweens.killAll(); this.time.removeAllEvents(); this.world?.destroy(true); this.trail = [];
    this.bonusSprites.clear();
    this.world = this.add.container();
    const bg = this.add.image(240, 380, `${this.stage.id}-space`); const source = bg.texture.getSourceImage();
    bg.setScale(Math.max(480 / source.width, 760 / source.height)); this.world.add(bg);
    this.world.add(this.add.rectangle(240, 380, 480, 760, 0x0e122c, .22));
    const orbit = this.add.graphics().lineStyle(1, 0x8380bd, .16);
    orbit.strokeEllipse(270, 390, 640, 440); orbit.strokeEllipse(270, 390, 670, 468); this.world.add(orbit);
    this.best = this.ctx.platform.storage.read<number>(this.bestKey, 0);
    if (!Number.isFinite(this.best) || this.best < 0) this.best = 0;
    this.held = 0;
  }
  private get bestKey() { return `pong:star-bounce:${this.stage.id}:best:v1`; }
  private get stageNumber() { return String(STAR_STAGES.indexOf(this.stage) + 1).padStart(2, '0'); }
  private fitCanvas() { this.scale.getParentBounds(); this.scale.refresh(); }
  private makeActor(x: number, y: number, size: number) {
    this.actor = this.add.sprite(x, y, `${this.stage.id}-idle`, 0).setDisplaySize(size, size); this.world.add(this.actor);
    this.speech = this.text(x + 92, y - 15, '', 15, '#fff0ab', true);
    this.mood = 'idle'; this.moodUntil = 0; this.actor.play(`${this.stage.id}-idle`); this.ctx.container.dataset.mood = 'idle';
  }
  private button(label: string, callback: () => void, primary = false) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
    if (primary) button.className = 'star-primary';
    button.onclick = () => { if (!this.game.isPaused) callback(); }; this.controls.append(button); return button;
  }
  private showSelection() {
    this.view = 'select'; this.background(); this.model = new StarRally(this.stage);
    this.scoreChanged(null); this.ctx.reportScore(null); this.ctx.container.dataset.phase = 'select';
    this.ctx.container.dataset.hp = '5'; this.ctx.container.dataset.gameScore = '0';
    this.text(240, 40, 'THE COSMIC RALLY CLUB', 12, '#ceeac8', true).setLetterSpacing(3);
    this.text(240, 91, 'STAR BOUNCE', 43, '#fcfae9', true).setFontStyle('bold').setLetterSpacing(1);
    this.text(240, 135, '星を守って、どこまでも。', 17, '#cecde5', true);
    this.makeActor(240, 294, 252);
    this.text(240, 432, `YOUR RIVAL · ${this.stage.rival}`, 12, '#d0ffb4', true).setLetterSpacing(2);
    this.panel(32, 469, 416, 212);
    this.text(57, 496, `STAGE ${this.stageNumber}  /  ENDLESS`, 12, '#d0ffb4').setLetterSpacing(2);
    this.text(57, 534, this.stage.title, 26, '#fff8e9').setFontStyle('bold');
    this.text(57, 574, this.stage.subtitle, 15, '#d2d3e2');
    this.text(57, 612, '5つの星がなくなるまで、ラリーは続く。', 15, '#d2d3e2');
    this.text(57, 647, `GOAL +100    UFO +${this.stage.bonus.ufoPoints}    COMET +${this.stage.bonus.cometPoints}`, 12, '#ffe3a0');
    this.text(240, 722, `BEST  ${this.best.toLocaleString()}   •   左右にドラッグ / ← →`, 13, '#bbbcd5', true);
    this.controls.replaceChildren();
    const select = document.createElement('select'); select.setAttribute('aria-label', 'ステージ選択');
    for (const stage of STAR_STAGES) { const option = document.createElement('option'); option.value = stage.id; option.textContent = stage.title; select.append(option); }
    select.value = this.stage.id; select.onchange = () => { this.stage = STAR_STAGES.find(s => s.id === select.value) ?? STAR_STAGES[0]; this.showSelection(); };
    this.controls.append(select); this.button('このステージで遊ぶ', () => this.begin(), true);
    this.fitCanvas();
    this.live.textContent = `${this.stage.title}。5回ミスするとゲームオーバー。光のバーでボールを返し、UFOと流れ星を狙おう。`;
  }
  private begin() {
    this.view = 'playing'; this.background(); this.model = new StarRally(this.stage); this.model.start();
    this.ctx.container.dataset.phase = 'playing'; this.ctx.container.dataset.hp = '5'; this.ctx.container.dataset.gameScore = '0';
    this.publishScore();
    this.text(30, 28, 'SCORE', 11, '#b5c6d6').setLetterSpacing(2);
    this.scoreText = this.text(28, 61, '0', 35, '#fffce9').setFontStyle('bold');
    this.bestText = this.text(450, 29, `BEST  ${this.best}`, 12, '#d7d7df').setOrigin(1, .5);
    this.text(450, 57, `STAGE ${this.stageNumber} · ${this.stage.title}`, 12, '#c7eab6').setOrigin(1, .5);
    this.stars = STAR_COLORS.map((color, i) => {
      const star = this.add.star(36 + i * 28, 105, 5, 5.5, 12, color).setStrokeStyle(1, 0xffffff, .55); this.world.add(star); return star;
    });
    this.makeActor(240, 163, 152);
    this.text(240, 238, this.stage.rival, 12, '#c9edc2', true);
    // Only the boundary is visible; the playfield never covers the star background.
    this.panel(20, 246, 440, 468, 0x10172f, 0, 0x5a627e);
    this.text(240, 452, 'E N D L E S S  O R B I T', 12, '#787b99', true).setAlpha(.5);
    this.world.add(this.add.line(0, 0, 40, 476, 440, 476, 0x9f9fc7, .12).setOrigin(0));
    this.bonusLayer = this.add.container(); this.world.add(this.bonusLayer);
    this.ink = this.add.graphics(); this.world.add(this.ink);
    this.countdown = this.text(240, 405, '', 23, '#ffe6a6', true).setFontStyle('bold');
    this.text(240, 740, '光のバーを左右へ。星を5つ、守りきろう。', 13, '#c1c6da', true);
    this.controls.replaceChildren();
    this.directionButton('←', -1, 'バーを左へ');
    const hint = document.createElement('small'); hint.textContent = 'ドラッグ / ← → キー'; this.controls.append(hint);
    this.directionButton('→', 1, 'バーを右へ');
    this.fitCanvas();
    this.live.textContent = 'スタート。残りの星は5つ。'; this.game.canvas.focus(); this.draw();
  }
  private directionButton(label: string, direction: number, aria: string) {
    const button = this.button(label, () => { this.model.movePlayer(this.model.playerX + direction * 28); });
    button.className = 'star-direction'; button.setAttribute('aria-label', aria);
    button.onpointerdown = event => {
      if (this.game.isPaused) return;
      this.held = direction; this.heldPointer = event.pointerId; button.setPointerCapture(event.pointerId);
    };
    const release = (event: PointerEvent) => { if (this.heldPointer === event.pointerId) { this.held = 0; this.heldPointer = undefined; } };
    button.onpointerup = release; button.onpointercancel = release; button.onlostpointercapture = release;
  }
  private publishScore() {
    const score: Score = { value: this.model.score, unit: '点', direction: 'higher' };
    this.scoreChanged(score); this.ctx.reportScore(score); this.ctx.container.dataset.gameScore = String(score.value);
    if (score.value > this.best) { this.best = score.value; this.persisted = this.ctx.platform.storage.write(this.bestKey, this.best); }
  }
  private react(mood: Mood, words: string, duration: number) {
    if ((this.mood === 'happy' || this.mood === 'sad') && this.clock < this.moodUntil && mood === 'return') return;
    this.mood = mood; this.moodUntil = this.clock + duration;
    this.actor.play(`${this.stage.id}-${mood}`); this.speech.setText(words); this.ctx.container.dataset.mood = mood;
  }
  private feedback(event: RallyEvent) {
    if (event.type === 'player-return') { this.react('return', 'いいね！', 650); this.chime('return', .22); }
    if (event.type === 'opponent-return') this.react('return', 'えいっ！', 650);
    if (event.type === 'goal') { this.react('sad', 'まいった〜', 1450); this.chime('goal', .35); }
    if (event.type === 'miss') {
      this.react('happy', 'やった！', 1500); this.chime('miss', .25); this.trail = [];
      const star = this.stars[this.model.hp];
      this.tweens.add({ targets: star, scale: 1.8, alpha: 0, angle: 65, duration: 350 });
      this.ctx.container.dataset.hp = String(this.model.hp);
      this.live.textContent = `ミス。残りの星は${this.model.hp}つ。`;
    }
    if (event.type === 'bonus') this.chime('bonus', .35);
    if (event.points > 0) {
      const label = event.type === 'bonus' ? `${event.kind === 'ufo' ? 'UFO' : 'COMET'} +${event.points}` : `+${event.points}`;
      const pop = this.text(Phaser.Math.Clamp(event.x, 80, 400), event.y - 30, label, event.points > 10 ? 24 : 16, '#ffe38f', true).setFontStyle('bold');
      this.tweens.add({ targets: pop, y: pop.y - 42, alpha: 0, duration: 950, onComplete: () => pop.destroy() });
      this.publishScore();
    }
    const color = event.type === 'miss' ? 0xff7da8 : event.type === 'bonus' ? 0xffde76 : this.stage.colors.accent;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const spark = this.add.star(event.x, event.y, 4, 2, 5, color); this.world.add(spark);
      this.tweens.add({ targets: spark, x: event.x + Math.cos(a) * 40, y: event.y + Math.sin(a) * 40, alpha: 0, scale: .2, duration: 480, onComplete: () => spark.destroy() });
    }
    this.scoreText.setText(this.model.score.toLocaleString()); this.bestText.setText(`BEST  ${this.best.toLocaleString()}`);
  }
  private chime(tone: string, volume: number) { this.sound.play(`star-${tone}`, { volume }); }
  private finish() {
    this.view = 'over'; this.ctx.container.dataset.phase = 'over'; this.held = 0;
    this.countdown.setText(''); this.trail = []; this.draw();
    this.panel(44, 325, 392, 310, 0x171d33, .98, 0xc8dba2);
    this.text(240, 357, 'また、星の海で。', 14, '#cceca9', true);
    this.text(240, 394, 'GAME OVER', 31, '#fff5df', true).setFontStyle('bold');
    this.text(240, 452, this.model.score.toLocaleString(), 48, '#ffe391', true).setFontStyle('bold');
    this.text(240, 496, `BEST  ${this.best.toLocaleString()}`, 15, '#d5dddb', true);
    this.text(240, 538, `ゴール ${this.model.goals}    最長ラリー ${this.model.maxRally}`, 16, '#d5d7e6', true);
    this.text(240, 573, `ボーナス ${this.model.bonusHits} 回`, 16, '#d5d7e6', true);
    this.text(240, 609, this.persisted ? `${this.stage.rival}「もういっかい、あそぼ！」` : '記録はこの起動中のみ保存されます', 13, '#c4e8b8', true);
    this.controls.replaceChildren(); this.button('もう一度あそぶ', () => this.begin(), true); this.button('ステージ選択', () => this.showSelection());
    this.fitCanvas();
    this.live.textContent = `ゲームオーバー。${this.model.score}点。ゴール${this.model.goals}回、最長ラリー${this.model.maxRally}回。`;
  }
  update(_time: number, delta: number) {
    this.clock += delta;
    if (this.mood !== 'idle' && this.clock >= this.moodUntil) {
      this.mood = 'idle'; this.actor.play(`${this.stage.id}-idle`); this.speech.setText(''); this.ctx.container.dataset.mood = 'idle';
    }
    if (this.view !== 'playing') return;
    const left = this.keys?.LEFT.isDown || this.keys?.A.isDown, right = this.keys?.RIGHT.isDown || this.keys?.D.isDown;
    const direction = this.held || (Number(right) - Number(left));
    if (direction) this.model.movePlayer(this.model.playerX + direction * Math.min(delta, 100) * .46);
    for (const event of this.model.advance(delta / 1000)) this.feedback(event);
    if (this.model.phase === 'over') { this.finish(); return; }
    this.countdown.setText(this.model.serveIn > .1 ? 'READY?' : '');
    this.draw();
  }
  private lightBar(x: number, y: number, width: number, color: number) {
    const g = this.ink;
    g.fillStyle(color, .08).fillRoundedRect(x - width / 2 - 9, y - 15, width + 18, 30, 15);
    g.fillStyle(color, .2).fillRoundedRect(x - width / 2 - 4, y - 10, width + 8, 20, 10);
    g.fillStyle(color, 1).fillRoundedRect(x - width / 2, y - 6, width, 12, 6);
    g.fillStyle(0xffffff, .92).fillRoundedRect(x - width / 2 + 3, y - 2, width - 6, 4, 2);
  }
  private draw() {
    const g = this.ink, model = this.model; g.clear();
    this.lightBar(model.opponentX, FIELD.opponentY, model.opponentWidth, this.stage.colors.opponent);
    this.lightBar(model.playerX, FIELD.playerY, model.playerWidth, this.stage.colors.player);
    this.syncBonuses();
    if (model.phase === 'over') return;
    const ball = model.ball;
    if (model.serveIn <= 0) { this.trail.push({ x: ball.x, y: ball.y }); if (this.trail.length > 9) this.trail.shift(); }
    else this.trail = [];
    this.trail.forEach((p,i) => g.fillStyle(0xffe5a2, i / 9 * .27).fillCircle(p.x,p.y, i / 9 * ball.radius));
    g.fillStyle(0xffe6a8,.08).fillCircle(ball.x,ball.y,22);
    g.fillStyle(0xffe6a8,.2).fillCircle(ball.x,ball.y,13);
    g.fillStyle(0xfff8d6,1).fillCircle(ball.x,ball.y,ball.radius);
    g.fillStyle(0xffffff,1).fillCircle(ball.x-2,ball.y-2,3);
  }
  private syncBonuses() {
    const activeIds = new Set(this.model.bonuses.map(target => target.id));
    for (const [id, sprite] of this.bonusSprites) {
      if (!activeIds.has(id)) { sprite.destroy(); this.bonusSprites.delete(id); }
    }
    for (const target of this.model.bonuses) {
      const art = BONUS_ART[target.kind], flipped = target.vx < 0;
      let sprite = this.bonusSprites.get(target.id);
      if (!sprite) {
        sprite = this.add.sprite(target.x, target.y, `bonus-${target.kind}`, 0).setDisplaySize(art.size, art.size);
        this.bonusLayer.add(sprite); this.bonusSprites.set(target.id, sprite);
        sprite.play(`bonus-${target.kind}`);
      }
      // Anchor on the comet's head, including when mirrored; its tail has no collision.
      const pivot = art.pivots[Number(sprite.frame.name)], originX = pivot[0] / 627, originY = pivot[1] / 627;
      sprite.setOrigin(flipped ? 1 - originX : originX, originY).setFlipX(flipped).setPosition(target.x, target.y);
    }
  }
}

import type { StarStage } from './stages';
export const FIELD = { width: 480, height: 760, left: 28, right: 452, top: 224, bottom: 716, playerY: 680, opponentY: 263 };
export type Mood = 'idle' | 'sad' | 'happy' | 'return';
export interface Ball { x: number; y: number; vx: number; vy: number; radius: number; }
export interface Bonus { id: number; kind: 'ufo' | 'comet'; x: number; y: number; vx: number; radius: number; }
export type RallyEvent =
  | { type: 'player-return' | 'opponent-return' | 'goal' | 'miss'; x: number; y: number; points: number }
  | { type: 'bonus'; x: number; y: number; points: number; kind: Bonus['kind'] };
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
/** Fixed-step simulation has no DOM, rendering, audio, persistence, or platform APIs. */
export class StarRally {
  phase: 'ready' | 'playing' | 'over' = 'ready';
  hp = 5;
  score = 0;
  goals = 0;
  rally = 0;
  maxRally = 0;
  returns = 0;
  bonusHits = 0;
  elapsed = 0;
  serveIn = 1.2;
  playerX = 240;
  playerWidth = 110;
  opponentX = 240;
  opponentWidth = 86;
  ball: Ball = { x: 240, y: 516, vx: 0, vy: 0, radius: 8 };
  bonuses: Bonus[] = [];
  private accumulator = 0;
  private nextBonus: number;
  private serial = 0;
  private aim = 240;
  private aimIn = 0;
  constructor(readonly stage: StarStage, private random: () => number = Math.random) { this.nextBonus = stage.bonus.firstAfter; }
  start() { if (this.phase === 'ready') { this.phase = 'playing'; this.prepareServe(); } }
  movePlayer(x: number) { this.playerX = clamp(x, FIELD.left + this.playerWidth / 2, FIELD.right - this.playerWidth / 2); }
  advance(seconds: number): RallyEvent[] {
    const events: RallyEvent[] = [];
    if (this.phase !== 'playing') return events;
    this.accumulator += clamp(seconds, 0, .1);
    while (this.accumulator + 1e-9 >= 1 / 120 && this.phase === 'playing') {
      this.accumulator -= 1 / 120; this.step(1 / 120, events);
    }
    return events;
  }
  private prepareServe() {
    this.serveIn = 1.35; this.rally = 0;
    this.ball = { x: this.playerX, y: 515, vx: (this.random() < .5 ? -1 : 1) * 95, vy: 260, radius: 8 };
    this.normalize(this.stage.difficulty.initialSpeed + Math.min(100, this.goals * 8));
  }
  private normalize(speed: number) {
    const b = this.ball;
    speed = clamp(speed, this.stage.difficulty.initialSpeed, this.stage.difficulty.maxSpeed);
    const vx = clamp(b.vx / (Math.hypot(b.vx, b.vy) || 1), -.86, .86) * speed;
    b.vx = vx; b.vy = (b.vy < 0 ? -1 : 1) * Math.sqrt(speed * speed - vx * vx);
  }
  private step(dt: number, events: RallyEvent[]) {
    this.elapsed += dt;
    if (this.serveIn > 0) { this.serveIn = Math.max(0, this.serveIn - dt); this.ball.x = this.playerX; return; }
    const b = this.ball;
    this.aimIn -= dt;
    if (this.aimIn <= 0) {
      this.aimIn = .16;
      // A fallible opponent: limited speed and a soft tracking error leave room to score.
      this.aim = b.vy < 0 ? b.x + Math.sin(this.elapsed * 1.7) * 42 : 240;
    }
    const aiSpeed = this.stage.difficulty.opponentSpeed + Math.min(40, this.goals * 3);
    this.opponentX = clamp(this.opponentX + clamp(this.aim - this.opponentX, -aiSpeed * dt, aiSpeed * dt), FIELD.left + this.opponentWidth / 2, FIELD.right - this.opponentWidth / 2);
    const previousY = b.y;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x - b.radius < FIELD.left) { b.x = FIELD.left + b.radius; b.vx = Math.abs(b.vx); }
    if (b.x + b.radius > FIELD.right) { b.x = FIELD.right - b.radius; b.vx = -Math.abs(b.vx); }
    const playerPlane = FIELD.playerY - 6 - b.radius;
    if (b.vy > 0 && previousY <= playerPlane && b.y >= playerPlane && Math.abs(b.x - this.playerX) <= this.playerWidth / 2 + b.radius) {
      b.y = playerPlane; this.bounce(this.playerX, this.playerWidth, -1);
      this.score += 10; this.returns++; this.rally++; this.maxRally = Math.max(this.maxRally, this.rally);
      events.push({ type: 'player-return', x: b.x, y: FIELD.playerY, points: 10 });
    }
    const opponentPlane = FIELD.opponentY + 6 + b.radius;
    if (b.vy < 0 && previousY >= opponentPlane && b.y <= opponentPlane && Math.abs(b.x - this.opponentX) <= this.opponentWidth / 2 + b.radius) {
      b.y = opponentPlane; this.bounce(this.opponentX, this.opponentWidth, 1);
      this.rally++; this.maxRally = Math.max(this.maxRally, this.rally);
      events.push({ type: 'opponent-return', x: b.x, y: FIELD.opponentY, points: 0 });
    }
    for (const bonus of this.bonuses) bonus.x += bonus.vx * dt;
    for (const bonus of [...this.bonuses]) {
      const dx = b.x - bonus.x, dy = b.y - bonus.y, radius = b.radius + bonus.radius, distance = Math.hypot(dx, dy);
      if (distance > radius) continue;
      const nx = distance ? dx / distance : 0, ny = distance ? dy / distance : (b.vy > 0 ? -1 : 1);
      b.x = bonus.x + nx * (radius + 1); b.y = bonus.y + ny * (radius + 1);
      const incoming = (b.vx - bonus.vx) * nx + b.vy * ny;
      if (incoming < 0) { b.vx -= 2 * incoming * nx; b.vy -= 2 * incoming * ny; }
      this.normalize(Math.hypot(b.vx, b.vy));
      const points = bonus.kind === 'ufo' ? this.stage.bonus.ufoPoints : this.stage.bonus.cometPoints;
      this.score += points; this.bonusHits++;
      this.bonuses = this.bonuses.filter(target => target.id !== bonus.id);
      events.push({ type: 'bonus', x: bonus.x, y: bonus.y, kind: bonus.kind, points });
    }
    this.bonuses = this.bonuses.filter(target => target.x > -65 && target.x < FIELD.width + 65);
    if (this.elapsed >= this.nextBonus && this.bonuses.length < 2) {
      const direction = this.random() < .5 ? 1 : -1;
      const kind = this.random() < .5 ? 'ufo' : 'comet';
      this.bonuses.push({ id: ++this.serial, kind, x: direction > 0 ? -40 : 520, y: 345 + this.random() * 215, vx: direction * (kind === 'ufo' ? 62 : 96), radius: kind === 'ufo' ? 27 : 20 });
      this.nextBonus = this.elapsed + this.stage.bonus.intervalMin + this.random() * (this.stage.bonus.intervalMax - this.stage.bonus.intervalMin);
    }
    if (b.y - b.radius > FIELD.bottom) {
      this.hp--; events.push({ type: 'miss', x: b.x, y: FIELD.bottom, points: 0 });
      if (this.hp === 0) { this.phase = 'over'; this.bonuses = []; }
      else this.prepareServe();
    } else if (b.y + b.radius < FIELD.top) {
      this.score += 100; this.goals++;
      events.push({ type: 'goal', x: b.x, y: FIELD.top, points: 100 });
      this.prepareServe();
    }
  }
  private bounce(center: number, width: number, direction: number) {
    const speed = Math.min(this.stage.difficulty.maxSpeed, Math.hypot(this.ball.vx, this.ball.vy) + 9);
    const offset = clamp((this.ball.x - center) / (width / 2), -1, 1);
    const angle = offset * Math.PI / 3;
    this.ball.vx = Math.sin(angle) * speed;
    this.ball.vy = direction * Math.cos(angle) * speed;
  }
}

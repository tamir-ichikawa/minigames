import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const compiled = await build({ stdin: { contents: "export * from './games/pong/model'; export * from './games/pong/stages';", resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
const { StarRally, STAR_STAGES, FIELD } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const make = () => { const game = new StarRally(STAR_STAGES[0], () => .2); game.start(); game.serveIn = 0; return game; };

test('STAR BOUNCE: exactly five misses, no extra damage after game over', () => {
  const game = make();
  for (let i=1; i<=5; i++) {
    game.serveIn=0; game.ball.y=FIELD.bottom+10; game.ball.vy=300;
    assert.equal(game.advance(1/60).filter(e=>e.type==='miss').length,1);
    assert.equal(game.hp,5-i); assert.equal(game.phase,i===5?'over':'playing');
  }
  assert.deepEqual(game.advance(1),[]); assert.equal(game.hp,0);
});
test('STAR BOUNCE: endless goals never finish the round; each goal scores 100', () => {
  const game=make();
  for(let i=0;i<30;i++) { game.serveIn=0;game.ball.y=FIELD.top-10;game.ball.vy=-300;game.advance(1/60); }
  assert.equal(game.score,3000);assert.equal(game.goals,30);assert.equal(game.hp,5);assert.equal(game.phase,'playing');
});
test('STAR BOUNCE: paddles clamp, crossing collision bounces once and caps speed', () => {
  const game=make();game.movePlayer(-1e5);assert.equal(game.playerX,FIELD.left+game.playerWidth/2);
  game.movePlayer(1e5);assert.equal(game.playerX,FIELD.right-game.playerWidth/2);
  game.movePlayer(240);game.ball={x:280,y:660,vx:0,vy:470,radius:8};
  const events=game.advance(1/60);assert.equal(events.filter(e=>e.type==='player-return').length,1);
  assert.equal(game.score,10);assert.ok(game.ball.vy<0);assert.ok(game.ball.vx>0);assert.ok(Math.hypot(game.ball.vx,game.ball.vy)<=470.001);
  game.advance(1/60);assert.equal(game.score,10);
  game.ball={x:game.opponentX,y:280,vx:0,vy:-300,radius:8};
  assert.equal(game.advance(1/60).filter(e=>e.type==='opponent-return').length,1);assert.ok(game.ball.vy>0);
});
test('STAR BOUNCE: UFO and comet award once, disappear and reflect ball', () => {
  for(const [kind,points] of [['ufo',250],['comet',150]]) {
    const game=make();game.ball={x:240,y:365,vx:0,vy:300,radius:8};
    game.bonuses=[{id:1,kind,x:240,y:395,vx:0,radius:27}];
    const events=game.advance(1/120);assert.equal(events[0].type,'bonus');assert.equal(game.score,points);
    assert.ok(game.ball.vy<0);assert.equal(game.bonuses.length,0);assert.equal(game.bonusHits,1);
    game.advance(1/60);assert.equal(game.score,points);
  }
});
test('STAR BOUNCE: misses outside paddle, bounded wall reflection, targets spawn and leave', () => {
  const game=make();game.ball={x:36,y:660,vx:0,vy:450,radius:8};
  for(let i=0;i<30;i++)game.advance(1/60);assert.equal(game.hp,4);
  game.serveIn=0;game.ball={x:30,y:400,vx:-250,vy:120,radius:8};game.advance(1/120);
  assert.ok(game.ball.vx>0);assert.equal(game.ball.x,36);
  game.elapsed=6;game.advance(1/120);assert.equal(game.bonuses.length,1);
  game.bonuses[0].x=600;game.advance(1/120);assert.equal(game.bonuses.length,0);
});
test('STAR BOUNCE: fixed-step simulation agrees at 30/60/144 fps', () => {
  const run=fps=>{const game=make();for(let i=0;i<fps*10;i++)game.advance(1/fps);return game;};
  const a=run(30),b=run(60),c=run(144);
  for(const game of [b,c]) { assert.equal(game.hp,a.hp);assert.equal(game.score,a.score);assert.ok(Math.abs(game.ball.x-a.ball.x)<1e-7);assert.ok(Math.abs(game.ball.y-a.ball.y)<1e-7); }
});

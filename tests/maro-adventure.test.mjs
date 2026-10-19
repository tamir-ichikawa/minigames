import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const result=await build({entryPoints:['sample_game/斉藤さんゲーム/model.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {Adventure,LEVELS,onRoad,distance,pointAlong,pathLength,TOTAL_MEDALS}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const tick=(m,seconds)=>{for(let i=0;i<seconds*120;i++)m.tick(1/120)};
function walk(m,p){m.target={...p};for(let n=0;n<3000&&distance(m.pos,p)>.2&&m.phase==='playing';n++)m.tick(1/120);m.clearInput();assert.ok(m.phase==='playing'||m.phase==='clear',m.missReason);if(m.phase==='playing')assert.ok(distance(m.pos,p)<.3);}
function fresh(stage=0){const m=new Adventure();m.stage=stage;m.pos={...m.level.start};m.begin();m.play();return m;}
test('every route and checkpoint is walkable with the complete footprint',()=>{for(const level of LEVELS){for(const road of level.roads){for(let s=0;s<2000;s+=2)assert.ok(onRoad(level,pointAlong(road.points,s)));}assert.ok(onRoad(level,level.checkpoint));assert.ok(onRoad(level,level.start));assert.ok(onRoad(level,level.goal));}});
test('fast pointer movement cannot teleport across forest or skip the collision',()=>{const m=fresh();m.target={x:610,y:140};tick(m,1);assert.equal(m.misses,1);assert.ok(distance(m.pos,m.level.goal)>300);assert.equal(m.phase,'miss');});
test('release stops immediately, while the bridge patrol keeps moving',()=>{const m=fresh(1);m.target={x:220,y:735};tick(m,.2);m.clearInput();const p={...m.pos},dog=m.dog;tick(m,.5);assert.deepEqual(m.pos,p);assert.notDeepEqual(m.dog,dog);});
test('checkpoint retry retains medals and cumulative misses but resets pursuit',()=>{const m=fresh(2);walk(m,{x:125,y:580});walk(m,{x:330,y:580});assert.equal(m.checkpoint,true);walk(m,{x:330,y:420});assert.notEqual(m.chase,'idle');m.medals.add('2:0');m.fail('test');tick(m,1.3);assert.deepEqual(m.pos,m.level.checkpoint);assert.equal(m.medals.size,1);assert.equal(m.misses,1);assert.equal(m.chase,'idle');assert.equal(m.target,null);});
test('forest is completable using the actual movement and collision rules',()=>{const m=fresh();for(const p of m.level.roads[0].points.slice(1))walk(m,p);assert.equal(m.phase,'clear');assert.equal(m.misses,0);assert.equal(m.stageMedals,2);assert.equal(m.records.length,1);});
test('bridge can be passed without contact by waiting in the bay',()=>{const m=fresh(1);walk(m,{x:360,y:735});walk(m,{x:360,y:555});walk(m,{x:285,y:555});assert.equal(m.checkpoint,true);while(m.dog.y<605)m.tick(1/120);walk(m,{x:360,y:555});walk(m,{x:360,y:375});walk(m,{x:435,y:375});walk(m,{x:360,y:375});walk(m,{x:360,y:130});walk(m,{x:580,y:130});assert.equal(m.phase,'clear');assert.equal(m.misses,0);assert.equal(m.stageMedals,3);});
test('standing on the bridge allows Knuckle to catch Maro',()=>{const m=fresh(1);m.pos={x:360,y:400};tick(m,2);assert.equal(m.misses,1);assert.equal(m.phase,'miss');});
test('Spike catches a stopped cat, but the main route reaches the escape and ending',()=>{const waiting=fresh(2);walk(waiting,{x:125,y:580});walk(waiting,{x:330,y:580});walk(waiting,{x:330,y:490});tick(waiting,5);assert.ok(waiting.misses>0);const m=fresh(2);for(const p of m.level.roads[0].points.slice(1))walk(m,p);assert.equal(m.chase,'escaped');assert.equal(m.phase,'clear');assert.equal(m.misses,0);m.next();assert.equal(m.phase,'intro');assert.equal(m.stage,3);});
test('titles, intro and clear panels do not advance hazards or time',()=>{const m=new Adventure();tick(m,5);assert.equal(m.seconds,0);m.begin();tick(m,5);assert.equal(m.seconds,0);m.play();for(const p of m.level.roads[0].points.slice(1))walk(m,p);const time=m.seconds;tick(m,5);assert.equal(m.seconds,time);m.next();assert.equal(m.stage,1);assert.equal(m.phase,'intro');assert.equal(m.stageSeconds,0);assert.equal(m.checkpoint,false);});

const animation=await build({entryPoints:['sample_game/斉藤さんゲーム/animation.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {WalkCycle}=await import(`data:text/javascript;base64,${Buffer.from(animation.outputFiles[0].text).toString('base64')}`);
test('slow intermittent and fast continuous motion produce the same gait phase',()=>{
 const slow=new WalkCycle(),fast=new WalkCycle();
 for(let i=0;i<5600;i++){slow.advance({x:0,y:0},{x:0,y:-.01},true);slow.advance({x:0,y:0},{x:0,y:0},true);}
 for(let i=0;i<8;i++)fast.advance({x:0,y:0},{x:0,y:-7},true);
 assert.ok(Math.abs(slow.phase-fast.phase)<1e-6||Math.abs(slow.phase-fast.phase-8)<1e-6);
 const frames=new Set();for(let i=0;i<8;i++){fast.advance({x:0,y:0},{x:0,y:-7},true);frames.add(fast.frame);}assert.equal(frames.size,8);
 const phase=slow.phase;slow.advance({x:0,y:0},{x:0,y:0},true);assert.equal(slow.phase,phase);
});
test('direction changes require sustained displacement and reject tiny sideways jitter',()=>{
 const w=new WalkCycle();w.reset('right');
 for(let i=0;i<20;i++){w.advance({x:0,y:0},{x:0,y:-1},true);w.advance({x:0,y:0},{x:2,y:0},true);}assert.equal(w.facing,'right');
 for(let i=0;i<11;i++)w.advance({x:0,y:0},{x:0,y:-1},true);assert.equal(w.facing,'right');
 w.advance({x:0,y:0},{x:0,y:-1},true);assert.equal(w.facing,'up');
 for(let i=0;i<20;i++){w.advance({x:0,y:0},{x:i%2?1:-1,y:0},true);}assert.equal(w.facing,'up');
 const phase=w.phase;w.advance({x:0,y:0},{x:500,y:500},true);assert.equal(w.facing,'up');assert.equal(w.phase,phase);
});
test('ten distinct stages, thirty reachable medals, and final ending only after chapter ten',()=>{
 assert.equal(LEVELS.length,10);assert.equal(TOTAL_MEDALS,30);
 assert.equal(new Set(LEVELS.map(l=>JSON.stringify(l.roads))).size,10);
 for(const level of LEVELS){for(const medal of level.medals)assert.ok(onRoad(level,medal),level.title);if(level.hazard?.kind==='chase'){assert.ok(level.hazard.tunnel<pathLength(level.roads[0].points));assert.ok(level.hazard.trigger>level.hazard.start);}}
 for(const stage of [3,4,5,7,8,9]){const m=fresh(stage);for(const p of m.level.roads[0].points.slice(1))walk(m,p);assert.equal(m.phase,'clear',m.level.title);assert.equal(m.stageMedals,3,m.level.title);assert.equal(m.misses,0);m.next();assert.equal(m.phase,stage===9?'ending':'intro');}
 const m=fresh(6);for(const [x,y]of [[100,430],[260,430],[260,510]])walk(m,{x,y});while(m.dog.x<445)m.tick(1/120);
 for(const [x,y]of [[260,430],[440,430],[440,350]])walk(m,{x,y});while(m.dog.x>370)m.tick(1/120);
 for(const [x,y]of [[440,430],[620,430],[620,130],[470,130]])walk(m,{x,y});assert.equal(m.phase,'clear');assert.equal(m.stageMedals,3);
});
test('Spike never teleports on crossing a tunnel and walks to the entrance before stopping',()=>{
 for(const stage of [2,5,8,9]){
  const m=fresh(stage),h=m.level.hazard;m.chase='chasing';m.dogProgress=h.tunnel-150;
  m.pos=pointAlong(m.level.roads[0].points,h.tunnel+10);let previous={...m.dog};m.tick(1/120);
  assert.equal(m.chase,'escaped');assert.ok(distance(previous,m.dog)<=h.speed/120+.00001);assert.equal(m.dogBlocked,false);
  for(let i=0;i<300;i++){previous={...m.dog};m.tick(1/120);assert.ok(distance(previous,m.dog)<=h.speed/120+.00001);}
  assert.equal(m.dogBlocked,true);assert.equal(m.dogProgress,h.tunnel-32);
  const stopped={...m.dog};tick(m,1);assert.deepEqual(m.dog,stopped);
 }
});

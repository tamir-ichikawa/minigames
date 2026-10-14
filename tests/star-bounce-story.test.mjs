import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { build } from 'esbuild';
const bundle=await build({stdin:{contents:"export * from './sample_game/STAR_BOUNCE/content'; export * from './sample_game/STAR_BOUNCE/model'; export * from './sample_game/STAR_BOUNCE/stages'; export * from './sample_game/STAR_BOUNCE/flights';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const {CHARACTERS,STORIES,StoryMatch,DIFFICULTIES,STAGES,BAR_PATTERNS,spawnFlight,advanceFlight,resizeFlight,flightAngle,BONUSES}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
test('story: all characters own an arena and a distinct bar, with packaged artwork',()=>{
  for(const c of CHARACTERS){const stage=STAGES[c.id];assert.ok(stage,`${c.id} needs a home arena`);assert.ok(existsSync(`sample_game/STAR_BOUNCE/${stage.file}`));assert.ok(BAR_PATTERNS[c.id]);}
  assert.equal(new Set(CHARACTERS.map(c=>BAR_PATTERNS[c.id])).size,CHARACTERS.length);
  assert.ok(new Set(Object.values(STAGES).map(s=>s.file)).size>=6);
});
const make=id=>{const m=new StoryMatch(CHARACTERS.find(c=>c.id===id)||CHARACTERS[0],()=>.2,'easy');m.start();m.serve=0;return m;};
const goal=m=>{m.serve=0;m.ball={x:35,y:-12,vx:0,vy:-300,radius:8};return m.advance(1/60);};
const miss=m=>{m.serve=0;m.ball={x:35,y:m.height+12,vx:0,vy:300,radius:8};return m.advance(1/60);};
test('story: both sides have distinct routes; seven unique skills and valid opponents',()=>{
  assert.equal(new Set(CHARACTERS.map(c=>c.skill)).size,7);
  for(const side of ['GOOD','DARK']){assert.equal(CHARACTERS.filter(c=>c.side===side).length,side==='GOOD'?4:3);assert.equal(STORIES[side].chapters.length,3);for(const ch of STORIES[side].chapters)assert.notEqual(CHARACTERS.find(c=>c.id===ch.rival).side,side);}
  assert.notEqual(STORIES.GOOD.ending,STORIES.DARK.ending);
});
test('story: three goals advance each chapter, HP heals once, ending unlocks endless',()=>{
  for(const id of ['popo','kuro']){
    const m=make(id);miss(m);miss(m);assert.equal(m.hp,3);
    for(let chapter=0;chapter<3;chapter++){for(let g=0;g<3;g++)goal(m);assert.equal(m.phase,'clear');assert.equal(m.goals,3);assert.equal(m.chapterIndex,chapter);assert.deepEqual(m.advance(1),[]);m.next();if(chapter<2){assert.equal(m.phase,'intro');assert.equal(m.hp,4+chapter);m.start();}}
    assert.equal(m.phase,'ending');assert.equal(m.totalGoals,9);m.startEndless();for(let i=0;i<8;i++)goal(m);assert.equal(m.phase,'playing');assert.equal(m.hp,5);assert.equal(m.endless,true);
  }
});
test('story: five misses end the run and reset starts with a fresh model',()=>{const m=make();for(let i=0;i<5;i++)miss(m);assert.equal(m.hp,0);assert.equal(m.phase,'over');assert.deepEqual(m.advance(1),[]);assert.equal(make().hp,5);});
test('story: wide, slow, power shot, sleepy opponent and fever have actual effects',()=>{
  const wide=make('popo');assert.equal(wide.activate(),false);wide.charge=100;assert.equal(wide.activate(),true);assert.equal(wide.width,172);assert.equal(wide.activate(),false);wide.move(1e6);assert.equal(wide.playerX,464-86);
  const slow=make('merry');slow.charge=100;slow.activate();slow.ball={x:240,y:300,vx:0,vy:300,radius:8};slow.advance(.1);assert.ok(Math.abs(slow.ball.y-316.8)<.01);
  const shot=make('kuro');shot.charge=100;shot.activate();shot.ball={x:240,y:shot.bottom-16,vx:0,vy:300,radius:8};shot.advance(1/60);assert.ok(shot.ball.vy<0);assert.ok(Math.abs(Math.hypot(shot.ball.vx,shot.ball.vy)-550)<.01);assert.equal(shot.skill,null);
  const cat=make('neneko'),normal=make('neneko');cat.charge=100;cat.activate();for(const m of [cat,normal]){m.ball={x:400,y:400,vx:0,vy:-300,radius:8};m.advance(.1);}assert.ok(cat.enemyX<normal.enemyX);
  const guard=make('mokkul');guard.charge=100;guard.activate();assert.equal(miss(guard)[0].type,'guard');assert.equal(guard.hp,5);miss(guard);assert.equal(guard.hp,4);
  const charge=make('tokori');charge.charge=100;charge.activate();charge.ball={x:240,y:charge.bottom-16,vx:0,vy:300,radius:8};charge.advance(1/60);assert.equal(charge.score,30);assert.equal(charge.charge,25);
  const fever=make('akane');fever.charge=100;fever.activate();goal(fever);assert.equal(fever.score,200);
});
test('story: returns charge the skill, effects expire, resize preserves relative ball position',()=>{
  for(const [id,charge]of [['popo',20],['merry',20]]){const m=make(id);m.ball={x:240,y:m.bottom-16,vx:0,vy:300,radius:8};m.advance(1/60);assert.equal(m.charge,charge);}
  const m=make('popo');m.charge=100;m.activate();m.serve=20;for(let i=0;i<61;i++)m.advance(.1);assert.equal(m.skill,null);assert.equal(m.width,118);const ratio=m.ball.y/m.height;m.resize(1000);assert.ok(Math.abs(m.ball.y/1000-ratio)<1e-10);assert.equal(m.bottom,972);
});
test('story: bonuses score and reflect once; fixed timestep agrees at common refresh rates',()=>{
  const m=make();m.ball={x:240,y:365,vx:0,vy:300,radius:8};m.targets=[{id:1,kind:'freighter',x:240,y:395,vx:0}];m.advance(1/120);assert.equal(m.score,250);assert.equal(m.targets.length,0);assert.ok(m.ball.vy<0);
  const run=fps=>{const m=make();for(let i=0;i<fps*6;i++)m.advance(1/fps);return m;};const a=run(30);for(const fps of [60,144]){const b=run(fps);assert.equal(a.hp,b.hp);assert.equal(a.score,b.score);assert.ok(Math.abs(a.ball.y-b.ball.y)<1e-7);}
});

test('story: fighter shape scores at its wing, misses above it, and reflects only once',()=>{
  const m=make();m.ball={x:285,y:395,vx:-300,vy:30,radius:8};m.targets=[{id:3,kind:'fighter',x:240,y:395,vx:0}];
  m.advance(1/120);assert.equal(m.score,150);assert.ok(m.ball.vx>0);m.advance(1/120);assert.equal(m.score,150);
  const outside=make();outside.ball={x:285,y:350,vx:0,vy:300,radius:8};outside.targets=[{id:3,kind:'fighter',x:240,y:395,vx:0}];outside.advance(1/120);assert.equal(outside.score,0);assert.equal(outside.targets.length,1);
  assert.ok(CHARACTERS.every(c=>c.file.startsWith('sozai/')));assert.ok(!CHARACTERS.some(c=>c.id==='lumi'));
});

test('story: each difficulty accelerates at returns and resets pace after either side scores',()=>{
  for(const difficulty of Object.keys(DIFFICULTIES)) {
    const m=new StoryMatch(CHARACTERS[0],()=>.2,difficulty);m.start();m.serve=0;
    let speed=m.ballSpeed;
    for(let i=0;i<5;i++){m.ball={x:m.playerX,y:m.bottom-16,vx:0,vy:speed,radius:8};m.advance(1/60);assert.ok(m.ballSpeed>speed);speed=m.ballSpeed;}
    assert.equal(m.rallyHits,5);miss(m);assert.equal(m.rallyHits,0);assert.ok(Math.abs(m.ballSpeed-Math.hypot(80,DIFFICULTIES[difficulty].serve))<.01);
    m.rallyHits=20;m.ball.vy=900;goal(m);assert.equal(m.rallyHits,0);assert.ok(m.ballSpeed<400);
  }
});
test('story: normal predicts wall reflections; hard stays accurate to a higher ball speed',()=>{
  const saves=(difficulty,speed)=>{
    let count=0;
    for(let i=0;i<32;i++){
      const m=new StoryMatch(CHARACTERS[0],()=>.5,difficulty);m.start();m.serve=0;m.elapsed=i*.71;m.nextTarget=1e8;
      const angle=(i%8-3.5)*.22;m.ball={x:50+(i*57)%380,y:m.height*.8,vx:Math.sin(angle)*speed,vy:-Math.cos(angle)*speed,radius:8};
      for(let frame=0;frame<800;frame++) {const events=m.advance(1/120);if(events.some(e=>e.type==='enemy-return')){count++;break;}if(events.some(e=>e.type==='goal'))break;}
    }
    return count;
  };
  assert.ok(saves('normal',320)>=30);assert.ok(saves('hard',650)>saves('normal',650));assert.ok(saves('normal',900)<saves('normal',320));assert.ok(saves('hard',1150)<saves('hard',650));
});


test('story: five spacecraft fly distinct paths, point along velocity and resize without jumping',()=>{
  const seen=new Set(),motions=new Set();
  for(let id=1;id<=20;id++){
    const t=spawnFlight(id,760,()=>.3);seen.add(t.kind);motions.add(t.flight.motion);assert.equal(t.x,-100);
    advanceFlight(t,t.flight.duration*.35);const y=t.y,age=t.flight.age,vx=t.vx;
    assert.ok(t.y>760*.2&&t.y<760*.8);assert.ok(Number.isFinite(flightAngle(t)));
    resizeFlight(t,1.4);assert.equal(t.y,y*1.4);advanceFlight(t,0);assert.ok(Math.abs(t.y-y*1.4)<1e-8);assert.equal(t.flight.age,age);assert.equal(t.vx,vx);
    if(t.flight.motion==='straight')assert.equal(t.vy,0);else assert.ok(Math.abs(t.vy)>1);
    advanceFlight(t,t.flight.duration*.8);assert.ok(t.x>580);
  }
  assert.equal(seen.size,5);assert.equal(motions.size,4);
  const left=spawnFlight(1,760,()=>.8);assert.equal(left.x,580);advanceFlight(left,left.flight.duration);assert.ok(Math.abs(left.x+100)<1e-8);assert.ok(left.vx<0);
});
test('story: diagonal targets reflect once using the tilted hull and relative vertical velocity',()=>{
  for(const [kind,art] of Object.entries(BONUSES)){
    const m=make();m.ball={x:260,y:380,vx:-240,vy:300,radius:8};m.targets=[{id:1,kind,x:240,y:395,vx:40,vy:40}];
    const events=m.advance(1/120);assert.equal(events.filter(e=>e.type==='bonus').length,1);assert.equal(m.score,art.points);assert.equal(m.targets.length,0);assert.ok(Number.isFinite(m.ball.vx)&&Number.isFinite(m.ball.vy));
    m.advance(1/120);assert.equal(m.score,art.points);
  }
  const m=make();m.ball={x:285,y:395,vx:0,vy:300,radius:8};m.targets=[{id:1,kind:'cruiser',x:240,y:395,vx:0,vy:60}];m.advance(1/120);assert.equal(m.score,0,'a vertical hull must not retain its horizontal collision width');
});
test('story: spacecraft motion is deterministic at 30/60/144 Hz, pauses and cleans up',()=>{
  const runs=[30,60,144].map(fps=>{const m=make();m.ball={x:240,y:m.height*.9,vx:0,vy:0,radius:8};m.nextTarget=1e9;m.targets=[spawnFlight(2,m.height,()=>.3)];for(let i=0;i<fps*2;i++)m.advance(1/fps);return m;});
  for(const m of runs.slice(1)){assert.ok(Math.abs(m.targets[0].x-runs[0].targets[0].x)<1e-7);assert.ok(Math.abs(m.targets[0].y-runs[0].targets[0].y)<1e-7);}
  const m=runs[0],before=JSON.stringify(m.targets);m.phase='intro';m.advance(.1);assert.equal(JSON.stringify(m.targets),before);m.phase='playing';for(let i=0;i<1800;i++)m.advance(1/120);assert.equal(m.targets.length,0);
});

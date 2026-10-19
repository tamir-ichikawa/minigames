import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
const compiled=await build({entryPoints:['Dance/rhythm.ts'],bundle:true,format:'esm',write:false,platform:'node'});
const {RhythmRound,WINDOWS,eventPerformanceTime,audibleContextTime,layout,rank}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const songs=JSON.parse(await readFile('Dance/songs.json','utf8'));
test('Original songs and six charts are preserved, ordered, within duration, on the half-beat grid',async()=>{
 const original=await readFile('Dance/original/index.html','utf8');const originals=JSON.parse(original.match(/const SONGS = (\[.*?\]);/s)[1]);
 assert.equal(songs.length,2);
 for(const [i,song] of songs.entries()){
  assert.deepEqual(song.charts,originals[i].charts);
  assert.deepEqual(await readFile(song.audio),Buffer.from(originals[i].b64,'base64'));
  for(const chart of Object.values(song.charts)){
   let last=-1;const positions=new Set();
   for(const [time,lane,sub]of chart){
    assert.ok(time>=last&&time<song.dur);last=time;assert.ok(lane>=0&&lane<=3&&Number.isInteger(lane));assert.ok(sub===0||sub===1);
    const beat=(time-song.offset)*song.bpm/60;assert.ok(Math.abs(beat*2-Math.round(beat*2))<.001);
    const key=`${time}:${lane}`;assert.ok(!positions.has(key));positions.add(key);
   }
  }
 }
});
test('Early/late timing boundaries, wrong lane and duplicate presses',()=>{
 for(const sign of [-1,1])for(const [delta,expected]of [[0,'PERFECT'],[.045,'PERFECT'],[.04501,'GREAT'],[.09,'GREAT'],[.09001,'GOOD'],[.135,'GOOD'],[.13501,null]]){
  const r=new RhythmRound([[1,0,0]]);assert.equal(r.press(1,1),null);assert.equal(r.press(0,1+sign*delta),expected);assert.equal(r.judged,expected?1:0);
  if(expected)assert.equal(r.press(0,1),null);
 }
});
test('Overlapping windows choose nearest note; two simultaneous lanes count separately',()=>{
 const r=new RhythmRound([[1,0,0],[1.2,0,1],[1.2,2,1]]);
 assert.equal(r.press(0,1.12),'GREAT');assert.equal(r.notes[0].result,null);assert.equal(r.notes[1].result,'GREAT');
 assert.equal(r.press(2,1.2),'PERFECT');assert.equal(r.combo,2);r.advance(1.4);assert.equal(r.counts.MISS,1);assert.equal(r.combo,0);assert.equal(r.maxCombo,2);
});
test('Delayed event receives a fair judgment during miss grace, then expires once',()=>{
 const r=new RhythmRound([[1,0,0]]);r.advance(1.18);assert.equal(r.press(0,1.04),'PERFECT');r.advance(5);assert.equal(r.judged,1);
 const missed=new RhythmRound([[1,0,0]]);missed.advance(1.24);missed.advance(2);assert.equal(missed.counts.MISS,1);
});
test('All six charts: full combo yields exactly one million; all misses yield zero',()=>{
 for(const s of songs)for(const chart of Object.values(s.charts)){
  const r=new RhythmRound(chart);for(const [t,lane]of chart){r.advance(t);assert.equal(r.press(lane,t),'PERFECT');}r.advance(Infinity);
  assert.equal(r.score,1_000_000);assert.equal(r.maxCombo,chart.length);assert.equal(r.counts.MISS,0);assert.equal(rank(r.score),'S');
  const m=new RhythmRound(chart);m.advance(Infinity);assert.equal(m.score,0);assert.equal(m.counts.MISS,chart.length);
 }
});
test('Output clock maps the actual event time, does not subtract output latency twice or accumulate frame drift',()=>{
 const c={currentTime:20,baseLatency:.01,outputLatency:.08,timestamp:{contextTime:19.91,performanceTime:20000}};
 assert.equal(audibleContextTime(c,20030,20050),19.94);
 assert.equal(audibleContextTime(c,19990,20050),19.9);
 assert.ok(Math.abs(audibleContextTime({...c,timestamp:undefined},20000,20000)-19.91)<1e-9);
 assert.ok(Math.abs(audibleContextTime({...c,timestamp:{contextTime:0,performanceTime:0}},19950,20000)-19.86)<1e-9);
 assert.equal(eventPerformanceTime(1700000000020,50,1700000000000),20);
 assert.equal(eventPerformanceTime(0,50,1700000000000),50);
 assert.equal(eventPerformanceTime(10,1000,0),750);
 for(const now of [1000,16000,90000,173000])assert.equal(audibleContextTime({currentTime:now/1000,baseLatency:0,outputLatency:0},now,now),now/1000);
});
test('Layout fits arbitrary parent dimensions without distortion, including portrait/landscape and very small embeds',()=>{
 for(const [w,h]of [[390,844],[844,390],[320,568],[568,320],[1920,1080],[2560,1440],[1280,720],[1000,200],[240,240],[200,100],[0,0]]){
  const l=layout(w,h);assert.ok(l.width*l.scale<=w+1e-8);assert.ok(l.height*l.scale<=h+1e-8);assert.ok(Number.isFinite(l.scale));
 }
});
const controllerBundle=await build({entryPoints:['Dance/index.ts'],bundle:true,format:'esm',write:false,platform:'node',plugins:[{name:'scene-base-only',setup(b){b.onResolve({filter:/^phaser$/},()=>({path:'phaser',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:'export default {Scene:class{}}'}));}}]});
const {DanceController}=await import(`data:text/javascript;base64,${Buffer.from(controllerBundle.outputFiles[0].text).toString('base64')}`);
test('Async audio resume cannot be mistaken for an audio interruption by the next render frame',async()=>{
 const c=new DanceController();c.renderPhase=()=>{};c.phase='playing';c.round=new RhythmRound([[1,0,0]]);c.localPaused=true;
 let resolveResume;const resumed=new Promise(r=>resolveResume=r);
 c.audio={context:{state:'suspended'},resume:async()=>{await resumed;c.audio.context.state='running';},pause:async()=>{},time:()=>0};
 c.localPaused=false;const pending=c.syncPause();await Promise.resolve();
 c.tick();assert.equal(c.localPaused,false,'still resuming, must not re-pause');assert.equal(c.audioTransition,1);
 resolveResume();await pending;assert.equal(c.localPaused,false);assert.equal(c.audioTransition,0);assert.equal(c.audio.context.state,'running');
});
test('Host resume respects a local pause; clearing both resumes audio once',async()=>{
 const c=new DanceController();c.renderPhase=()=>{};let stops=0,starts=0;
 c.audio={pause:async()=>{stops++;},resume:async()=>{starts++;}};
 c.localPaused=true;await c.pause();await c.resume();assert.equal(c.paused,true);assert.equal(starts,0);
 c.localPaused=false;await c.syncPause();assert.equal(starts,1);assert.equal(stops,2);assert.equal(c.paused,false);
});
const alignBundle=await build({entryPoints:['Dance/alignment.ts'],bundle:true,format:'esm',write:false,platform:'node'});
const {alignDecodedAudio,matchEnvelope}=await import(`data:text/javascript;base64,${Buffer.from(alignBundle.outputFiles[0].text).toString('base64')}`);
test('Decoded audio alignment recovers MP3-style head shifts at 32/44.1/48 kHz without assuming a fixed decoder',()=>{
 const signal=t=>(.2+.08*Math.sin(t*11)+.04*Math.sin(t*37))*Math.sin(t*1600)+.15*Math.exp(-(((t-.72)/.04)**2))+.2*Math.exp(-(((t-1.4)/.03)**2));
 const make=(rate,shift)=>{const data=Float32Array.from({length:rate*3},(_,i)=>signal(i/rate-shift));return {duration:3,sampleRate:rate,getChannelData:()=>data};};
 const canonical=make(32000,0).getChannelData(),signature={start:.5,step:.001,window:.005,envelope:[]};
 for(let i=0;i<1500;i++){let power=0;const a=Math.round((.5+i*.001)*32000),b=Math.round((.505+i*.001)*32000);for(let j=a;j<b;j++)power+=canonical[j]**2;signature.envelope.push(Math.sqrt(power/(b-a)));}
 for(const rate of [32000,44100,48000])for(const shift of [-.018,0,.037]){const alignment=alignDecodedAudio(make(rate,shift),signature);assert.ok(Math.abs(alignment.shift-shift)<.0011,JSON.stringify({rate,shift,alignment}));assert.ok(alignment.correlation>.99);}
 assert.equal(matchEnvelope([1,1,1],[1,1,1,1,1],1,.001).shift,0);
 const other=Array.from({length:1520},(_,i)=>Math.sin(i*1.234));assert.equal(matchEnvelope(signature.envelope,other,10,.001).shift,0,'unrelated sound must not be corrected');
});
const audioBundle=await build({entryPoints:['Dance/audio.ts'],bundle:true,format:'esm',write:false,platform:'node'});
const {DanceAudio}=await import(`data:text/javascript;base64,${Buffer.from(audioBundle.outputFiles[0].text).toString('base64')}`);
test('Pause/resume preserves chart alignment and calibration exactly once; mute and destroy clean up audio',async()=>{
 const previous=globalThis.window;
 class FakeContext{currentTime=5;baseLatency=0;outputLatency=0;state='running';destination={};createGain(){return {connect(){},disconnect(){},gain:{value:1}};}createBufferSource(){return {buffer:null,connect(){},disconnect(){},start(){},stop(){}};}async suspend(){this.state='suspended';}async resume(){this.state='running';}async close(){this.state='closed';}}
 globalThis.window={AudioContext:FakeContext};
 try{
  const a=new DanceAudio();a.chartShift=-.018;a.play({duration:10});a.context.currentTime=7;
  const before=a.time(50);assert.ok(Math.abs(before-1.618)<1e-9);await a.pause();assert.equal(a.time(50),before);
  await a.resume();assert.equal(a.time(50),before);a.context.currentTime+=.5;assert.ok(Math.abs(a.time(50)-before-.5)<1e-9);
  a.mute(true);assert.equal(a.gain.gain.value,0);a.mute(false);assert.equal(a.gain.gain.value,1);await a.destroy();assert.equal(a.context.state,'closed');assert.equal(a.source,undefined);
 }finally{if(previous===undefined)delete globalThis.window;else globalThis.window=previous;}
});

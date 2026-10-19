// Temporary short-round browser fixture. npm run build removes it from dist.
// Uses real audio and the production UI/input code, with an eight-second test chart.
import {build} from 'esbuild';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
await mkdir('dist/__dance_checks',{recursive:true});
await writeFile('dist/__dance_checks/index.html',`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Dance browser verification</title><link rel="icon" href="data:,"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}#app{height:100dvh;display:flex}</style></head><body><main id="app"></main><output id="evidence" hidden></output><script src="fixture.js"></script></body></html>`);
const reference=JSON.parse(await readFile('.test-output/dance-envelope.json','utf8').catch(()=> '{}'));
await build({stdin:{resolveDir:process.cwd(),contents:`
 import {createGame} from './Dance/index';
 import {RhythmRound} from './Dance/rhythm';
 const game=createGame(), store=new Map();
 const originalPress=game.press.bind(game);let lastPress=null;
 game.press=(lane,stamp)=>{originalPress(lane,stamp);lastPress={lane,stamp,now:performance.now(),inputTime:game.audio?.time(game.calibration,stamp),counts:game.round?.counts};};
 const reference=${JSON.stringify(reference)};let alignment=null;
 function compareAudio(){
  const ref=reference[game.song.id],buffer=[...game.audio.buffers.values()].at(-1);if(!ref||!buffer)return;
  const data=buffer.getChannelData(0),env=[];
  for(let frame=0;(frame+1)*buffer.sampleRate*.005<data.length;frame++){const from=Math.floor(frame*buffer.sampleRate*.005),to=Math.floor((frame+1)*buffer.sampleRate*.005);let sum=0;for(let j=from;j<to;j++)sum+=data[j]*data[j];env.push(Math.sqrt(sum/(to-from)));}
  const shifts=[];for(const [lo,hi]of [[12,45],[45,90],[90,135]]){let best=Infinity,bestShift=0;
   for(let shift=-40;shift<=40;shift++){let error=0;for(let i=lo*200;i<hi*200;i++){const d=ref[i]-env[i+shift];error+=d*d;}if(error<best){best=error;bestShift=shift;}}
   shifts.push({from:lo,to:hi,browserShiftMs:bestShift*5});
  }alignment={song:game.song.id,duration:buffer.duration,sampleRate:buffer.sampleRate,shifts};
 }
 const originalBegin=game.begin.bind(game);
 game.begin=async()=>{await originalBegin();if(game.phase==='playing'){compareAudio();game.round=new RhythmRound([[2,0,0],[2,2,0],[2.2,0,1],[3,1,0],[4,3,0],[5,0,0],[6,2,0]]);game.duration=8;}};
 const tick=game.tick.bind(game);
 game.tick=()=>{tick();document.getElementById('evidence').textContent=JSON.stringify({phase:game.phase,paused:game.paused,audioState:game.audio?.context.state,chartShift:game.audio?.chartShift,time:game.audio?.time(game.calibration),score:game.round?.score,judged:game.round?.judged,counts:game.round?.counts,held:[0,1,2,3].map(l=>game.held(l)),canvas:[game.geometry.width,game.geometry.height],lastPress,alignment});};
 game.init({container:document.getElementById('app'),settings:{muted:true},platform:{storage:{read:(k,d)=>store.has(k)?store.get(k):d,write:(k,v)=>{store.set(k,v);return true;}},readLegacyNumber:()=>null,onSuspend:()=>()=>{}},assetUrl:p=>new URL('../'+p,location.href).href,reportScore:()=>{},requestExit:()=>{}});
 `},bundle:true,format:'iife',outfile:'dist/__dance_checks/fixture.js'});
console.log('Temporary UI fixture: http://127.0.0.1:4173/__dance_checks/');

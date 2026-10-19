import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {existsSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {serve} from '../scripts/serve.mjs';
const output=path.resolve('.test-output/added-games');await mkdir(output,{recursive:true});
const server=await serve({root:path.resolve('dist'),port:0,base:'/minigames'});
const base=`http://127.0.0.1:${server.address().port}/minigames`;
const mac='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||(existsSync(mac)?mac:undefined),headless:true});
const errors=[],checks=[];
const sizes=[{width:1280,height:900},{width:390,height:844},{width:844,height:390},{width:320,height:568}];
function capture(page){page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});}
async function fits(scope,selector){
 await scope.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const bad=await scope.evaluate(selector=>[...document.querySelectorAll(selector)].filter(e=>e.checkVisibility()).map(e=>{
  const b=e.getBoundingClientRect();return {tag:e.id||e.className,rect:[b.x,b.y,b.right,b.bottom],ok:b.x>=-1&&b.y>=-1&&b.right<=innerWidth+1&&b.bottom<=innerHeight+1};
 }).filter(e=>!e.ok),selector);assert.deepEqual(bad,[],'UI fits viewport');
}
async function dancePhase(page,phase){await page.locator(`.dance-shell[data-phase=${phase}]`).waitFor();}
try{
 const page=await browser.newPage({viewport:sizes[0],hasTouch:true});capture(page);
 await page.goto(`${base}/sample_game/invader-attack/invader-attack.html`);
 for(const size of sizes){await page.setViewportSize(size);await fits(page,'.ov.show .card,.ov.show button,#cv,#pad button');}
 for(const [difficulty,count] of [['normal',55],['hard',55]]){await page.locator(`[data-d=${difficulty}]`).click();await page.locator('#start').click();assert.equal(await page.evaluate(()=>IA.aliens.length),count);await page.locator('#bQuit').click();}
 await page.locator('[data-d=easy]').click();await page.locator('#start').click();await page.waitForFunction(()=>window.IA.state==='play');
 assert.equal(await page.evaluate(()=>IA.aliens.length),32);
 await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>IA.player.x>125);await page.keyboard.up('ArrowRight');
 await page.waitForFunction(()=>freeze<=0);await page.keyboard.press('Space');await page.waitForFunction(()=>pShots.length>0);
 await page.locator('#bPause').click();const saved=await page.evaluate(()=>JSON.stringify({player:IA.player,score:IA.score,wave:IA.wave,aliens:IA.aliens}));
 for(const size of sizes){await page.setViewportSize(size);await fits(page,'#cv,#pad button,.ov.show .card');assert.equal(await page.evaluate(()=>JSON.stringify({player:IA.player,score:IA.score,wave:IA.wave,aliens:IA.aliens})),saved);}
 await page.locator('#resume').click();
 // Force the invasion boundary, then let production collision/result logic run.
 await page.evaluate(()=>{fy=PLAYER_Y;stepT=0;});await page.locator('#result.show').waitFor();await fits(page,'.ov.show .card,.ov.show button');
 await page.locator('#again').click();assert.equal(await page.evaluate(()=>IA.score),0);await page.screenshot({path:path.join(output,'invader-phone.png')});
 checks.push('Invader: three difficulties, movement/fire, collision/game over/retry, portrait/landscape resize without reset');
 await page.goto(`${base}/play.html?game=invader-attack`);await page.locator('body[data-state=running]').waitFor();
 let frame=page.frames().find(f=>f.url().includes('invader-attack.html'));
 await frame.locator('#start').click();
 await frame.locator('#bR').dispatchEvent('pointerdown',{pointerId:1});await frame.waitForFunction(()=>IA.player.x>125);await frame.locator('#bR').dispatchEvent('pointerup',{pointerId:1});
 await page.locator('#pause').click();await page.locator('body[data-state=paused]').waitFor();const frozen=await frame.evaluate(()=>JSON.stringify({x:IA.player.x,fx,fy,stepT}));await page.waitForTimeout(200);assert.equal(await frame.evaluate(()=>JSON.stringify({x:IA.player.x,fx,fy,stepT})),frozen);
 await page.locator('#resume').click();await frame.waitForFunction(()=>state==='play');
 await frame.locator('#bPause').click();await page.locator('#pause').click();await page.locator('#resume').click();assert.equal(await frame.evaluate(()=>state),'pause');await frame.locator('#resume').click();
 for(const size of sizes){await page.setViewportSize(size);await fits(frame,'#cv,#pad button,.topbtn');const ratio=await frame.locator('#cv').evaluate(e=>{const c=getComputedStyle(e);return parseFloat(c.width)/parseFloat(c.height);});assert.ok(Math.abs(ratio-.75)<.002);}
 await page.evaluate(()=>{const b=document.createElement('button');b.id='fullscreen-check';b.textContent='Fullscreen';b.style.cssText='position:fixed;top:0;left:0;z-index:99';b.onclick=()=>document.querySelector('iframe').requestFullscreen();document.body.append(b);});await page.locator('#fullscreen-check').click();await page.waitForFunction(()=>!!document.fullscreenElement);await fits(frame,'#cv,#pad button,.topbtn');await page.evaluate(()=>document.exitFullscreen());await page.locator('#fullscreen-check').evaluate(e=>e.remove());
 await page.locator('#mute').click();await page.locator('#reset').click();await page.locator('body[data-state=running]').waitFor();frame=page.frames().find(f=>f.url().includes('invader-attack.html'));await frame.locator('#title.show').waitFor();
 checks.push('Invader managed: hold controls, host pause, nested local pause, mute/reset, embedded sizing');
 await page.goto(`${base}/Dance/`);await dancePhase(page,'title');
 for(const size of sizes){await page.setViewportSize(size);await fits(page,'.dance-surface,.dance-tools button,.dance-menu button');}
 await page.locator('[data-song="1"]').click();await page.locator('[data-direction=reverse]').click();await page.locator('[data-difficulty=hard]').click();
 await page.reload();await dancePhase(page,'title');assert.equal(await page.locator('[data-song="1"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('[data-direction=reverse]').getAttribute('aria-pressed'),'true');
 await page.goto(`${base}/play.html?game=dance`);await dancePhase(page,'title');await page.locator('.dance-menu [data-action=start]').click();await dancePhase(page,'playing');
 await page.locator('#pause').click();await page.locator('body[data-state=paused]').waitFor();const judged=await page.locator('.dance-shell').getAttribute('data-judged');await page.waitForTimeout(200);assert.equal(await page.locator('.dance-shell').getAttribute('data-judged'),judged);
 await page.locator('#resume').click();await page.locator('[data-action=pause]').click();await page.locator('#pause').click();await page.locator('#resume').click();assert.equal(await page.locator('.dance-shell').getAttribute('data-paused'),'true');
 const localJudged=await page.locator('.dance-shell').getAttribute('data-judged');
 for(const size of sizes){await page.setViewportSize(size);await fits(page,'.dance-surface,.dance-tools button,[data-overlay=pause] button');assert.equal(await page.locator('.dance-shell').getAttribute('data-judged'),localJudged);}
 await page.locator('[data-action=resume]').click();await page.locator('[data-action=fullscreen]').click();await page.waitForFunction(()=>!!document.fullscreenElement);await fits(page,'.dance-surface');await page.evaluate(()=>document.exitFullscreen());
 await page.locator('#mute').click();await page.locator('#reset').click();await dancePhase(page,'title');assert.equal(await page.locator('canvas').count(),1);
 await page.screenshot({path:path.join(output,'dance-phone.png')});
 checks.push('Dance: real songs load under subdirectory, saved selection/reverse, nested pause, resize/fullscreen, mute/reset');
 // Test-only short chart keeps real audio, UI, event timestamps and scoring. Never emitted into dist.
 const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`
 import {createGame} from './Dance/index';import {RhythmRound} from './Dance/rhythm';import {createWebPlatform} from './src/platform/web';
 const game=window.__dance=createGame();const begin=game.begin.bind(game);window.__danceEvents=[];
 const press=game.press.bind(game);game.press=(lane,stamp)=>{window.__danceEvents.push({type:'press',lane,time:game.audio.time(0),eventTime:game.audio.time(0,stamp)});press(lane,stamp);};
 window.addEventListener('pointerdown',e=>window.__danceEvents.push({type:'pointer',lane:e.target.dataset.lane,time:game.audio?.time(0),paused:game.paused}),true);
 game.begin=async()=>{await begin();if(game.phase==='playing'){game.round=new RhythmRound([[2,0,0],[2,2,0],[3,1,0]]);game.duration=4;await game.pause();}};
 game.init({container:document.getElementById('app'),platform:createWebPlatform(),settings:{muted:true},assetUrl:p=>${JSON.stringify(base)}+'/'+p,reportScore:s=>window.__score=s,requestExit:()=>{}});
 `},bundle:true,write:false,format:'iife',logLevel:'silent'});
 const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});capture(mobile);
 await mobile.route('**/__dance.js',r=>r.fulfill({contentType:'text/javascript',body:bundle.outputFiles[0].text}));
 await mobile.route('**/__dance.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><style>html,body{margin:0;height:100%;overflow:hidden}#app{height:100dvh;display:flex}</style></head><body><main id="app"></main><script src="__dance.js"></script></body></html>'}));
 await mobile.goto(`${base}/__dance.html`);await dancePhase(mobile,'title');await mobile.locator('.dance-menu [data-action=start]').click();await dancePhase(mobile,'playing');
 await mobile.waitForFunction(()=>__dance.hostPaused&&__dance.audio.context.state==='suspended');
 const cdp=await mobile.context().newCDPSession(mobile);if(process.env.DANCE_CPU_RATE)await cdp.send('Emulation.setCPUThrottlingRate',{rate:Number(process.env.DANCE_CPU_RATE)});const touch=[];
 for(const lane of [0,2]){const b=await mobile.locator(`[data-lane="${lane}"]`).boundingBox();touch.push({x:b.x+b.width/2,y:b.y+b.height*.8,id:lane+1});}
 assert.ok(await mobile.evaluate(()=>__dance.audio.time(0)<.1),'prepare input before starting the audio clock');
 await mobile.evaluate(()=>__dance.resume());
 await mobile.waitForFunction(()=>__dance.audio.time(0)>=1.98,null,{polling:5});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touch});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await mobile.waitForFunction(()=>__dance.audio.time(0)>=2.98,null,{polling:5});await mobile.keyboard.press('KeyF');await dancePhase(mobile,'result');
 const result=await mobile.evaluate(()=>({counts:__dance.round.counts,score:__score.value,held:[0,1,2,3].some(l=>__dance.held(l)),best:__dance.best(),events:__danceEvents}));console.log('Dance input evidence',JSON.stringify(result));
 assert.equal(result.counts.MISS,0);assert.ok(result.score>0);assert.equal(result.best,result.score);assert.equal(result.held,false);await fits(mobile,'.dance-surface,[data-overlay=result] button');
 await mobile.screenshot({path:path.join(output,'dance-result.png')});await mobile.evaluate(()=>__dance.destroy());assert.equal(await mobile.locator('canvas').count(),0);
 checks.push('Dance real touch chord + keyboard input, scoring/result/best record, destroy cleanup');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,errors},null,2));
}catch(error){errors.push(error.stack||String(error));let i=0;for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(output,`failure-${i++}.png`)}).catch(()=>{});throw error;
}finally{await writeFile(path.join(output,'report.json'),JSON.stringify({checks,errors},null,2));await browser.close();await new Promise(r=>server.close(r));}

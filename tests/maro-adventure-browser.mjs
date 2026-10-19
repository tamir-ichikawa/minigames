import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {serve} from '../scripts/serve.mjs';
import {startRecording,finishRecording} from './helpers/maro-recording.mjs';
const output=path.resolve('.test-output/maro-adventure');await mkdir(output,{recursive:true});
const server=await serve({root:path.resolve('dist'),port:0});
const origin=`http://127.0.0.1:${server.address().port}`,base=origin+'/sample_game/maro-adventure/';
const mac='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||(existsSync(mac)?mac:undefined),headless:true});
const report={checks:[],errors:[]};
const capture=page=>{page.on('pageerror',e=>report.errors.push(e.stack||e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`)});};
const phase=async(page,name)=>page.locator(`.maro-shell[data-phase="${name}"]`).waitFor();
const begin=async page=>{await page.getByRole('button',{name:'冒険にでかける'}).click();await page.getByRole('button',{name:'この道を進む'}).click();await phase(page,'playing');};
const rect=page=>page.locator('canvas').boundingBox();
const pos=page=>page.evaluate(()=>({...window.__maroScene.model.pos}));
async function dragTo(page,x,y){
 const b=await rect(page),p=await pos(page);await page.mouse.move(b.x+p.x*b.width/720,b.y+p.y*b.height/820);await page.mouse.down();
 await page.mouse.move(b.x+x*b.width/720,b.y+y*b.height/820,{steps:12});
 try{await page.waitForFunction(({x,y})=>{const m=window.__maroScene.model;return m.phase==='clear'||Math.hypot(m.pos.x-x,m.pos.y-y)<1.5;},{x,y},{timeout:5000});}catch(e){console.log('Drag failure',x,y,await page.evaluate(()=>({pos:window.__maroScene.model.pos,target:window.__maroScene.model.target,phase:window.__maroScene.model.phase,paused:window.__maroScene.paused,dragging:window.__maroScene.dragging,misses:window.__maroScene.model.misses})));await page.screenshot({path:path.join(output,'failure.png')});throw e;}
 await page.mouse.up();assert.equal(await page.evaluate(()=>window.__maroScene.model.misses),0,'route should be playable without a miss');
}
async function bounds(page){
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.waitForFunction(()=>{const c=document.querySelector('canvas').getBoundingClientRect(),p=document.querySelector('.maro-canvas').getBoundingClientRect();return Math.abs(c.width-p.width)<2&&Math.abs(c.height-p.height)<2;},null,{timeout:3000});
 const result=await page.evaluate(()=>{
  const v={w:innerWidth,h:innerHeight};
  const els=[...document.querySelectorAll('.maro-canvas,canvas,.maro-header,.maro-footer,.maro-hud,.maro-overlay:not([hidden]) .maro-panel,.maro-header button:not([hidden]),.maro-overlay:not([hidden]) button')];
  return {overflow:document.documentElement.scrollHeight>innerHeight+1||document.documentElement.scrollWidth>innerWidth+1,items:els.filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return {tag:e.className||e.textContent,left:r.left,top:r.top,right:r.right,bottom:r.bottom,inside:r.left>=-1&&r.top>=-1&&r.right<=v.w+1&&r.bottom<=v.h+1}})};
 });assert.equal(result.overflow,false);assert.ok(result.items.every(i=>i.inside),JSON.stringify(result));
 const {b,parent}=await page.evaluate(()=>{const c=document.querySelector('canvas').getBoundingClientRect(),p=document.querySelector('.maro-canvas').getBoundingClientRect();return {b:{width:c.width,height:c.height},parent:{width:p.width,height:p.height}}});assert.ok(Math.abs(b.width/b.height-720/820)<.002,'canvas aspect preserved');assert.ok(Math.abs(b.width-parent.width)<2&&Math.abs(b.height-parent.height)<2,`canvas fits its parent: ${JSON.stringify({b,parent})}`);
}
try{
 const page=await browser.newPage({viewport:{width:1280,height:960}});capture(page);
 await page.goto(base);await phase(page,'title');await page.screenshot({path:path.join(output,'desktop-title.png')});await bounds(page);
 await page.getByRole('button',{name:'あそびかた',exact:true}).click();assert.match(await page.locator('.maro-panel').innerText(),/足元を見て/);await page.getByRole('button',{name:'もどる',exact:true}).click();
 for(const viewport of [{width:390,height:844},{width:844,height:390},{width:320,height:568}]){
  await page.setViewportSize(viewport);await page.waitForTimeout(150);await bounds(page);await page.screenshot({path:path.join(output,`title-${viewport.width}x${viewport.height}.png`)});
 }
 report.checks.push('Actual standalone page, instructions, title in desktop / small phone / portrait / landscape, all buttons fit');
 // Test-only harness captures the live scene; shipped code exposes no debug controls.
 const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`
  import {createGame} from './sample_game/斉藤さんゲーム/index';
  import {MaroScene,ASSET_ROOT} from './sample_game/斉藤さんゲーム/scene';
  import {createWebPlatform} from './src/platform/web';
  const originalUpdate=MaroScene.prototype.update;MaroScene.prototype.update=function(t,d){const before=this.model.dog,clock=this.model.clock;originalUpdate.call(this,t,d);const after=this.model.dog,h=this.model.level.hazard;if(before&&after&&h?.kind==='chase'&&this.model.clock>=clock){const jump=Math.hypot(after.x-before.x,after.y-before.y);window.__maxDogJump=Math.max(window.__maxDogJump||0,jump);}};
  const original=MaroScene.prototype.create;MaroScene.prototype.create=function(){window.__maroScene=this;original.call(this);};
  const game=window.__maroGame=createGame();
  Promise.resolve(game.init({container:document.getElementById('app'),platform:createWebPlatform(),settings:{muted:true},assetUrl:p=>${JSON.stringify(base)}+p.replace(ASSET_ROOT,''),reportScore:s=>window.__score=s,requestExit:()=>{}})).then(()=>game.start());
 `},bundle:true,write:false,format:'iife'});
 const harness=async p=>{
  await p.route('**/__maro.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="icon" href="data:,"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}#app{height:100dvh}</style></head><body><main id="app"></main><script src="__maro.js"></script></body></html>'}));
  await p.route('**/__maro.js',r=>r.fulfill({contentType:'application/javascript',body:bundle.outputFiles[0].text}));
 };
 await harness(page);await page.setViewportSize({width:1280,height:960});await page.goto(base+'__maro.html');await phase(page,'title');await begin(page);
 // All 96 directional texture frames must exist and stay inside their source images.
 assert.equal(await page.evaluate(()=>{
  const scene=window.__maroScene;
  return ['maro','spike','knuckle'].every(actor=>['up','down','left','right'].every(direction=>[0,1,2,3,4,5,6,7].every(i=>{
   const texture=scene.textures.get(actor+'-'+(direction==='right'?'left':direction)+'-walk'),f=texture.get(direction+'-'+i),image=texture.getSourceImage();
   return f.name===direction+'-'+i&&f.cutX>=0&&f.cutY>=0&&f.cutX+f.cutWidth<=image.width&&f.cutY+f.cutHeight<=image.height;
  })));
 }),true);
 await dragTo(page,105,650);
 assert.match(await page.evaluate(()=>window.__maroScene.maro.frame.name),/^up-/,'upward motion uses the rear view');
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const idleFrame=await page.evaluate(()=>window.__maroScene.maro.frame.name);await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>window.__maroScene.maro.frame.name),idleFrame);
 report.checks.push('All 96 directional sprite frames are valid, upward movement shows rear view, idle stops the gait');
 // Slow real mouse input, separated by idle render frames, must still advance gait.
 const sb=await rect(page),sp=await pos(page),gaitBefore=await page.evaluate(()=>window.__maroScene.maroWalk.phase);
 await page.mouse.move(sb.x+sp.x*sb.width/720,sb.y+sp.y*sb.height/820);await page.mouse.down();
 for(let i=1;i<=20;i++){await page.mouse.move(sb.x+sp.x*sb.width/720,sb.y+(sp.y-i*.5)*sb.height/820);await page.waitForTimeout(45);}
 await page.mouse.up();const gaitAfter=await page.evaluate(()=>window.__maroScene.maroWalk.phase);
 assert.ok(Math.abs(gaitAfter-gaitBefore)>.8,'slow drag advances the gait across idle frames');
 const lockedFacing=await page.evaluate(()=>window.__maroScene.maroWalk.facing),jp=await pos(page);
 await page.mouse.move(sb.x+jp.x*sb.width/720,sb.y+jp.y*sb.height/820);await page.mouse.down();
 for(let i=0;i<8;i++){await page.mouse.move(sb.x+(jp.x+(i%2?0:1))*sb.width/720,sb.y+jp.y*sb.height/820);await page.waitForTimeout(25);}
 await page.mouse.up();assert.equal(await page.evaluate(()=>window.__maroScene.maroWalk.facing),lockedFacing);
 report.checks.push('Real slow drag advances walk frames; sub-pixel/one-pixel sideways adjustments preserve facing');
 const before=await pos(page);await page.waitForTimeout(150);assert.deepEqual(await pos(page),before,'pointer release stops movement');
 const m=await page.evaluate(()=>({stage:window.__maroScene.model.stage,medals:window.__maroScene.model.medals.size,misses:window.__maroScene.model.misses}));
 for(const viewport of [{width:390,height:844},{width:844,height:390},{width:320,height:568},{width:1280,height:960}]){
  await page.setViewportSize(viewport);await page.waitForTimeout(120);await bounds(page);assert.deepEqual(await pos(page),before);assert.deepEqual(await page.evaluate(()=>({stage:window.__maroScene.model.stage,medals:window.__maroScene.model.medals.size,misses:window.__maroScene.model.misses})),m);
  await page.screenshot({path:path.join(output,`play-${viewport.width}x${viewport.height}.png`)});
 }
 await page.getByRole('button',{name:'全画面表示'}).click();await page.waitForFunction(()=>!!document.fullscreenElement);await bounds(page);assert.deepEqual(await pos(page),before);await page.evaluate(()=>document.exitFullscreen());await page.waitForTimeout(120);
 await page.locator('[data-maro-action=pause]').click();const frozen=await page.evaluate(()=>JSON.stringify(window.__maroScene.model));const frozenSprite=await page.evaluate(()=>window.__maroScene.maro.frame.name);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>JSON.stringify(window.__maroScene.model)),frozen);assert.equal(await page.evaluate(()=>window.__maroScene.maro.frame.name),frozenSprite);await page.getByRole('button',{name:'冒険をつづける'}).click();
 await page.evaluate(()=>window.__maroGame.pause());const hostFrozen=await page.evaluate(()=>JSON.stringify(window.__maroScene.model));await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>JSON.stringify(window.__maroScene.model)),hostFrozen);await page.evaluate(()=>window.__maroGame.resume());
 if(process.env.MARO_RECORD)await startRecording(page);
 await page.keyboard.down('ArrowUp');await page.waitForTimeout(65);await page.keyboard.up('ArrowUp');assert.ok((await pos(page)).y<before.y);await dragTo(page,105,610);
 for(const [x,y]of [[300,610],[300,535],[180,535],[300,535],[300,460],[570,460],[570,305],[390,305],[390,140],[610,140]])await dragTo(page,x,y);
 await phase(page,'clear');assert.equal(await page.evaluate(()=>window.__maroScene.model.stageMedals),3);await page.screenshot({path:path.join(output,'forest-clear.png')});
 report.checks.push('Real mouse drag completes forest with all medals; release, keyboard, in-play resizing, fullscreen, local/host pause keep state');console.log(report.checks.at(-1));
 await page.getByRole('button',{name:'つぎの道へ'}).click();await page.getByRole('button',{name:'この道を進む'}).click();
 await dragTo(page,360,735);await dragTo(page,360,555);await dragTo(page,285,555);
 await page.screenshot({path:path.join(output,'knuckle-bridge.png')});
 await page.waitForFunction(()=>window.__maroScene.model.dog.y>605,null,{timeout:10000});
 for(const [x,y]of [[360,555],[360,375],[435,375],[360,375],[360,130],[580,130]])await dragTo(page,x,y);
 await phase(page,'clear');assert.equal(await page.evaluate(()=>window.__maroScene.model.stageMedals),3);
 await page.getByRole('button',{name:'つぎの道へ'}).click();await page.getByRole('button',{name:'この道を進む'}).click();
 for(const [x,y]of [[125,660],[230,660],[230,580],[330,580],[330,420]])await dragTo(page,x,y);
 await page.locator('[data-maro-action=pause]').click();await page.screenshot({path:path.join(output,'pursuit-paused.png')});const chase=await page.evaluate(()=>window.__maroScene.model.dogProgress);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__maroScene.model.dogProgress),chase);await page.getByRole('button',{name:'冒険をつづける'}).click();
 await page.screenshot({path:path.join(output,'spike-chase.png')});
 for(const [x,y]of [[555,420],[555,245],[365,245],[365,125],[580,125]])await dragTo(page,x,y);
 await phase(page,'clear');assert.equal(await page.evaluate(()=>window.__maroScene.model.chase),'escaped');
 for(let stage=3;stage<10;stage++){
  await page.getByRole('button',{name:'つぎの道へ'}).click();await bounds(page);await page.getByRole('button',{name:'この道を進む'}).click();
  assert.equal(await page.evaluate(()=>window.__maroScene.model.stage),stage);
  if(stage===6){
   await dragTo(page,100,430);
   await page.waitForFunction(()=>{const m=window.__maroScene.model;return m.dog.x>270&&m.dog.x<340&&(m.clock*96)%660<330;},null,{timeout:10000});
   for(const [x,y]of [[260,430],[260,510]])await dragTo(page,x,y);
   await page.waitForFunction(()=>{const m=window.__maroScene.model;return m.dog.x>440&&m.dog.x<460&&(m.clock*96)%660<330;},null,{timeout:10000});
   for(const [x,y]of [[260,430],[440,430],[440,350]])await dragTo(page,x,y);
   await page.waitForFunction(()=>{const m=window.__maroScene.model;return m.dog.x<370&&(m.clock*96)%660>330;},null,{timeout:10000});
   for(const [x,y]of [[440,430],[620,430],[620,130],[470,130]])await dragTo(page,x,y);
  }else{
   const route=await page.evaluate(()=>window.__maroScene.model.level.roads[0].points.slice(1));
   for(let i=0;i<route.length;i++){
    await dragTo(page,route[i].x,route[i].y);
    if(i===2){
     await page.screenshot({path:path.join(output,`chapter-${stage+1}.png`)});
     const saved=await pos(page);await page.setViewportSize({width:390,height:844});await bounds(page);assert.deepEqual(await pos(page),saved);
     await page.setViewportSize({width:1280,height:960});await bounds(page);
    }
   }
  }
  await phase(page,'clear');assert.equal(await page.evaluate(()=>window.__maroScene.model.stageMedals),3);await bounds(page);
 }
 await page.getByRole('button',{name:'栞音のもとへ'}).click();await phase(page,'ending');
 assert.equal(await page.evaluate(()=>window.__maroScene.model.medals.size),30);assert.ok(await page.evaluate(()=>window.__maxDogJump<18),'Spike moves continuously through every tunnel crossing');assert.equal(await page.evaluate(()=>window.__score.value),0);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('minigames:v1:maro-adventure:best:v2')).misses),0);
 await page.screenshot({path:path.join(output,'reunion-ending.png')});await bounds(page);
 report.checks.push('All ten chapters completed through real pointer input: Knuckle waiting bay, Spike chase/escape, thirty medals, reunion, best record');console.log(report.checks.at(-1));
 if(process.env.MARO_RECORD)await finishRecording(page,path.resolve('sample_game/斉藤さんゲーム/previews'));
 await page.evaluate(()=>window.__maroGame.reset());await phase(page,'title');assert.equal(await page.locator('canvas').count(),1);assert.match(await page.locator('.maro-panel').innerText(),/いちばんの冒険/);
 await begin(page);
 // Miss feedback and automatic retry, then canceled touch/rotation in a true mobile context.
 const b=await rect(page),p=await pos(page);await page.mouse.move(b.x+p.x*b.width/720,b.y+p.y*b.height/820);await page.mouse.down();await page.mouse.move(b.x+(p.x+180)*b.width/720,b.y+p.y*b.height/820);await phase(page,'miss');await page.mouse.up();await page.waitForTimeout(380);assert.equal(await page.evaluate(()=>window.__maroScene.bubble.text),'ぽすっ…');await page.screenshot({path:path.join(output,'miss-feedback.png')});await phase(page,'playing');assert.equal(await page.locator('.maro-shell').getAttribute('data-misses'),'1');
 await page.evaluate(()=>window.__maroGame.destroy());assert.equal(await page.locator('canvas').count(),0);
 const mobileCtx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const mobile=await mobileCtx.newPage();capture(mobile);await harness(mobile);await mobile.goto(base+'__maro.html');await phase(mobile,'title');await begin(mobile);await bounds(mobile);
 const mb=await rect(mobile),mp=await pos(mobile),cdp=await mobileCtx.newCDPSession(mobile);const tx=mb.x+mb.width*.75,ty=mb.y+mb.height*.8;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx,y:ty-30}]});await mobile.waitForTimeout(400);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const afterTouch=await pos(mobile);assert.ok(afterTouch.y<mp.y-35);assert.ok(Math.abs(afterTouch.x-mp.x)<1);await mobile.waitForTimeout(150);assert.deepEqual(await pos(mobile),afterTouch);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});const afterCancel=await pos(mobile);await mobile.waitForTimeout(150);assert.deepEqual(await pos(mobile),afterCancel);
 await mobile.setViewportSize({width:844,height:390});await mobile.waitForTimeout(150);await bounds(mobile);assert.deepEqual(await pos(mobile),afterCancel);
 await mobile.screenshot({path:path.join(output,'touch-landscape.png')});await mobileCtx.close();
 report.checks.push('Miss/retry, record-preserving reset, destroy cleanup; real CDP touch relative drag, release, cancel, orientation preserve position');
 // Collection entry, host controls, nested pause, fullscreen and reset.
 await page.goto(origin+'/play.html?game=maro-adventure');await phase(page,'title');assert.equal(await page.locator('body').getAttribute('data-state'),'running');await begin(page);
 await page.locator('#pause').click();await page.locator('body[data-state=paused]').waitFor();const time=await page.locator('[data-stat=time]').innerText();await page.waitForTimeout(300);assert.equal(await page.locator('[data-stat=time]').innerText(),time);await page.locator('#resume').click();await page.locator('body[data-state=running]').waitFor();
 await page.keyboard.press('Escape');await page.locator('body[data-state=paused]').waitFor();await page.locator('#resume').click();assert.equal(await page.locator('.maro-shell').getAttribute('data-paused'),'false');
 await page.locator('[data-maro-action=pause]').click();await page.locator('#pause').click();await page.locator('#resume').click();assert.equal(await page.locator('.maro-shell').getAttribute('data-paused'),'true');await page.getByRole('button',{name:'冒険をつづける'}).click();
 await page.locator('#mute').check();await page.locator('#mute').uncheck();
 for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1280,height:960}]){await page.setViewportSize(viewport);await page.waitForTimeout(150);await bounds(page);}
 await page.getByRole('button',{name:'全画面表示'}).click();await page.waitForFunction(()=>!!document.fullscreenElement);await bounds(page);await page.evaluate(()=>document.exitFullscreen());
 await page.locator('#reset').click();await phase(page,'title');assert.equal(await page.locator('canvas').count(),1);await page.screenshot({path:path.join(output,'collection-player.png')});
 await page.locator('#exit').click();await page.waitForURL('**/index.html#selection');assert.ok(await page.getByText('マロの大冒険',{exact:true}).count());
 report.checks.push('Collection catalog/URL, host pause/resume/Escape, nested local pause, mute, resize/fullscreen, reset/exit');
 assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report,null,2));
}finally{await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}

import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { serve } from '../scripts/serve.mjs';

export async function testStarBounce(browser, base, output) {
  const context = await browser.newContext({viewport:{width:1100,height:950}});
  const page = await context.newPage(), errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  page.on('response', response=>{if(response.status()>=400&&!response.url().endsWith('favicon.ico')) errors.push(`${response.status()} ${response.url()}`);});
  try {
    await page.goto(`${base}/play.html?game=pong`);
    await page.locator('body[data-state="running"]').waitFor();
    assert.equal(await page.locator('#stage').getAttribute('data-phase'),'select');
    await page.screenshot({path:path.join(output,'star-bounce-select-desktop.png')});
    await page.getByRole('button',{name:'このステージで遊ぶ'}).click();
    await page.waitForFunction(()=>Number(document.querySelector('#stage').dataset.gameScore)>=10);
    await page.screenshot({path:path.join(output,'star-bounce-play-desktop.png')});
    await page.locator('#pause').click();await page.locator('body[data-state="paused"]').waitFor();await page.waitForTimeout(100);
    const frozen=await page.locator('canvas').evaluate(c=>c.toDataURL());
    await page.waitForTimeout(600);assert.equal(await page.locator('canvas').evaluate(c=>c.toDataURL()),frozen);
    await page.locator('#resume').click();await page.locator('body[data-state="running"]').waitFor();
    await page.locator('#mute').check();
    for(let i=0;i<2;i++) { await page.locator('#reset').click();await page.locator('#stage[data-phase="select"]').waitFor();assert.equal(await page.locator('canvas').count(),1);assert.equal(await page.locator('.star-controls').count(),1); }

    // Isolated test-only fixture uses the actual scene and adapter, without adding debug hooks to shipped code.
    const compiled=await build({stdin:{resolveDir:process.cwd(),contents:`
      import { StarScene } from './games/pong/scene';
      import { createPhaserModule } from './src/adapters/phaser';
      import { createWebPlatform } from './src/platform/web';
      const ctx={container:document.querySelector('#stage'),platform:createWebPlatform(),settings:{muted:true},assetUrl:path=>${JSON.stringify(base)}+'/'+path,reportScore:()=>{},requestExit:()=>{}};
      const test=window.__starTest={};
      const module=createPhaserModule({width:480,height:760,createScene:(ctx,ready)=>(test.scene=new StarScene(ctx,ready,()=>{})),getScore:()=>null});
      test.module=module; test.ctx=ctx;
      module.init(ctx).then(()=>{module.start();document.body.dataset.state='running';});
    `},bundle:true,write:false,format:'iife'});
    await page.route('**/__star-test.html',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><link rel="stylesheet" href="${base}/src/launcher/player.css"></head><body><main><div id="stage"></div></main><script src="${base}/__star-test.js"></script></body></html>`}));
    await page.route('**/__star-test.js',route=>route.fulfill({contentType:'application/javascript',body:compiled.outputFiles[0].text}));
    await page.goto(`${base}/__star-test.html`);await page.locator('body[data-state="running"]').waitFor();
    await page.getByRole('button',{name:'このステージで遊ぶ'}).click();
    await page.evaluate(()=>{
      const m=window.__starTest.scene.model;m.serveIn=100;
      m.bonuses=[{id:201,kind:'ufo',x:145,y:375,vx:30,radius:27},{id:202,kind:'comet',x:320,y:555,vx:-35,radius:20}];
    });
    await page.waitForFunction(()=>window.__starTest.scene.bonusSprites.size===2);
    const frames=await page.evaluate(()=>[...window.__starTest.scene.bonusSprites.values()].map(s=>s.frame.name));
    await page.waitForFunction(previous=>[...window.__starTest.scene.bonusSprites.values()].every((s,i)=>s.frame.name!==previous[i]),frames);
    assert.deepEqual(await page.evaluate(()=>[...window.__starTest.scene.bonusSprites.values()].map(s=>s.flipX)),[false,true]);
    await page.screenshot({path:path.join(output,'star-bounce-animated-bonuses.png')});
    await page.evaluate(()=>window.__starTest.module.pause());
    const pausedFrames=await page.evaluate(()=>[...window.__starTest.scene.bonusSprites.values()].map(s=>s.frame.name));
    await page.waitForTimeout(300);assert.deepEqual(await page.evaluate(()=>[...window.__starTest.scene.bonusSprites.values()].map(s=>s.frame.name)),pausedFrames);
    await page.evaluate(()=>{window.__starTest.module.resume();window.__starTest.scene.model.bonuses=[];});
    await page.waitForFunction(()=>window.__starTest.scene.bonusSprites.size===0);
    await page.evaluate(()=>{const m=window.__starTest.scene.model;m.serveIn=0;m.ball={x:40,y:210,vx:0,vy:-300,radius:8};});
    await page.locator('#stage[data-mood="sad"][data-game-score="100"]').waitFor();
    assert.equal(await page.evaluate(()=>window.__starTest.scene.actor.anims.currentAnim.frames.length),4);
    await page.evaluate(()=>{const m=window.__starTest.scene.model;m.serveIn=0;m.ball={x:240,y:365,vx:0,vy:300,radius:8};m.bonuses=[{id:101,kind:'ufo',x:240,y:395,vx:0,radius:27}];});
    await page.locator('#stage[data-game-score="350"]').waitFor();
    assert.equal(await page.evaluate(()=>window.__starTest.scene.bonusSprites.size),0);
    assert.ok(await page.evaluate(()=>window.__starTest.scene.model.ball.vy)<0);
    await page.evaluate(()=>{const m=window.__starTest.scene.model;m.serveIn=0;m.ball={x:240,y:365,vx:0,vy:300,radius:8};m.bonuses=[{id:102,kind:'comet',x:240,y:395,vx:0,radius:27}];});
    await page.locator('#stage[data-game-score="500"]').waitFor();
    for(let hp=4;hp>=0;hp--) {
      await page.evaluate(()=>{const m=window.__starTest.scene.model;m.serveIn=0;m.ball={x:40,y:730,vx:0,vy:300,radius:8};});
      await page.locator(`#stage[data-hp="${hp}"][data-mood="happy"]`).waitFor();
      assert.equal(await page.locator('#stage').getAttribute('data-phase'),hp===0?'over':'playing');
    }
    await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>window.__starTest.scene.stars.filter(s=>s.alpha>0).length),0);
    await page.screenshot({path:path.join(output,'star-bounce-result-desktop.png')});
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('minigames:v1:pong:star-bounce:lumi-orbit:best:v1'))),500);
    await page.getByRole('button',{name:'もう一度あそぶ'}).click();await page.locator('#stage[data-hp="5"][data-game-score="0"]').waitFor();
    const canvas=page.locator('canvas');await canvas.focus();await page.keyboard.down('ArrowLeft');await page.waitForTimeout(250);await page.keyboard.up('ArrowLeft');
    assert.ok(await page.evaluate(()=>window.__starTest.scene.model.playerX)<180);
    const bounds=await canvas.boundingBox();await page.mouse.move(bounds.x+bounds.width*.7,bounds.y+bounds.height*.8);
    assert.ok(Math.abs(await page.evaluate(()=>window.__starTest.scene.model.playerX)-336)<3);
    await page.evaluate(()=>window.__starTest.module.pause());const elapsed=await page.evaluate(()=>window.__starTest.scene.model.elapsed);
    await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>window.__starTest.scene.model.elapsed),elapsed);
    await page.evaluate(()=>window.__starTest.module.resume());
    await page.evaluate(()=>window.__starTest.module.setSettings({muted:false}));await page.waitForFunction(()=>window.__starTest.scene.sound.mute===false);
    await page.evaluate(()=>window.__starTest.module.reset());await page.locator('#stage[data-phase="select"]').waitFor();
    assert.equal(await page.evaluate(()=>window.__starTest.scene.best),500);
    await page.evaluate(()=>window.__starTest.module.destroy());assert.equal(await page.locator('canvas').count(),0);assert.equal(await page.locator('.star-controls').count(),0);
    assert.deepEqual(errors,[]);
  } finally { await context.close(); }

  const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  try {
    const page=await mobile.newPage();
    for(const viewport of [{width:390,height:844},{width:375,height:667}]) {
      await page.setViewportSize(viewport);await page.goto(`${base}/play.html?game=pong`);await page.locator('body[data-state="running"]').waitFor();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path:path.join(output,`star-bounce-select-${viewport.width}.png`)});
      await page.getByRole('button',{name:'このステージで遊ぶ'}).tap();
      const canvas=await page.locator('canvas').boundingBox();
      assert.ok(canvas.y+canvas.height<=viewport.height);assert.ok(canvas.width>180);
      await page.touchscreen.tap(canvas.x+canvas.width*.3,canvas.y+canvas.height*.8);
      await page.getByRole('button',{name:'バーを右へ'}).tap();
      await page.waitForTimeout(500);await page.screenshot({path:path.join(output,`star-bounce-play-${viewport.width}.png`)});
      const start=await page.getByRole('button',{name:'バーを左へ'}).boundingBox();assert.ok(start.y+start.height<=viewport.height);
    }
  } finally { await mobile.close(); }
  const fallback=await browser.newContext();
  try {
    await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:get.call(this,type,...args);};});
    const page=await fallback.newPage();await page.goto(`${base}/play.html?game=pong`);await page.locator('body[data-state="running"]').waitFor();
    await page.getByRole('button',{name:'このステージで遊ぶ'}).click();assert.equal(await page.locator('canvas').evaluate(c=>!!c.getContext('2d')),true);
    await page.waitForTimeout(6500);await page.screenshot({path:path.join(output,'star-bounce-canvas-bonuses.png')});
  } finally { await fallback.close(); }
  console.log('PASS STAR BOUNCE: real input, animated bonus sheets/pause/removal, goal/bonus/miss reactions, five stars, game over, best save, pause, mute, reset/destroy, two mobile sizes, Canvas fallback');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const output=path.resolve('.test-output');await mkdir(output,{recursive:true});
  const server=await serve({root:path.resolve('dist'),port:0,base:'/minigames'});
  const mac='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||(existsSync(mac)?mac:undefined),headless:true});
  try {await testStarBounce(browser,`http://127.0.0.1:${server.address().port}/minigames`,output);} finally {await browser.close();server.close();}
}

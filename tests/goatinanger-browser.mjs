import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { serve } from '../scripts/serve.mjs';
const output=path.resolve('.test-output/goatinanger');await mkdir(output,{recursive:true});
const executablePath=process.env.CHROME_PATH||(existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined);
const browser=await chromium.launch({executablePath,headless:true});
const server=await serve({root:path.resolve('dist'),port:0,base:'/minigames'});
const base=`http://127.0.0.1:${server.address().port}/minigames`;
const errors=[],checks=[];
async function fit(page,frame=page){
  await frame.waitForFunction(()=>window.clover?.game?.scene.getScene('Field')?.player);
  await page.waitForTimeout(100);
  const r=await frame.evaluate(()=>{
    const canvas=document.querySelector('canvas').getBoundingClientRect(),stage=document.querySelector('.game-stage').getBoundingClientRect();
    return {canvas:{x:canvas.x,y:canvas.y,w:canvas.width,h:canvas.height},stage:{x:stage.x,y:stage.y,w:stage.width,h:stage.height},w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,world:{w:clover.game.scale.gameSize.width,h:clover.game.scale.gameSize.height}};
  });
  assert.equal(r.world.w,540);assert.equal(r.world.h,960);
  assert.ok(Math.abs(r.canvas.w/r.canvas.h-9/16)<.003,JSON.stringify(r));
  assert.ok(r.canvas.x>=-1&&r.canvas.y>=-1&&r.canvas.x+r.canvas.w<=r.w+1&&r.canvas.y+r.canvas.h<=r.h+1,JSON.stringify(r));
  assert.ok(r.sw<=r.w+1&&r.sh<=r.h+1,'page overflow '+JSON.stringify(r));
}
try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/sample_game/GOATinAnger/index.html`);await fit(page);
  await page.screenshot({path:`${output}/mobile-ready.png`});
  await page.locator('.unit-choice[data-unit="medic"]').click();
  await page.locator('#start-button').click();
  assert.equal(await page.evaluate(()=>clover.snapshot.health),7);
  // Two independent touches must allow simultaneous movement and fire.
  const cdp=await page.context().newCDPSession(page);
  const right=await page.locator('[data-move="right"]').boundingBox();
  const before=await page.evaluate(()=>clover.snapshot.player.x);
  const fireButton=await page.locator('#touch-fire').boundingBox();
  const points=[right,fireButton].map((r,id)=>({x:r.x+r.width/2,y:r.y+r.height/2,id}));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
  await page.waitForTimeout(250);
  assert.ok(await page.evaluate(()=>clover.snapshot.player.x)>before,'touch movement failed');
  assert.ok(await page.evaluate(()=>clover.snapshot.bullets)>0,'simultaneous touch fire failed');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(80);
  assert.equal(await page.evaluate(()=>clover.game.scene.getScene('Field').player.body.velocity.length()),0);
  checks.push('Mobile selection, two-button move/fire, release stops movement');
  // Validate every state and every source row against packed textures.
  const animation=await page.evaluate(()=>{
    const s=clover.game.scene.getScene('Field');s.invulnerableUntil=Infinity;
    const states={};
    const advance=()=>s.update(0,16);s.lastShot=Infinity;
    s.player.shotUntil=0;s.player.hurtUntil=0;s.player.body.setVelocity(0);advance();states.idle=s.player.action;
    s.keys.right.isDown=true;advance();states.walk=s.player.action;s.keys.right.isDown=false;
    s.fire(s.player,0);advance();states.shoot=s.player.action;
    s.keys.up.isDown=true;advance();states.walkShoot=s.player.action;s.keys.up.isDown=false;
    s.player.hurtUntil=s.clock+500;advance();states.hurt=s.player.action;
    s.player.dead=true;advance();states.down=s.player.action;
    s.player.dead=false;s.player.victory=true;advance();states.victory=s.player.action;
    s.player.victory=false;s.player.hurtUntil=0;s.player.shotUntil=0;
    s.lastShot=-1000;
    const sheets=['goat','fox'].flatMap(f=>['up','down','right','up-right','down-right'].map(d=>`${f}-${d}-packed`)).map(k=>({key:k,frames:s.textures.get(k).frameTotal-1}));
    return {states,sheets};
  });
  for(const [expected,actual] of Object.entries(animation.states))assert.equal(actual,expected);
  assert.equal(animation.sheets.reduce((n,s)=>n+s.frames,0),500);
  assert.ok(animation.sheets.every(s=>s.frames===(s.key.startsWith('goat')?40:60)));
  checks.push('All seven action states and 500 directional sprite frames loaded');
  await page.waitForTimeout(3800);await page.screenshot({path:`${output}/mobile-playing.png`});
  await page.locator('#pause-button').click();
  const snapshot=await page.evaluate(()=>clover.snapshot);
  for(const size of [{width:320,height:568},{width:430,height:932},{width:844,height:390},{width:1366,height:768},{width:768,height:1024},{width:390,height:650}]){
    await page.setViewportSize(size);await fit(page);
    assert.deepEqual(await page.evaluate(()=>clover.snapshot),snapshot,'resize altered game state');
    await page.screenshot({path:`${output}/resize-${size.width}x${size.height}.png`});
  }
  checks.push('Portrait, landscape, desktop, tablet and browser height changes retain full field and state');
  await page.locator('#fullscreen-button').click();await fit(page);
  assert.ok(await page.evaluate(()=>Boolean(document.fullscreenElement)),'fullscreen failed');
  await page.evaluate(()=>document.exitFullscreen());await fit(page);checks.push('Fullscreen enter/exit fits the entire field');
  await page.goto(`${base}/play.html?game=goatinanger`);
  await page.locator('body[data-state="running"]').waitFor();
  let frame=page.frames().find(f=>f.url().includes('GOATinAnger'));
  await fit(page,frame);await frame.locator('#start-button').click();await page.waitForTimeout(150);
  await page.locator('#pause').click();await page.locator('body[data-state="paused"]').waitFor();assert.equal(await frame.evaluate(()=>clover.snapshot.state),'paused');
  await page.locator('#resume').click();await page.locator('body[data-state="running"]').waitFor();assert.equal(await frame.evaluate(()=>clover.snapshot.state),'playing');
  await page.locator('#reset').click();await page.locator('body[data-state="running"]').waitFor();
  frame=page.frames().find(f=>f.url().includes('GOATinAnger'));await fit(page,frame);
  assert.equal(await frame.evaluate(()=>clover.snapshot.state),'ready');
  await page.screenshot({path:`${output}/embedded-mobile.png`});
  checks.push('Subdirectory hosting and common player pause/resume/reset');
  // Review the actual packed art, including all ten characters and five source facings.
  await page.goto(`${base}/sample_game/GOATinAnger/index.html`);await fit(page);
  await page.evaluate(()=>{
    const s=clover.game.scene.getScene('Field'),gallery=document.createElement('canvas');
    gallery.id='sprite-gallery';gallery.width=640;gallery.height=1160;
    Object.assign(gallery.style,{position:'absolute',left:'0',top:'0',zIndex:'100',width:'640px',height:'1160px'});
    const ctx=gallery.getContext('2d');ctx.fillStyle='#d8dfc8';ctx.fillRect(0,0,640,1160);ctx.fillStyle='#253d29';ctx.font='16px sans-serif';
    const dirs=['right','up-right','up','down-right','down'];dirs.forEach((d,i)=>ctx.fillText(d,96+i*108,24));
    for(let n=0;n<10;n++){
      const f=n<4?'goat':'fox',r=n<4?n:n-4,y=40+n*112;
      ctx.fillStyle='#253d29';ctx.fillText(`${f} ${r+1}`,8,y+55);
      dirs.forEach((d,i)=>ctx.drawImage(s.textures.get(`${f}-${d}-packed`).getSourceImage(),0,r*128,128,128,90+i*108,y,104,104));
    }
    document.body.append(gallery);
  });
  await page.locator('#sprite-gallery').screenshot({path:`${output}/characters-directions.png`});
  await page.locator('#sprite-gallery').evaluate(el=>el.remove());
  await page.locator('#start-button').click();
  for(const [wave,y,name] of [[2,1600,'bridge'],[3,700,'outpost']]){
    await page.evaluate(({wave,y})=>{
      const s=clover.game.scene.getScene('Field');s.wave=wave;s.clearedSector=wave-1;s.pendingSpawns=[];s.nextWaveAt=Infinity;s.nextSpawnAt=Infinity;s.player.body.reset(270,y);s.player.setAlpha(1);s.invulnerableUntil=Infinity;s.updateTravelBounds();s.update(0,16);s.updateHud();
    },{wave,y});
    await page.waitForTimeout(100);await page.screenshot({path:`${output}/sector-${name}.png`});
  }
  assert.deepEqual(errors,[]);
  await writeFile(`${output}/report.json`,JSON.stringify({checks,errors},null,2));
  console.log(checks.join('\n'));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}

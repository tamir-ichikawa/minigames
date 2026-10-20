import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {existsSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {serve} from '../scripts/serve.mjs';
const server=await serve({root:path.resolve('dist'),port:0,base:'/minigames'});
const base=`http://127.0.0.1:${server.address().port}/minigames`;
const mac='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||(existsSync(mac)?mac:undefined),headless:true});
const sizes=[{width:1280,height:900},{width:390,height:844},{width:844,height:390},{width:320,height:568}];
const errors=[];
const output=path.resolve('.test-output/pakkun-rally');await mkdir(output,{recursive:true});
async function fits(scope,selector){
 const bad=await scope.evaluate(selector=>[...document.querySelectorAll(selector)].filter(e=>e.checkVisibility()).map(e=>{
  const b=e.getBoundingClientRect();return{id:e.id||e.className,rect:[b.x,b.y,b.right,b.bottom],ok:b.x>=-1&&b.y>=-1&&b.right<=innerWidth+1&&b.bottom<=innerHeight+1};
 }).filter(e=>!e.ok),selector);assert.deepEqual(bad,[],'All controls and canvas fit');
}
const snapshot=(scope,key)=>scope.evaluate(key=>{const g=window[key];return{state:g.state,score:g.score,lives:g.lives,level:g.level,player:g.player};},key);
try{
 for(const [id,key,ratio] of [['pakkunman','PK',168/200],['rallypeke','RP',360/516]]){
  const page=await browser.newPage({viewport:sizes[0],hasTouch:true});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`${base}/sample_game/${id}/${id}.html`);
  for(const size of sizes){await page.setViewportSize(size);await page.waitForTimeout(80);await fits(page,'.ov.show .card,.ov.show button,#cv,#pad button');}
  await page.locator('#start').click();await page.waitForFunction(key=>window[key].state==='play',key);
  await page.locator('#bPause').click();const before=await snapshot(page,key);
  for(const size of sizes){await page.setViewportSize(size);await page.waitForTimeout(80);await fits(page,'.ov.show .card,.ov.show button,#cv,#pad button,.topbtn');assert.deepEqual(await snapshot(page,key),before);const box=await page.locator('#cv').boundingBox();assert.ok(Math.abs(box.width/box.height-ratio)<.001);}
  await page.locator('#resume').click();assert.equal((await snapshot(page,key)).state,'play');
  await page.goto(`${base}/play.html?game=${id}`);await page.locator('body[data-state=running]').waitFor();
  let frame=page.frames().find(f=>f.url().includes(`${id}.html`));
  await frame.locator('#start').click();await frame.waitForFunction(key=>window[key].state==='play',key);
  await page.locator('#pause').click();await page.locator('body[data-state=paused]').waitFor();
  const held=await snapshot(frame,key);await page.waitForTimeout(120);assert.deepEqual(await snapshot(frame,key),held);
  await page.locator('#resume').click();assert.equal((await snapshot(frame,key)).state,'play');
  await frame.locator('#bPause').click();const locallyPaused=await snapshot(frame,key);
  await page.locator('#pause').click();await page.locator('#resume').click();assert.deepEqual(await snapshot(frame,key),locallyPaused);
  for(const size of sizes){await page.setViewportSize(size);await page.waitForTimeout(80);await fits(frame,'.ov.show .card,.ov.show button,#cv,#pad button,.topbtn');assert.deepEqual(await snapshot(frame,key),locallyPaused);}
  await frame.locator('#resume').click();
  await page.evaluate(()=>{const b=document.createElement('button');b.id='fullscreen-check';b.textContent='Fullscreen';b.style.cssText='position:fixed;top:0;left:0;z-index:9999';b.onclick=()=>document.documentElement.requestFullscreen();document.body.append(b);});
  await page.locator('#fullscreen-check').click();await page.waitForFunction(()=>!!document.fullscreenElement);await page.waitForTimeout(80);await fits(frame,'#cv,#pad button,.topbtn');await page.evaluate(()=>document.exitFullscreen());await page.locator('#fullscreen-check').evaluate(e=>e.remove());
  await page.screenshot({path:path.join(output,`${id}-phone.png`)});
  await page.locator('#mute').click();await page.locator('#reset').click();await page.locator('body[data-state=running]').waitFor();
  frame=page.frames().find(f=>f.url().includes(`${id}.html`));await frame.locator('#title.show').waitFor();
  console.log(`${id}: standalone/embedded, PC/phone/landscape, resize state, aspect ratio, host/nested pause, fullscreen and reset passed`);
  await page.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}

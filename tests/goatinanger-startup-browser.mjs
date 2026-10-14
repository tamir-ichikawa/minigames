import {serve} from '../scripts/serve.mjs';
import path from 'node:path';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
const executablePath=process.env.CHROME_PATH||(existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined);
const server=await serve({root:path.resolve('dist'),port:0,base:'/minigames'});
const gameURL=`http://127.0.0.1:${server.address().port}/minigames/sample_game/GOATinAnger/index.html`;
const browser=await chromium.launch({executablePath,headless:true});
await mkdir('.test-output/goatinanger',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const errors=[],legacyRequests=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(/\/goat-(leader|scout|medic|rifleman)\.png(?:\?|$)/.test(r.url()))legacyRequests.push(r.url());});
 let release;const gate=new Promise(resolve=>release=resolve);
 await page.route('**/*-v2.png',async route=>{await gate;await route.continue();});
 await page.goto(gameURL,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.clover&&document.querySelector('.intro-card .unit-select'));
 const initial=await page.locator('.unit-choice img').evaluateAll(images=>images.map(image=>image.getAttribute('src')));
 await page.screenshot({path:'.test-output/goatinanger/startup-loading.png'});
 console.log('Initial portrait sources:',initial);
 release();
 await page.waitForFunction(()=>window.clover?.game.scene.getScene('Field')?.player);
 assert.ok(initial.every(src=>!src||!/^\.\/assets\/goat-(leader|scout|medic|rifleman)\.png$/.test(src)),'old proportions appear during sprite loading');
 for(const unit of ['leader','scout','medic','rifleman']){
  await page.locator(`[data-unit="${unit}"]`).click();
  const choice=await page.locator(`[data-unit="${unit}"] img`).getAttribute('src');
  assert.ok(choice.startsWith('data:image/png'));
  assert.equal(await page.locator('#unit-portrait').getAttribute('src'),choice,'selection restored old portrait');
 }
 assert.deepEqual(legacyRequests,[],'startup still requested original goat artwork');
 await page.screenshot({path:'.test-output/goatinanger/startup-ready.png'});
 await page.locator('#start-button').click();
 assert.equal(await page.evaluate(()=>clover.game.scene.getScene('Field').player.art.texture.key),'goat-up-packed');
 assert.deepEqual(errors,[]);console.log('PASS: slow-loading startup, every selected portrait and game actor all use current sprites; no legacy image requests');
}finally{await browser.close();server.close();}

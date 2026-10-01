import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { serve } from '../scripts/serve.mjs';
import { discoverGames } from '../scripts/registry.mjs';
import { testStarBounce } from './star-bounce-browser.mjs';
const output = path.resolve('.test-output'); await mkdir(output, { recursive:true });
const app = await serve({ root:path.resolve('dist'), port:0, base:'/minigames' });
const original = await serve({ root:process.cwd(), port:0 });
const base = `http://127.0.0.1:${app.address().port}/minigames`;
const baseline = `http://127.0.0.1:${original.address().port}`;
const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath = process.env.CHROME_PATH || (existsSync(macChrome) ? macChrome : undefined);
let browser;
const report = { baseline:[], games:[], checks:[], errors:[] };
try {
  browser = await chromium.launch({ executablePath, headless:true });
  const context = await browser.newContext({ viewport:{ width:1100, height:850 } });
  const page = await context.newPage();
  let errors=[];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if(message.type()==='error' && !message.location().url?.endsWith('favicon.ico')) errors.push(message.text()); });
  page.on('response', res => { if(res.status()>=400 && res.url().startsWith('http://127.0.0.1:') && !res.url().endsWith('favicon.ico')) errors.push(`HTTP ${res.status()} ${res.url()}`); });
  const games = await discoverGames(process.cwd());
  for (const game of games) {
    const legacyPath=game.legacyUrl || (game.engine==='legacy' ? game.module : null);
    if (!legacyPath) continue;
    errors=[];
    await page.goto(`${baseline}/${legacyPath}`);
    await page.waitForTimeout(180);
    report.baseline.push({ id:game.id, errors:[...errors] });
    assert.deepEqual(errors, [], `Original ${game.id}`);
  }
  console.log(`PASS baseline: ${report.baseline.length} original pages`);
  await page.goto(`${base}/index.html#selection`);
  await page.locator('.game-card').last().waitFor(); assert.equal(await page.locator('.game-card').count(),games.length);
  await page.locator('[data-filter="puzzle"]').click(); assert.equal(await page.locator('.game-card').count(),games.filter(g=>g.category==='puzzle').length);
  await page.locator('[data-filter="all"]').click();
  await page.screenshot({ path:path.join(output,'launcher-desktop.png'), fullPage:true });
  assert.equal(await page.evaluate(() => performance.getEntriesByType('resource').some(r => /\.js(?:\?|$)/.test(r.name) && /reflex|phaser/i.test(r.name))),false);
  report.checks.push(`${games.length} cards, category filtering, subdirectory hosting, Phaser not eagerly loaded`);
  for (const game of games) {
    errors=[];
    await page.goto(`${base}/play.html?game=${game.id}`);
    await page.locator('body[data-state="running"]').waitFor({ timeout:20000 });
    await page.waitForTimeout(180);
    await page.locator('#pause').click(); await page.locator('body[data-state="paused"]').waitFor();
    await page.locator('#resume').click(); await page.locator('body[data-state="running"]').waitFor();
    report.games.push({ id:game.id, errors:[...errors] });
    assert.deepEqual(errors, [], `Managed ${game.id}`);
  }
  console.log(`PASS managed: ${report.games.length} games load / pause / resume`);
  if(games.some(g=>g.id==='platform-scaffold-check')) {
    await page.goto(`${base}/play.html?game=platform-scaffold-check`); await page.locator('body[data-state="running"]').waitFor();
    await page.locator('.native-controls button').click(); assert.match(await page.locator('#score').textContent(),/1 点/);
    report.checks.push('Freshly scaffolded Phaser module automatically appears, starts, and scores');
  }
  await page.evaluate(()=>{localStorage.setItem('tsm1','7');localStorage.setItem('15puzzle_best','22');});
  await page.goto(`${base}/play.html?game=tsumiki`); await page.locator('body[data-state="running"]').waitFor();
  let frame=page.frames().find(f=>f.url().includes('games/tsumiki'));
  assert.equal(await frame.evaluate(()=>best),7);
  await frame.locator('canvas').click(); await page.waitForTimeout(250);
  await page.locator('#pause').click(); await page.locator('body[data-state="paused"]').waitFor();
  const x=await frame.evaluate(()=>moving.x); await page.waitForTimeout(450); assert.equal(await frame.evaluate(()=>moving.x),x);
  await page.locator('#resume').click(); await page.waitForTimeout(150); assert.notEqual(await frame.evaluate(()=>moving.x),x);
  // Place a block when it overlaps the base, using actual keyboard input.
  await frame.waitForFunction(()=>moving.x>blocks[0].x-20 && moving.x<blocks[0].x+20);
  await frame.locator('canvas').press('Space'); await page.waitForTimeout(300);
  assert.ok(await frame.evaluate(()=>score)>=1); assert.match(await page.locator('#score').textContent(),/段/);
  await page.screenshot({ path:path.join(output,'tower-desktop.png') });
  await frame.evaluate(()=>{ parent.__lastAudio = audioCtx; });
  await page.locator('#reset').click(); await page.locator('body[data-state="running"]').waitFor();
  frame=page.frames().find(f=>f.url().includes('games/tsumiki')); assert.equal(await frame.evaluate(()=>state),'menu');
  await page.waitForFunction(()=>window.__lastAudio.state==='closed');
  report.checks.push('Tower gameplay/score, pause freezes physics, resume, reset closes AudioContext');
  await page.goto(`${base}/play.html?game=15-puzzle`); await page.locator('body[data-state="running"]').waitFor();
  frame=page.frames().find(f=>f.url().includes('games/15-puzzle'));
  await frame.waitForFunction(()=>tiles.length===16);
  assert.equal(await frame.locator('#best-moves').textContent(),'22');
  // Select an adjacent tile through its rendered cell position.
  const tile=await frame.evaluate(()=>({ index:emptyIdx%4>0?emptyIdx-1:emptyIdx+1 }));
  const bounds=await frame.locator('#board').boundingBox();
  await page.mouse.click(bounds.x+(tile.index%4+.5)*bounds.width/4,bounds.y+(Math.floor(tile.index/4)+.5)*bounds.height/4);
  await frame.waitForFunction(()=>moveCount===1);
  const key=await frame.evaluate(()=>emptyIdx%4>0?'ArrowRight':'ArrowLeft');
  await frame.locator('#board').press(key); await frame.waitForFunction(()=>moveCount===2);
  await page.waitForTimeout(1100);
  await page.locator('#pause').click(); await page.locator('body[data-state="paused"]').waitFor();
  const timer=await frame.locator('#timer').textContent(); await page.waitForTimeout(1200); assert.equal(await frame.locator('#timer').textContent(),timer);
  await page.locator('#resume').click(); await frame.locator('.btn-peek').click(); assert.ok(await frame.locator('#peek-overlay').evaluate(el=>el.classList.contains('show')));
  await frame.locator('#peek-overlay').click(); await page.screenshot({path:path.join(output,'puzzle-desktop.png')});
  await frame.evaluate(()=>{ state=Array.from({length:16},(_,i)=>i); [state[14],state[15]]=[state[15],state[14]]; emptyIdx=14; solved=false; renderState(); });
  await frame.locator('#board').press('ArrowLeft'); await frame.locator('#overlay.show').waitFor();
  assert.equal(await frame.locator('#best-moves').textContent(),'3'); assert.equal(await frame.evaluate(()=>localStorage.getItem('15puzzle_best')),'3');
  report.checks.push('Picture puzzle pointer/keyboard moves, timer pause, preview, clear and best save; old records retained');
  await page.goto(`${base}/play.html?game=speed_tap`); await page.locator('body[data-state="running"]').waitFor();
  frame=page.frames().find(f=>f.url().includes('games/speed_tap'));
  await frame.locator('[data-val="oni"]').click(); assert.equal(await frame.locator('#sizeBtnRow').isVisible(),false);
  await frame.locator('[data-val="slow"]').click(); await frame.locator('#startBtn').click();
  await frame.waitForFunction(()=>document.getElementById('timeLeft').textContent==='9',null,{timeout:10000});
  await page.locator('#pause').click(); await page.locator('body[data-state="paused"]').waitFor();
  assert.equal(await frame.evaluate(()=>document.getAnimations().every(animation=>animation.playState!=='running')),true);
  const left=await frame.locator('#timeLeft').textContent(); await page.waitForTimeout(1200); assert.equal(await frame.locator('#timeLeft').textContent(),left);
  await page.locator('#resume').click();
  await frame.locator('.target').filter({hasNotText:'💣'}).first().click(); await page.waitForTimeout(300);
  await page.screenshot({path:path.join(output,'speed-tap-desktop.png')});
  await frame.locator('#resultScreen.active').waitFor({timeout:13000}); assert.match(await frame.locator('#rScore').textContent(),/てん/);
  await page.locator('#reset').click(); await page.locator('body[data-state="running"]').waitFor();
  report.checks.push('Speed tap oni/size options, countdown, pause, tap, reset');
  await context.addInitScript(()=>localStorage.setItem('rfx1','87'));
  await page.goto(`${base}/play.html?game=reflex`); await page.locator('body[data-state="running"]').waitFor();
  await page.locator('.native-controls button').click();
  await page.locator('#pause').click(); await page.locator('body[data-state="paused"]').waitFor();
  await page.waitForTimeout(4200); assert.equal(await page.locator('#stage').getAttribute('data-phase'),'wait');
  await page.locator('#resume').click();
  for(let i=0;i<5;i++) {
    await page.locator('#stage[data-phase="go"]').waitFor({timeout:6000});
    await page.locator('.native-controls button').click();
    await page.locator(`#stage[data-phase="${i===4?'result':'wait'}"]`).waitFor();
  }
  assert.match(await page.locator('#score').textContent(),/ms/);
  assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('minigames:v1:reflex:best-ms')))<=87);
  await page.screenshot({path:path.join(output,'reflex-result-desktop.png')});
  for(let i=0;i<3;i++) { await page.locator('#reset').click(); await page.locator('body[data-state="running"]').waitFor(); assert.equal(await page.locator('canvas').count(),1); assert.equal(await page.locator('.native-controls').count(),1); }
  report.checks.push('Phaser five rounds, pause freezes wait, result, legacy best migration, repeated reset without duplicate canvas');
  await page.locator('#mute').check(); await page.reload(); await page.locator('body[data-state="running"]').waitFor(); assert.equal(await page.locator('#mute').isChecked(),true);
  await page.goto(`${base}/play.html?game=missing`); await page.locator('#error:not([hidden])').waitFor();
  await page.goto(`${base}/collection/`); await page.locator('.game-card').last().waitFor(); assert.equal(await page.locator('.game-card').count(),games.length);
  report.checks.push('Settings persist; missing/disabled game fails safely; Collection uses same registry');
  const mobile=await browser.newContext({ viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true });
  const mobilePage=await mobile.newPage();
  for(const id of ['reflex','15-puzzle','speed_tap','tsumiki']) {
    await mobilePage.goto(`${base}/play.html?game=${id}`); await mobilePage.locator('body[data-state="running"]').waitFor();
    assert.ok(await mobilePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`mobile width ${id}`);
    await mobilePage.screenshot({path:path.join(output,`${id}-mobile.png`)});
    if(id==='reflex') { await mobilePage.locator('.native-controls button').tap(); assert.equal(await mobilePage.locator('#stage').getAttribute('data-phase'),'wait'); }
    if(id==='tsumiki') { const f=mobilePage.frames().find(f=>f.url().includes('games/tsumiki')); await f.locator('canvas').tap(); assert.equal(await f.evaluate(()=>state),'play'); }
  }
  report.checks.push('Four migrated/improved games render at 390×844 with no host horizontal overflow');
  await mobilePage.setViewportSize({width:375,height:667});
  await mobilePage.goto(`${base}/play.html?game=speed_tap`); await mobilePage.locator('body[data-state="running"]').waitFor();
  const shortFrame=mobilePage.frames().find(f=>f.url().includes('games/speed_tap'));
  await shortFrame.locator('#startBtn').tap(); await shortFrame.locator('#playScreen.active').waitFor();
  await mobilePage.screenshot({path:path.join(output,'speed-tap-small-mobile.png')});
  await mobile.close();
  const canvasContext=await browser.newContext();
  await canvasContext.addInitScript(()=>{
    const getContext=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args) { return type.includes('webgl') ? null : getContext.call(this,type,...args); };
  });
  const canvasPage=await canvasContext.newPage();
  await canvasPage.goto(`${base}/play.html?game=reflex`); await canvasPage.locator('body[data-state="running"]').waitFor();
  assert.equal(await canvasPage.locator('canvas').evaluate(canvas=>canvas.getContext('2d')!==null),true);
  await canvasPage.locator('.native-controls button').click(); await canvasPage.locator('#stage[data-phase="wait"]').waitFor();
  await canvasContext.close();
  report.checks.push('Touch input; small 375×667 speed-tap start reachable; Phaser Canvas fallback without WebGL');
  for (const mode of ['inspect-player','inspect-fleet']) {
    await page.goto(`${base}/collection/games/shooting/index.html?${mode}`);
    await page.locator('[data-test-status]').waitFor({timeout:20000});
    assert.equal(await page.locator('[data-test-status]').getAttribute('data-test-status'),'passed');
    report.checks.push(`Existing shooting ${mode}: ${await page.locator('#results').evaluate(el=>el.textContent.split('\n').length)} checks passed`);
  }
  console.log('PASS interactions, saves, errors, mobile layout, existing shooting checks');
  await testStarBounce(browser, base, output);
  report.checks.push('STAR BOUNCE: gameplay, reactions, HP, scores, saves, lifecycle, mobile and Canvas fallback');
} catch(error) { report.errors.push(error.stack); console.error(error); process.exitCode=1; }
finally {
  await writeFile(path.join(output,'browser-report.json'),JSON.stringify(report,null,2));
  await browser?.close(); app.close(); original.close();
}

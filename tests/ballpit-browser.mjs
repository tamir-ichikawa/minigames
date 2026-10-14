import assert from 'node:assert/strict';

export async function testBallpit(browser, base, output) {
  const errors = [];
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('favicon.ico')) errors.push(`${r.status()} ${r.url()}`); });
  const open = async () => {
    await page.goto(`${base}/play.html?game=ballpit&debug=1`);
    await page.locator('body[data-state="running"]').waitFor();
    await page.waitForFunction(() => !!window.__ballpit?.scene.textures.exists('actions'));
  };
  const fit = async label => {
    await page.waitForTimeout(120);
    const layout = await page.evaluate(() => {
      const root = document.querySelector('#stage > div').shadowRoot;
      const box = el => { const r = el.getBoundingClientRect(); return { x:r.x,y:r.y,w:r.width,h:r.height }; };
      return { w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,
        container:box(root.querySelector('.pit')), canvas:box(root.querySelector('canvas')), controls:[...root.querySelectorAll('.controls button, .tools button, .hud')].map(box),
        buttons:[...root.querySelectorAll('.dialog button')].map(box),
        field:[window.__ballpit.game.scale.gameSize.width,window.__ballpit.game.scale.gameSize.height] };
    });
    assert.deepEqual(layout.field,[560,660]);
    assert.ok(Math.abs(layout.canvas.w/layout.canvas.h-560/660)<.003,`${label}: distorted arena`);
    assert.ok(layout.canvas.h>60,`${label}: collapsed arena`);
    for (const r of [layout.canvas,...layout.controls,...layout.buttons]) assert.ok(r.x>=-1&&r.y>=-1&&r.x+r.w<=layout.w+1&&r.y+r.h<=layout.h+1,`${label}: clipped UI ${JSON.stringify(r)}`);
    for (const r of [layout.canvas,...layout.controls,...layout.buttons]) assert.ok(r.x>=layout.container.x-1&&r.y>=layout.container.y-1&&r.x+r.w<=layout.container.x+layout.container.w+1&&r.y+r.h<=layout.container.y+layout.container.h+1,`${label}: outside game container ${JSON.stringify(r)}`);
    assert.ok(layout.sw<=layout.w+1&&layout.sh<=layout.h+1,`${label}: page overflow`);
  };
  try {
    await open(); await fit('desktop title');
    await page.screenshot({path:`${output}/ballpit-desktop-title.png`});
    await page.locator('[data-count="5"]').click();
    await page.locator('#begin').click();
    await page.waitForFunction(()=>__ballpit.scene.combat.phase==='playing');
    assert.equal(await page.evaluate(()=>__ballpit.scene.combat.total),5);
    await page.keyboard.down('d'); await page.waitForTimeout(180); await page.keyboard.up('d');
    assert.ok(await page.evaluate(()=>__ballpit.scene.combat.x)>300);
    const canvas=await page.locator('canvas').boundingBox();
    await page.mouse.move(canvas.x+canvas.width*.45,canvas.y+canvas.height*.25);
    await page.mouse.down(); await page.waitForTimeout(350); await page.mouse.up();
    assert.ok(await page.evaluate(()=>__ballpit.scene.combat.stats.shots)>=2,'held fire');
    await page.locator('body > header #pause').click();
    await page.locator('body[data-state="paused"]').waitFor();
    const before=await page.evaluate(()=>JSON.stringify(__ballpit.scene.combat.snapshot()));
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(()=>JSON.stringify(__ballpit.scene.combat.snapshot())),before);
    await page.locator('body > main #resume').click();
    await page.waitForFunction(()=>__ballpit.scene.combat.phase==='playing');
    // Escape belongs to the player; there must not be a second toggle in the scene.
    await page.keyboard.press('Escape'); await page.locator('body[data-state="paused"]').waitFor();
    await page.keyboard.press('Escape'); await page.locator('body[data-state="running"]').waitFor();
    assert.equal(await page.evaluate(()=>__ballpit.scene.combat.phase),'playing');
    await page.evaluate(()=>{window.__resizeCombat=__ballpit.scene.combat;window.__resizeTime=__ballpit.scene.combat.time;});
    await page.setViewportSize({width:900,height:720}); await fit('resize during active combat');
    assert.equal(await page.evaluate(()=>__resizeCombat===__ballpit.scene.combat&&__ballpit.scene.combat.time>=__resizeTime&&__ballpit.scene.combat.phase==='playing'),true);
    await page.locator('#pit-pause').click();
    const position=await page.evaluate(()=>({x:__ballpit.scene.combat.x,time:__ballpit.scene.combat.time,shots:__ballpit.scene.combat.stats.shots}));
    for (const size of [{width:390,height:844},{width:844,height:390},{width:320,height:568},{width:740,height:360},{width:1024,height:640}]) {
      await page.setViewportSize(size); await fit(`${size.width}×${size.height}`);
      assert.deepEqual(await page.evaluate(()=>({x:__ballpit.scene.combat.x,time:__ballpit.scene.combat.time,shots:__ballpit.scene.combat.stats.shots})),position);
      await page.screenshot({path:`${output}/ballpit-${size.width}x${size.height}.png`});
    }
    await page.evaluate(()=>{document.querySelector('#stage').style.cssText='width:460px;height:340px';});
    await fit('smaller embedding container');
    await page.evaluate(()=>{document.querySelector('#stage').style.cssText='';});
    // Inner pause remains paused across host pause/resume.
    await page.locator('body > header #pause').click(); await page.locator('body[data-state="paused"]').waitFor();
    await page.locator('body > main #resume').click(); await page.locator('body[data-state="running"]').waitFor();
    assert.equal(await page.evaluate(()=>__ballpit.scene.combat.phase),'paused');
    await page.locator('#continue').click();
    await page.locator('#fullscreen').click();
    await page.waitForFunction(()=>!!document.fullscreenElement); await fit('fullscreen');
    await page.locator('#fullscreen').click(); await page.waitForFunction(()=>!document.fullscreenElement); await fit('exit fullscreen');
    // Model fixtures reach rare UI states; physics and progression have separate model tests.
    await page.evaluate(()=>{ const m=__ballpit.scene.combat; m.exp=115; m.resolve(); });
    await page.locator('.card').first().waitFor();
    await page.setViewportSize({width:844,height:390}); await fit('landscape upgrades');
    await page.screenshot({path:`${output}/ballpit-upgrades.png`});
    await page.locator('.card').first().click(); await page.locator('.card').first().click();
    await page.waitForFunction(()=>__ballpit.scene.combat.phase==='playing');
    await page.evaluate(()=>{const m=__ballpit.scene.combat;m.stats.kills=7;m.hp=0;m.resolve();});
    await page.locator('#again').waitFor(); await fit('defeat');
    assert.match(await page.locator('body > footer #score').textContent(),/7/);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('minigames:v1:ballpit:best-kills:v1'))),7);
    await page.locator('#again').click();
    await page.waitForFunction(()=>__ballpit.scene.combat.phase==='playing');
    await page.evaluate(()=>{const m=__ballpit.scene.combat;m.wave=3;m.spawned=1;m.enemies=[];m.exp=0;m.pending=0;m.stats.kills=38;m.nextWave=true;m.resolve();});
    await page.waitForFunction(()=>__ballpit.scene.combat.phase==='clear');
    await fit('clear'); assert.match(await page.locator('.dialog h2').textContent(),/城塞/);
    await page.screenshot({path:`${output}/ballpit-clear.png`});
    await page.locator('#mute').check();
    assert.equal(await page.evaluate(()=>__ballpit.audio?.state ?? 'suspended'),'suspended');
    for(let i=0;i<3;i++) {
      await page.locator('body > header #reset').click(); await page.locator('body[data-state="running"]').waitFor();
      assert.equal(await page.locator('canvas').count(),1); assert.equal(await page.locator('#begin').count(),1);
      assert.equal(await page.evaluate(()=>__ballpit.scene.combat.phase),'ready');
    }
    await open(); assert.equal(await page.locator('[data-count="5"]').getAttribute('aria-pressed'),'true');
    assert.match(await page.locator('#best').textContent(),/38/); assert.equal(await page.locator('#mute').isChecked(),true);
    await page.locator('#exit').click(); await page.locator('.game-card').last().waitFor();
    await page.locator('.game-card[href*="game=ballpit"]').click(); await page.locator('#begin').waitFor();
    assert.equal(await page.evaluate(()=>typeof window.__ballpit),'undefined','normal play exposes no debug controls');
    assert.equal(await page.locator('canvas').count(),1);
    const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const touch=await mobile.newPage(); touch.on('pageerror',e=>errors.push(e.message));
    await touch.goto(`${base}/play.html?game=ballpit&debug=1`); await touch.locator('#begin').tap();
    await touch.waitForFunction(()=>__ballpit.scene.combat.phase==='playing');
    const cdp=await mobile.newCDPSession(touch);
    const right=await touch.locator('#right').boundingBox(),field=await touch.locator('canvas').boundingBox();
    const points=[{x:right.x+right.width/2,y:right.y+right.height/2,id:1},{x:field.x+field.width*.45,y:field.y+field.height*.3,id:2}];
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points}); await touch.waitForTimeout(200);
    assert.ok(await touch.evaluate(()=>__ballpit.scene.combat.x)>300,'simultaneous touch movement');
    assert.ok(await touch.evaluate(()=>__ballpit.scene.combat.stats.shots)>0,'simultaneous touch fire');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await touch.waitForTimeout(50);
    assert.equal(await touch.evaluate(()=>__ballpit.scene.controls.move),0); assert.equal(await touch.evaluate(()=>__ballpit.scene.controls.fire),false);
    await touch.screenshot({path:`${output}/ballpit-touch.png`}); await mobile.close();
    assert.deepEqual(errors,[]);
    console.log('PASS BALL＆PIT: combat input, upgrades, results, scores, save, pause/reset/exit, mobile multi-touch, resize and fullscreen');
  } catch (error) { await page.screenshot({path:`${output}/ballpit-failure.png`}); console.error(errors, await page.locator('body').innerText()); throw error; } finally { await context.close(); }
}

if (process.argv[1]?.endsWith('/ballpit-browser.mjs')) {
  const {chromium}=await import('@playwright/test');
  const {existsSync}=await import('node:fs');
  const {mkdir}=await import('node:fs/promises');
  const {serve}=await import('../scripts/serve.mjs');
  const path=await import('node:path');
  const server=await serve({root:path.resolve('dist'),port:0,base:'/minigames'});
  const executablePath=process.env.CHROME_PATH||(existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined);
  const browser=await chromium.launch({executablePath,headless:true});
  try { await mkdir('.test-output',{recursive:true}); await testBallpit(browser,`http://127.0.0.1:${server.address().port}/minigames`,path.resolve('.test-output')); }
  finally {await browser.close();server.close();}
}

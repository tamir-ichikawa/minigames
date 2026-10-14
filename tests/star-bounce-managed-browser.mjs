import assert from 'node:assert/strict';

export async function testStarBounce(browser,base,output) {
 const context=await browser.newContext({viewport:{width:1100,height:900}}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
 const fit=async()=>{
  await page.waitForTimeout(150);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+1),'page overflow');
  const parent=await page.locator('#stage').boundingBox();
  for(const button of await page.locator('.sb-shell button:visible').all()){
   const r=await button.boundingBox();assert.ok(r.x>=parent.x-1&&r.y>=parent.y-1&&r.x+r.width<=parent.x+parent.width+1&&r.y+r.height<=parent.y+parent.height+1,'game control outside its container');
  }
 };
 try {
  await page.goto(`${base}/play.html?game=pong`);await page.locator('body[data-state=running]').waitFor();
  assert.equal(await page.locator('[data-character]').count(),4);
  assert.equal(await page.locator('[data-action=sound]').isVisible(),false);
  await fit();await page.screenshot({path:`${output}/star-story-managed-desktop.png`});
  await page.locator('[data-side=DARK]').click();assert.equal(await page.locator('[data-character]').count(),3);
  await page.getByRole('button',{name:'クロと出発する'}).click();await page.getByRole('button',{name:'ラリーをはじめる'}).click();
  await page.locator('.sb-shell[data-phase=playing]').waitFor();
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(150);await page.keyboard.up('ArrowRight');
  await page.locator('#pause').click();await page.locator('body[data-state=paused]').waitFor();await page.waitForTimeout(100);
  const frozen=await page.locator('canvas').evaluate(c=>c.toDataURL());await page.waitForTimeout(250);assert.equal(await page.locator('canvas').evaluate(c=>c.toDataURL()),frozen);
  await page.locator('#resume').click();await page.locator('.sb-shell[data-phase=playing]').waitFor();
  // Settings Escape must close only the dialog, without accidentally pausing the common player.
  await page.locator('[data-action=settings]').click();await page.locator('button[data-background=still]').click();await page.keyboard.press('Escape');
  await page.locator('.sb-shell[data-phase=playing]').waitFor();assert.equal(await page.locator('body').getAttribute('data-state'),'running');
  await page.locator('[data-action=pause]').click();
  await page.locator('#pause').click();await page.locator('body[data-state=paused]').waitFor();await page.locator('#resume').click();
  assert.equal(await page.locator('.sb-shell').getAttribute('data-phase'),'paused');
  const hp=await page.locator('.sb-shell').getAttribute('data-hp'),score=await page.locator('.sb-shell').getAttribute('data-score');
  for(const size of [{width:390,height:844},{width:320,height:568},{width:844,height:390},{width:568,height:320},{width:1280,height:800}]){
   await page.setViewportSize(size);await fit();
   assert.equal(await page.locator('.sb-shell').getAttribute('data-hp'),hp);assert.equal(await page.locator('.sb-shell').getAttribute('data-score'),score);
   const r=await page.locator('canvas').boundingBox();assert.ok(r.height/r.width>=1.5,'portrait court');
   await page.screenshot({path:`${output}/star-story-managed-${size.width}.png`});
  }
  await page.locator('[data-action=fullscreen]').click();await page.waitForFunction(()=>!!document.fullscreenElement);
  await page.evaluate(()=>document.exitFullscreen());await fit();
  await page.getByRole('button',{name:'ラリーに戻る'}).click();
  await page.locator('#mute').check();
  for(let i=0;i<3;i++){await page.locator('#reset').click();await page.locator('.sb-shell[data-phase=select]').waitFor();assert.equal(await page.locator('canvas').count(),1);}
  await page.reload();await page.locator('.sb-shell[data-phase=select]').waitFor();assert.equal(await page.locator('#mute').isChecked(),true);
  await page.locator('[data-action=settings]').click();assert.equal(await page.locator('button[data-background=still]').getAttribute('aria-pressed'),'true');await page.locator('[data-action=close-settings]').click();
  await page.locator('#exit').click();await page.locator('#recommended [data-game=pong]').click();await page.locator('.sb-shell[data-phase=select]').waitFor();
  assert.equal(await page.locator('canvas').count(),1);assert.deepEqual(errors,[]);
  console.log('PASS STAR BOUNCE story in common player: new roster, input, pause/settings/mute, resize/fullscreen, reset, saved preferences, exit/reopen');
 }finally{await context.close();}
}

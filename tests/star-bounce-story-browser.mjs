import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import path from 'node:path';
import { serve } from '../scripts/serve.mjs';
const out=path.resolve('.test-output/star-bounce-story');await mkdir(out,{recursive:true});
const server=await serve({root:path.resolve('dist'),port:0});
const base=`http://127.0.0.1:${server.address().port}/sample_game/STAR_BOUNCE`;
const mac='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||(existsSync(mac)?mac:undefined),headless:true});
const report={checks:[],errors:[]};
let diagnosticPage;
try{
  const ctx=await browser.newContext({viewport:{width:1000,height:920}}),page=await ctx.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`${base}/`);await page.locator('[data-phase=select]').waitFor();
  assert.equal(await page.locator('[data-character]').count(),4);
  assert.equal(await page.locator('[data-difficulty=normal]').getAttribute('aria-pressed'),'true');
  for(const difficulty of ['easy','hard','normal']) {await page.locator(`[data-difficulty=${difficulty}]`).click();assert.equal(await page.locator(`[data-difficulty=${difficulty}]`).getAttribute('aria-pressed'),'true');}
  await page.screenshot({path:path.join(out,'selection-good.png')});
  await page.locator('button[data-side=DARK]').click();await page.locator('[data-character=neneko]').click();
  assert.match(await page.locator('.sb-summary').textContent(),/うとうとビーム/);
  await page.screenshot({path:path.join(out,'selection-dark.png')});
  await page.getByRole('button',{name:'ネネコと出発する'}).click();await page.locator('[data-phase=intro]').waitFor();
  assert.match(await page.locator('.sb-modal').textContent(),/焼きたて工房をねらえ/);
  await page.getByRole('button',{name:'ラリーをはじめる'}).click();await page.locator('[data-phase=playing]').waitFor();
  await page.waitForTimeout(200);
  assert.ok(await page.locator('canvas').evaluate(c=>c.getBoundingClientRect().bottom<=c.parentElement.getBoundingClientRect().bottom+1));
  await page.screenshot({path:path.join(out,'play-dark.png')});
  await page.locator('[data-action=pause]').click();await page.locator('[data-phase=paused]').waitFor();
  await page.waitForTimeout(100);const frozen=await page.locator('canvas').evaluate(c=>c.toDataURL());await page.waitForTimeout(450);assert.equal(await page.locator('canvas').evaluate(c=>c.toDataURL()),frozen);
  await page.getByRole('button',{name:'ラリーに戻る'}).click();await page.locator('[data-phase=playing]').waitFor();
  await page.locator('[data-action=home]').click();await page.getByRole('button',{name:'旅を続ける'}).click();await page.locator('[data-phase=playing]').waitFor();
  await page.locator('[data-action=home]').click();await page.locator('.sb-actions').getByRole('button',{name:'選び直す'}).click();await page.locator('[data-phase=select]').waitFor();
  report.checks.push('Real selection/route/return input, pause/resume, confirmed home, screenshots');

  // Capture the real scene only inside this bundled, test-only harness.
  const bundled=await build({stdin:{resolveDir:process.cwd(),contents:`
    import {createGame} from './sample_game/STAR_BOUNCE/index';
    import {StoryScene} from './sample_game/STAR_BOUNCE/scene';
    import {spawnFlight,advanceFlight} from './sample_game/STAR_BOUNCE/flights';
    window.__flight=id=>{const t=spawnFlight(id,window.__scene.match.height,()=>.3);advanceFlight(t,t.flight.duration*.4);return t;};
    import {createWebPlatform} from './src/platform/web';
    const create=StoryScene.prototype.create;StoryScene.prototype.create=function(){window.__scene=this;create.call(this);};
    const game=window.__game=createGame();
    game.init({container:document.getElementById('app'),platform:createWebPlatform(),settings:{muted:true},assetUrl:p=>${JSON.stringify(base)}+'/'+p.replace(/^sample_game\\/STAR_BOUNCE\\//,''),reportScore:()=>{},requestExit:()=>{}}).then(()=>game.start());
  `},bundle:true,write:false,format:'iife'});
  const harness=async page=>{await page.route('**/__story.html',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><link rel="stylesheet" href="${base}/style.css"></head><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#0c1020}#app{height:100dvh;min-height:0}</style><body><main id="app"></main><script src="${base}/__story.js"></script></body></html>`}));
  await page.route('**/__story.js',r=>r.fulfill({contentType:'application/javascript',body:bundled.outputFiles[0].text}));};
  await harness(page);
  await page.goto(`${base}/__story.html`);await page.locator('[data-phase=select]').waitFor();
  const sheets=await page.evaluate(()=>['good','dark','bonus','falcon','decor'].map(id=>{
    const t=window.__scene.textures.get(id==='decor'?'stage-decor':`atlas-${id}`),source=t.getSourceImage(),canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;const c=canvas.getContext('2d');c.drawImage(source,0,0);const data=c.getImageData(0,0,canvas.width,canvas.height).data;let clear=0;for(let i=3;i<data.length;i+=4)if(data[i]===0)clear++;return {id,frames:t.frameTotal-1,clear:clear/(data.length/4)};
  }));
  assert.deepEqual(sheets.map(s=>s.frames),[24,18,16,4,8]);assert.ok(sheets.every(s=>s.clear>.25),'sprite sheets have real alpha');
  await page.evaluate(()=>localStorage.setItem('minigames:v1:star-bounce-story:best:GOOD','420'));
  await page.locator('[data-difficulty=easy]').click();await page.getByRole('button',{name:'ポポと出発する'}).click();assert.equal(await page.evaluate(()=>window.__scene.best),420);await page.evaluate(()=>window.__game.reset());
  await page.locator('[data-difficulty=normal]').click();

  for(const [side,id,name]of [['GOOD','popo','ポポ'],['DARK','kuro','クロ']]){
    await page.locator(`button[data-side=${side}]`).click();await page.locator(`[data-character=${id}]`).click();await page.getByRole('button',{name:`${name}と出発する`}).click();
    for(let stage=0;stage<3;stage++){
      await page.getByRole('button',{name:'ラリーをはじめる'}).click();
      const rival=(side==='GOOD'?['kuro','akane','neneko']:['merry','mokkul','tokori'])[stage];
      assert.equal(await page.locator('.sb-shell').getAttribute('data-arena'),rival);
      await page.screenshot({path:path.join(out,`arena-${rival}.png`)});
      if(stage===1){await page.waitForTimeout(100);await page.screenshot({path:path.join(out,`candy-stage-${side}.png`)});}
      for(let goal=1;goal<=3;goal++){
        await page.evaluate(()=>{const m=window.__scene.match;m.serve=0;m.ball={x:35,y:-12,vx:0,vy:-300,radius:8};});
        await page.waitForFunction(n=>window.__scene.match.goals===n,goal);
      }
      await page.locator('[data-phase=clear]').waitFor();await page.getByRole('button',{name:stage===2?'エンディングへ':'次のステージへ'}).click();
    }
    await page.locator('[data-phase=ending]').waitFor();assert.equal(await page.evaluate(()=>window.__scene.match.totalGoals),9);
    await page.screenshot({path:path.join(out,`ending-${side.toLowerCase()}.png`)});
    assert.equal(await page.evaluate(side=>localStorage.getItem(`minigames:v1:star-bounce-story:cleared:${side}:normal`),side),'true');
    await page.getByRole('button',{name:'この相棒で無限ラリー'}).click();assert.equal(await page.evaluate(()=>window.__scene.match.endless),true);
    for(let hp=4;hp>=0;hp--){await page.evaluate(()=>{const m=window.__scene.match;m.serve=0;m.ball={x:35,y:m.height+12,vx:0,vy:300,radius:8};});await page.locator(`[data-hp="${hp}"]`).waitFor();}
    await page.locator('[data-phase=over]').waitFor();await page.getByRole('button',{name:'キャラ選択へ'}).click();
  }
  report.checks.push('Transparent sheets (70 frames including stage props), legacy easy best migration, GOOD/DARK three chapters, ending, separate completion saves, endless, five misses');
  for(const [side,id,name,skill]of [['GOOD','popo','ポポ','wide'],['GOOD','merry','メリー','slow'],['GOOD','tokori','トコリ','charge'],['GOOD','mokkul','モックル','guard'],['DARK','kuro','クロ','shot'],['DARK','neneko','ネネコ','sleep'],['DARK','akane','アカネ','fever']]){
    await page.locator(`button[data-side=${side}]`).click();await page.locator(`[data-character=${id}]`).click();await page.getByRole('button',{name:`${name}と出発する`}).click();await page.getByRole('button',{name:'ラリーをはじめる'}).click();
    await page.evaluate(()=>{window.__scene.match.charge=100;window.__scene.match.serve=20;});await page.locator('[data-action=skill]:not(:disabled)').waitFor();await page.locator('[data-action=skill]').click();await page.locator(`[data-skill="${skill}"]`).waitFor();
    await page.evaluate(()=>window.__game.reset());await page.locator('[data-phase=select]').waitFor();assert.equal(await page.locator('canvas').count(),1);
  }
  report.checks.push('All seven skills activated via real button, reset keeps a single canvas');
  await page.getByRole('button',{name:'アカネと出発する'}).click();await page.getByRole('button',{name:'ラリーをはじめる'}).click();
  // Settings pause the match; swapping only the backdrop must preserve every model field.
  await page.locator('[data-action=settings]').click();await page.locator('.sb-settings').waitFor();
  const modelSnapshot=()=>page.evaluate(()=>JSON.stringify(window.__scene.match));
  const preserved=await modelSnapshot();
  assert.equal(await page.evaluate(()=>window.__scene.backdrop.root.length),3);
  await page.locator('[data-background=still]').click();
  assert.equal(await page.evaluate(()=>window.__scene.backdrop.root.length),1);
  assert.equal(await modelSnapshot(),preserved);
  assert.equal(await page.evaluate(()=>localStorage.getItem('minigames:v1:star-bounce-story:background')),'"still"');
  await page.keyboard.press('Escape');await page.locator('[data-phase=playing]').waitFor();
  const stillTime=await page.evaluate(()=>window.__scene.backdrop.elapsed);await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>window.__scene.backdrop.elapsed),stillTime);
  await page.locator('[data-action=pause]').click();await page.locator('[data-action=settings]').click();
  await page.locator('[data-background=layered]').click();await page.locator('[data-action=close-settings]').click();
  await page.locator('[data-phase=paused]').waitFor();assert.equal(await page.evaluate(()=>window.__scene.game.isPaused),true);
  await page.getByRole('button',{name:'ラリーに戻る'}).click();
  const moving=await page.evaluate(()=>window.__scene.backdrop.middle.tilePositionY);await page.waitForTimeout(150);
  assert.notEqual(await page.evaluate(()=>window.__scene.backdrop.middle.tilePositionY),moving);
  const audio=await page.evaluate(()=>{
    const s=window.__scene,play=s.sound.play,keys=[];s.sound.play=(key)=>{keys.push(key);return true;};
    s.feedback({type:'return',x:240,y:s.match.bottom,points:0});s.feedback({type:'enemy-return',x:240,y:s.match.top,points:0});s.sound.play=play;
    return {keys,muted:s.sound.mute,loaded:['swing-deep-good','swing-deep-dark'].every(k=>s.cache.audio.exists(k))};
  });
  assert.deepEqual(audio,{keys:['swing-deep-dark','swing-deep-good'],muted:true,loaded:true});
  await page.evaluate(()=>{window.__scene.match.serve=20;});await page.waitForTimeout(800);
  report.checks.push('Opponent arenas, 3-layer movement, single-image background, exact state preservation, settings pause/resume, GOOD/DARK swing audio');
  // Compare actual framebuffer pixels with and without the background-only refraction.
  await page.evaluate(()=>{
    const s=window.__scene;s.match.phase='intro';
    s.backdrop.setDarkTrail(Array.from({length:20},(_,i)=>({x:240+i*.7,y:s.match.height*.30+i*.7})),1,true);
  });
  await page.waitForTimeout(100);
  const warped=(await page.locator('canvas').screenshot()).toString('base64');
  assert.equal(await page.evaluate(()=>window.__scene.backdrop.root.postPipelines.length),1);
  await page.evaluate(()=>{window.__scene.backdrop.setDarkTrail([],1,true);});await page.waitForTimeout(100);
  const unwarped=(await page.locator('canvas').screenshot()).toString('base64');
  const difference=await page.evaluate(async([a,b])=>{
    const read=async src=>{const im=new Image();im.src='data:image/png;base64,'+src;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);return {data:g.getImageData(0,0,c.width,c.height).data,w:c.width,h:c.height};};
    const x=await read(a),y=await read(b);let upper=0,lower=0;
    for(let j=Math.floor(x.h*.22);j<x.h*.42;j++)for(let i=Math.floor(x.w*.4);i<x.w*.64;i++)for(let k=0;k<3;k++){upper+=Math.abs(x.data[(j*x.w+i)*4+k]-y.data[(j*x.w+i)*4+k]);const reflected=x.h-1-j;lower+=Math.abs(x.data[(reflected*x.w+i)*4+k]-y.data[(reflected*x.w+i)*4+k]);}
    return {upper,lower};
  },[warped,unwarped]);
  assert.ok(difference.upper>500,'shader visibly refracts the background at the trail');assert.ok(difference.upper>difference.lower*3,'refraction follows the ball, not its vertically mirrored position');
  await page.evaluate(()=>{const s=window.__scene;s.match.phase='playing';s.match.serve=20;s.setBackgroundMode('still');});
  assert.equal(await page.evaluate(()=>window.__scene.backdrop.root.postPipelines.length),0);
  await page.evaluate(()=>window.__scene.setBackgroundMode('layered'));
  await page.locator('[data-action=settings]').click();await page.locator('[data-settings-tab=audio]').click();
  for(const id of ['deep','soft','heavy','short','original']){
    await page.locator(`[data-swing=${id}]`).click();assert.equal(await page.evaluate(()=>window.__scene.swingPreset),id);
    await page.locator('[data-preview=dark]').click();
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem('minigames:v1:star-bounce-story:swing')),'"original"');
  await page.locator('[data-swing=deep]').click();await page.locator('[data-settings-tab=visual]').click();await page.locator('[data-action=close-settings]').click();
  report.checks.push('DARK shader changes pixels at the correct ball coordinates; still mode removes shader; five audible preset choices');
  for(const [id,kind] of ['falcon','fighter','freighter','probe','cruiser'].entries()){
    await page.evaluate(id=>{const m=window.__scene.match;m.serve=0;m.nextTarget=1e9;m.ball={x:35,y:600,vx:0,vy:0,radius:8};m.targets=[window.__flight(id+1)];},id);
    await page.waitForTimeout(180);
    const before=await page.evaluate(()=>{const t=window.__scene.match.targets[0],s=window.__scene.sprites.get(t.id);return {x:t.x,y:t.y,angle:s.rotation,expected:Math.atan2(t.vy,t.vx),key:s.texture.key};});
    assert.ok(Math.abs(before.angle-before.expected)<.001);assert.equal(before.key,kind==='falcon'?'atlas-falcon':'atlas-bonus');
    await page.screenshot({path:path.join(out,`flight-${kind}.png`)});await page.waitForTimeout(150);
    const after=await page.evaluate(()=>window.__scene.match.targets[0]);assert.ok(Math.abs(after.x-before.x)>2);if(after.flight.motion!=='straight')assert.ok(Math.abs(after.y-before.y)>.1);
  }
  report.checks.push('All five ships render and animate, move through distinct paths, and face actual flight velocity');
  await page.evaluate(()=>{const m=window.__scene.match;m.serve=10;m.targets=[{id:1,kind:'freighter',x:140,y:m.height*.4,vx:30},{id:2,kind:'fighter',x:330,y:m.height*.6,vx:-30}];});
  await page.waitForTimeout(200);
  const frameBefore=await page.evaluate(()=>[...window.__scene.sprites.values()].map(s=>s.frame.name));await page.waitForTimeout(260);
  assert.notDeepEqual(await page.evaluate(()=>[...window.__scene.sprites.values()].map(s=>s.frame.name)),frameBefore);
  await page.screenshot({path:path.join(out,'play-bonuses.png')});
  const idleBefore=await page.evaluate(()=>window.__scene.playerArt.anims.currentAnim.key);assert.match(idleBefore,/-idle$/);
  await page.evaluate(()=>window.__scene.react('player','happy'));assert.match(await page.evaluate(()=>window.__scene.playerArt.anims.currentAnim.key),/-happy$/);
  await page.waitForTimeout(900);assert.match(await page.evaluate(()=>window.__scene.playerArt.anims.currentAnim.key),/-idle$/);

  await page.locator('canvas').focus();const oldX=await page.evaluate(()=>window.__scene.match.playerX);await page.keyboard.down('ArrowLeft');await page.waitForTimeout(200);await page.keyboard.up('ArrowLeft');assert.ok(await page.evaluate(()=>window.__scene.match.playerX)<oldX);
  await page.evaluate(()=>{window.__scene.match.charge=100;});await page.locator('canvas').press('Space');await page.locator('[data-skill=fever]').waitFor();
  await page.locator('[data-action=pause]').click();await page.locator('[data-phase=paused]').waitFor();
  const before=await page.evaluate(()=>window.__scene.match.elapsed);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__scene.match.elapsed),before);await page.getByRole('button',{name:'ラリーに戻る'}).click();
  // GameModule container resize and browser fullscreen, separate from viewport resize.
  await page.evaluate(()=>{window.__game.pause();window.__scene.match.score=321;window.__scene.match.hp=4;});
  for(const [width,height] of [[320,568],[560,320],[600,800]]){
    await page.evaluate(([w,h])=>{Object.assign(document.getElementById('app').style,{width:w+'px',height:h+'px'});},[width,height]);await page.waitForTimeout(160);
    const fit=await page.evaluate(()=>{const host=document.getElementById('app').getBoundingClientRect();return [...document.querySelectorAll('.sb-header button,.sb-drag-pad,canvas')].every(e=>{const b=e.getBoundingClientRect();return b.left>=host.left-1&&b.right<=host.right+1&&b.bottom<=host.bottom+1;});});
    assert.ok(fit,'embedded game controls must fit their host');assert.equal(await page.evaluate(()=>window.__scene.match.score),321);assert.equal(await page.evaluate(()=>window.__scene.match.hp),4);
  }
  await page.evaluate(()=>{document.querySelector('[data-action=settings]').addEventListener('click',()=>document.getElementById('app').requestFullscreen(),{once:true});});
  await page.locator('[data-action=settings]').click();await page.waitForFunction(()=>document.fullscreenElement!==null);
  await page.locator('[data-action=close-settings]').click();await page.evaluate(()=>document.exitFullscreen());
  await page.evaluate(()=>{document.getElementById('app').removeAttribute('style');window.__game.resume();});
  report.checks.push('Embedded GameModule container resize and fullscreen retain score/HP and visible controls');
  await page.evaluate(()=>{const s=window.__scene;s.feedback({type:'return',x:240,y:s.match.bottom,points:10});window.__game.reset();});
  await page.waitForTimeout(800);await page.locator('[data-phase=select]').waitFor();
  await page.evaluate(()=>window.__game.destroy());assert.equal(await page.locator('canvas').count(),0);assert.equal(await page.locator('.sb-shell').count(),0);await ctx.close();
  report.checks.push('Keyboard movement/skill, animated bonus render, physics pause, destroy cleanup');

  const checkFit=async(p,size)=>{
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight),'page must never scroll');
    for(const b of await p.locator('button:visible').all()) {const box=await b.boundingBox();assert.ok(box.x>=-1&&box.y>=-1&&box.x+box.width<=size.width+1&&box.y+box.height<=size.height+1,'all buttons stay within viewport');}
  };
  for(const size of [{width:390,height:844},{width:375,height:667},{width:320,height:568},{width:844,height:390},{width:568,height:320},{width:1000,height:920}]){
    console.log('Checking mobile viewport',size);
    const mobile=await browser.newContext({viewport:size,isMobile:true,hasTouch:true,deviceScaleFactor:2}),p=await mobile.newPage();p.on('pageerror',e=>report.errors.push(e.message));
    diagnosticPage=p;await harness(p);await p.goto(`${base}/__story.html`);await p.locator('[data-phase=select]').waitFor();await p.waitForTimeout(100);await checkFit(p,size);
    assert.equal(await p.locator('[data-character=lumi]').count(),0);
    await p.screenshot({path:path.join(out,`mobile-select-${size.width}.png`)});
    await p.getByRole('button',{name:'ポポと出発する'}).tap();await p.waitForTimeout(100);await checkFit(p,size);
    await p.getByRole('button',{name:'ラリーをはじめる'}).tap();await p.locator('[data-phase=playing]').waitFor();await p.waitForTimeout(150);await checkFit(p,size);
    await p.locator('[data-action=settings]').tap();await checkFit(p,size);
    await p.locator('[data-settings-tab=audio]').tap();await checkFit(p,size);
    assert.ok(await p.locator('.sb-settings').evaluate(e=>e.scrollHeight<=e.clientHeight+1),'settings must fit without internal scrolling');
    await p.locator('[data-settings-tab=visual]').tap();await p.locator('[data-background=still]').tap();await p.locator('[data-action=close-settings]').tap();
    const canvas=await p.locator('canvas').boundingBox(),controls=await p.locator('.sb-controls').boundingBox(),pad=await p.locator('.sb-drag-pad').boundingBox();
    assert.ok(canvas.height>canvas.width*1.4,'court stays portrait even in landscape');assert.ok(controls.y+controls.height<=size.height+1);
    assert.ok(pad.y>=canvas.y+canvas.height-1||pad.x>=canvas.x+canvas.width,'finger area is outside the court');
    await p.evaluate(()=>{window.__scene.match.serve=30;});
    const cdp=await mobile.newCDPSession(p),x=pad.x+pad.width*.5,y=pad.y+pad.height*.5;
    const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
    const oldX=await p.evaluate(()=>window.__scene.match.playerX);
    await touch('touchStart',[{x,y,id:1}]);assert.equal(await p.evaluate(()=>window.__scene.match.playerX),oldX,'touching pad must not jump the bar');
    await touch('touchMove',[{x:x+pad.width*.2,y,id:1}]);await p.waitForTimeout(50);assert.ok(await p.evaluate(()=>window.__scene.match.playerX)>oldX+60,'drag moves bar relatively');
    await touch('touchCancel',[]);const released=await p.evaluate(()=>window.__scene.match.playerX);
    await touch('touchStart',[{x,y,id:2}]);await touch('touchMove',[{x:x-pad.width*.2,y,id:2}]);await touch('touchEnd',[]);await p.waitForTimeout(50);assert.ok(await p.evaluate(()=>window.__scene.match.playerX)<released-60,'cancel releases pointer for next drag');
    assert.equal(await p.locator('[data-action=left],[data-action=right],.sb-control-buttons').count(),0);
    const dock=await p.locator('.sb-skill-dock').boundingBox(),meter=await p.locator('.sb-skill-meter').boundingBox();
    assert.ok(dock.x>=canvas.x&&dock.x+dock.width<=canvas.x+canvas.width+1);assert.ok(meter.height>meter.width*3);
    await p.evaluate(()=>{window.__scene.match.charge=100;window.__touchLog=[];for(const type of ['pointerdown','pointerup','pointercancel','click','touchstart','touchend'])document.addEventListener(type,e=>window.__touchLog.push({type,target:e.target.tagName,action:e.target.dataset?.action,prevented:e.defaultPrevented}),true);});await p.locator('[data-action=skill]:not(:disabled)').waitFor();
    const skillBox=await p.locator('[data-action=skill]').boundingBox(),skillPoint={x:skillBox.x+skillBox.width/2,y:skillBox.y+skillBox.height/2,id:4};
    await touch('touchStart',[skillPoint]);await touch('touchCancel',[]);assert.equal(await p.evaluate(()=>window.__scene.match.skill),null,'cancel must not activate');
    await touch('touchStart',[skillPoint]);await touch('touchMove',[{...skillPoint,x:skillBox.x-30}]);await touch('touchEnd',[]);assert.equal(await p.evaluate(()=>window.__scene.match.skill),null,'release outside must not activate');
    // Reproduce browsers that deliver touch pointerup without a compatibility click.
    await p.evaluate(()=>{window.__blockSkillClick=e=>{if(e.target.closest('[data-action=skill]')){e.preventDefault();e.stopImmediatePropagation();}};document.addEventListener('click',window.__blockSkillClick,true);const match=window.__scene.match,activate=match.activate.bind(match);window.__skillActivations=0;match.activate=()=>{const activated=activate();if(activated)window.__skillActivations++;return activated;};});
    await p.locator('[data-action=skill]').tap();
    await p.evaluate(()=>document.removeEventListener('click',window.__blockSkillClick,true));
    assert.equal(await p.evaluate(()=>window.__skillActivations),1,'touch release must activate exactly once without a click');
    await p.locator('[data-skill=wide]').waitFor();console.log('PASS mobile skill release/cancel/outside without compatibility click',size);
    assert.equal(await p.locator('.sb-skill-meter').getAttribute('aria-valuenow'),'0');
    await p.screenshot({path:path.join(out,`mobile-play-${size.width}.png`)});
    await p.locator('[data-action=pause]').tap();await p.waitForTimeout(50);await checkFit(p,size);
    const pausedX=await p.evaluate(()=>window.__scene.match.playerX);await touch('touchStart',[{x,y,id:3}]);await touch('touchMove',[{x:x+30,y,id:3}]);await touch('touchEnd',[]);assert.equal(await p.evaluate(()=>window.__scene.match.playerX),pausedX);
    await p.getByRole('button',{name:'ラリーに戻る'}).tap();
    // Rotate/resize an active game, keeping controls, model and rendering aligned.
    const rotated={width:size.height,height:size.width};await p.setViewportSize(rotated);await p.waitForTimeout(200);await checkFit(p,rotated);
    const rotatedCanvas=await p.locator('canvas').boundingBox();assert.ok(rotatedCanvas.height>rotatedCanvas.width*1.4);
    assert.ok(Math.abs(await p.evaluate(()=>window.__scene.match.height)-rotatedCanvas.height/rotatedCanvas.width*480)<2);
    await mobile.close();
  }
  report.checks.push('Six desktop/mobile sizes plus rotation; portrait court, no page scroll, visible actions, separate drag pad, touch cancel, pause');
  const saved=await browser.newPage();await saved.goto(`${base}/`);await saved.locator('[data-phase=select]').waitFor();
  await saved.locator('[data-action=settings]').click();await saved.locator('[data-background=still]').click();await saved.reload();await saved.locator('[data-phase=select]').waitFor();
  assert.equal(await saved.locator('.sb-shell').getAttribute('data-background'),'still');await saved.close();report.checks.push('Background preference survives reload');
  const fallback=await browser.newContext();await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:original.call(this,type,...args);};});const f=await fallback.newPage();await f.goto(`${base}/`);await f.locator('[data-phase=select]').waitFor();await f.locator('button[data-side=DARK]').click();await f.getByRole('button',{name:'クロと出発する'}).click();await f.getByRole('button',{name:'ラリーをはじめる'}).click();assert.equal(await f.locator('canvas').evaluate(c=>!!c.getContext('2d')),true);await fallback.close();report.checks.push('Canvas fallback');
  assert.deepEqual(report.errors,[]);console.log('PASS',report.checks.join('\nPASS '));
}catch(error){if(diagnosticPage&&!diagnosticPage.isClosed()){report.input=await diagnosticPage.evaluate(()=>({viewport:{width:innerWidth,height:innerHeight},phase:document.querySelector('.sb-shell')?.dataset.phase,skill:window.__scene?.match?.skill,charge:window.__scene?.match?.charge,paused:window.__scene?.game.isPaused,events:window.__touchLog})).catch(()=>null);await diagnosticPage.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error('Input state:',report.input);}report.errors.push(error.stack);console.error(error);process.exitCode=1;}
finally{await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();server.close();}

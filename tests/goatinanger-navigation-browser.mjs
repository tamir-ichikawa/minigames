import {serve} from '../scripts/serve.mjs';
import path from 'node:path';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const executablePath=process.env.CHROME_PATH||(existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined);
const server=await serve({root:path.resolve('dist'),port:0,base:'/minigames'});
const gameURL=`http://127.0.0.1:${server.address().port}/minigames/sample_game/GOATinAnger/index.html`;
const browser=await chromium.launch({executablePath,headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(gameURL);
 await page.waitForFunction(()=>window.clover?.game.scene.getScene('Field')?.player);
 const results=await page.evaluate(()=>{
  const s=clover.game.scene.getScene('Field');s.startOrResume();s.nextWaveAt=Infinity;s.nextSpawnAt=Infinity;s.lastShot=Infinity;s.invulnerableUntil=Infinity;
  const results=[];
  const cases=[
    {name:'top edge entry',wave:3,enemy:[270,-16],player:[270,180]},
    {name:'bridge crate entry',wave:2,enemy:[450,1620],player:[270,2030]},
    {name:'forest crate entry',wave:1,enemy:[85,2370],player:[270,2750]},
    {name:'forest sandbag entry',wave:1,enemy:[175,2470],player:[270,2800]},
    {name:'outpost sandbag entry',wave:3,enemy:[425,420],player:[270,850]},
    {name:'outpost crate entry',wave:3,enemy:[435,670],player:[270,1040]},
    {name:'cover blocks firing position',wave:1,enemy:[175,2490],player:[175,2700],entering:false},
  ];
  for(const c of cases){
    for(const e of s.enemies)e.destroy();s.enemies=[];
    s.wave=c.wave;s.clearedSector=0;s.updateTravelBounds();s.player.body.reset(...c.player);
    const enemy=s.makeActor(...c.enemy,'fox1',false);s.enemyGroup.add(enemy);enemy.body.setSize(24,32).setOffset(-12,-30).setCollideWorldBounds(false);
    Object.assign(enemy,{entering:c.entering??true,entryEndY:c.enemy[1]+180,speed:64,strafe:1,nextShot:Infinity,hp:99});s.enemies.push(enemy);
    let firstStepY;
    for(let i=0;i<1000;i++){s.update(0,1000/60);s.physics.world.singleStep();if(i===0)firstStepY=enemy.y;}
    results.push({name:c.name,firstStepDistance:Math.abs(firstStepY-c.enemy[1]),x:enemy.x,y:enemy.y,entering:enemy.entering,distance:Math.hypot(enemy.x-s.player.x,enemy.y-s.player.y),clear:s.navigation.shotClear({x:enemy.x,y:enemy.y-26},{x:s.player.x,y:s.player.y-26})});
  }
  for(const e of s.enemies)e.destroy();s.enemies=[];s.wave=0;s.updateTravelBounds();s.player.body.reset(270,2660);
  return results;
 });
 for(const result of results){
   assert.ok(result.firstStepDistance<4,result.name+' jumped into the world');
   assert.equal(result.entering,false,result.name+' remained trapped in entry');
   assert.ok(result.distance<235,result.name+' did not reach firing distance');
   assert.ok(result.clear,result.name+' stopped behind cover');
 }
 console.log('PASS: '+results.map(r=>r.name).join(', '));
 const firing=await page.evaluate(()=>{
   const s=clover.game.scene.getScene('Field');s.lastShot=-1000;
   const shots=[],original=s.fire;s.fire=function(actor,angle,hostile){if(!hostile)shots.push(angle);return original.call(this,actor,angle,hostile);};
   const step=n=>{for(let i=0;i<n;i++){s.update(0,1000/60);s.physics.world.singleStep();}};
   const before={x:s.player.x,y:s.player.y};step(40);const idle=shots.length;
   s.keys.fire.isDown=true;step(40);const initial=shots.length,stationary={x:s.player.x,y:s.player.y};
   s.keys.fire.isDown=false;shots.length=0;s.keys.right.isDown=true;step(12);const movementShots=shots.length;
   s.keys.right.isDown=false;s.keys.fire.isDown=true;
   const released={x:s.player.x,y:s.player.y};shots.length=0;step(40);
   const after={x:s.player.x,y:s.player.y},angles=[...shots];
   s.keys.fire.isDown=false;shots.length=0;step(40);const stopped=shots.length;
   s.togglePause();s.keys.fire.isDown=true;step(40);const paused=shots.length;s.resume();s.fire=original;
   return {before,stationary,idle,initial,movementShots,released,after,angles,stopped,paused};
 });
 assert.equal(firing.idle,0);assert.equal(firing.movementShots,0);assert.equal(firing.stopped,0);
 assert.deepEqual(firing.before,firing.stationary);assert.ok(firing.initial>=3);
 assert.deepEqual(firing.released,firing.after);assert.ok(firing.angles.length>=3);assert.ok(firing.angles.every(a=>a===0));assert.equal(firing.paused,0);
 console.log('PASS: independent keyboard movement/fire, stationary fire, release and pause stop fire');
 const cdp=await page.context().newCDPSession(page);
 const point=async(selector,id)=>{const r=await page.locator(selector).boundingBox();return {x:r.x+r.width/2,y:r.y+r.height/2,id};};
 const right=await point('[data-move="right"]',1),fire=await point('#touch-fire',2);
 // Rendering on CI can advance less game time than the same wall-clock delay.
 const advance=async milliseconds=>{const start=await page.evaluate(()=>clover.game.scene.getScene('Field').clock);await page.waitForFunction(({start,milliseconds})=>clover.game.scene.getScene('Field').clock>=start+milliseconds,{start,milliseconds},{timeout:10000});};
 const state=()=>page.evaluate(()=>{const s=clover.game.scene.getScene('Field');return {x:s.player.x,y:s.player.y,v:s.player.body.velocity.length(),facing:s.facing,lastShot:s.lastShot};});
 assert.equal(await page.locator('[data-move]').count(),4);
 assert.ok(await page.locator('#touch-fire').isVisible());
 const before=await state();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[right]});await advance(180);
 const moveOnly=await state();assert.ok(moveOnly.x>before.x);assert.equal(moveOnly.lastShot,before.lastShot,'movement fired a bullet');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[right,fire]});await advance(220);
 const both=await state();assert.ok(both.x>moveOnly.x);assert.ok(both.lastShot>moveOnly.lastShot);
 await page.screenshot({path:'.test-output/goatinanger/two-touch-controls.png'});
 // Chrome's partial touchEnd lists the finger being lifted.
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[right]});await advance(80);
 const fireOnly=await state();await advance(650);const standing=await state();
 assert.equal(standing.v,0);assert.equal(standing.x,fireOnly.x);assert.equal(standing.y,fireOnly.y);assert.ok(standing.lastShot>fireOnly.lastShot);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await advance(80);
 const released=await state();await advance(250);assert.equal((await state()).lastShot,released.lastShot);
 // Cancelling both fingers and pausing while held cannot leave stuck inputs.
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[right,fire]});await advance(60);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await advance(80);
 const cancelled=await state();await advance(250);assert.equal((await state()).v,0);assert.equal((await state()).lastShot,cancelled.lastShot);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[right,fire]});await advance(60);
 await page.evaluate(()=>clover.game.scene.getScene('Field').togglePause());
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.evaluate(()=>clover.game.scene.getScene('Field').resume());await advance(80);
 const resumed=await state();await advance(250);assert.equal((await state()).v,0);assert.equal((await state()).lastShot,resumed.lastShot);
 // A single tap fires while standing, with no held movement required.
 await page.locator('#touch-fire').tap();await advance(80);assert.ok((await state()).lastShot>resumed.lastShot);assert.equal((await state()).v,0);
 assert.deepEqual(errors,[]);console.log('PASS: mobile four-way pad, two-finger move/fire, independent release, tap, cancellation and pause');
}finally{await browser.close();server.close();}

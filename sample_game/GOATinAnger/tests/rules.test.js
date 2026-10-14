import test from 'node:test';
import assert from 'node:assert/strict';
import { movementVector, withinRange, BULLET_RANGE, WAVES, UNITS } from '../src/rules.js';
test('diagonal movement does not exceed cardinal movement speed',()=>{
 const v=movementVector(false,true,true,false,205);
 assert.ok(Math.abs(Math.hypot(v.x,v.y)-205)<1e-8);
 assert.ok(v.x>0&&v.y<0);
});
test('opposing directions cancel and releasing movement stops the player',()=>{
 assert.deepEqual(movementVector(true,true,true,true,200),{x:0,y:0});
 assert.deepEqual(movementVector(false,false,false,false,200),{x:0,y:0});
});
test('bullets expire at their range from the muzzle, in every direction',()=>{
 assert.equal(withinRange(419,200,100,200,BULLET_RANGE),true);
 assert.equal(withinRange(420,200,100,200,BULLET_RANGE),false);
 assert.equal(withinRange(100,-120,100,200,BULLET_RANGE),false);
 assert.equal(withinRange(100+320/Math.sqrt(2)+.01,200+320/Math.sqrt(2),100,200,BULLET_RANGE),false);
});
test('all four units have playable values and the mission has three waves',()=>{
 assert.equal(Object.keys(UNITS).length,4);
 for(const unit of Object.values(UNITS)){assert.ok(unit.speed>0);assert.ok(unit.health>=4);assert.ok(unit.fireRate>=100);}
 assert.deepEqual(WAVES,[6,8,10]);
});

test('portrait battlefield and northern entry lanes remain deterministic', async()=>{
 const {VIEW,WORLD,reinforcementPosition,reinforcementDelay}=await import('../src/rules.js');
 assert.equal(VIEW.width/VIEW.height,9/16);
 assert.equal(WORLD.height,VIEW.height*3);
 for(let wave=1;wave<=3;wave++){
  assert.ok(reinforcementDelay(wave)>=1300);
  const positions=Array.from({length:WAVES[wave-1]},(_,i)=>reinforcementPosition(i,wave));
  assert.ok(positions.every(p=>p.y<0&&p.x>30&&p.x<WORLD.width-30));
  assert.equal(new Set(positions.map(p=>p.x)).size,5);
 }
});

test('all eight aim directions use their matching art with mirrored left diagonals', async()=>{
 const {directionFromAngle}=await import('../src/rules.js');
 const expected=['right','down-right','down','down-left','left','up-left','up','up-right'];
 expected.forEach((name,i)=>assert.equal(directionFromAngle(i*Math.PI/4).name,name));
 assert.equal(directionFromAngle(-Math.PI/4).sheet,'up-right');
 assert.equal(directionFromAngle(-3*Math.PI/4).flip,true);
 assert.equal(directionFromAngle(3*Math.PI/4).sheet,'down-right');
});
test('camera is clamped and the next sector requires both kills and travel', async()=>{
 const {cameraTopFor,canEnterNextSector}=await import('../src/rules.js');
 assert.equal(cameraTopFor(3000),1920);assert.equal(cameraTopFor(100),0);
 assert.ok(cameraTopFor(2000)<cameraTopFor(2600));
 assert.equal(canEnterNextSector(1,0,1900),false);
 assert.equal(canEnterNextSector(1,1,2200),false);
 assert.equal(canEnterNextSector(1,1,1900),true);
 assert.equal(canEnterNextSector(2,2,900),true);
 assert.equal(canEnterNextSector(3,3,100),false);
});

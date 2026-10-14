import test from 'node:test';
import assert from 'node:assert/strict';
import {createNavigation} from '../src/navigation.js';

test('foot-position routes clear the entire body around a crate',()=>{
 const nav=createNavigation([{left:438,right:482,top:1670,bottom:1710}],540,2880);
 const start={x:450,y:1620},goal={x:450,y:1950},route=nav.route(start,goal);
 assert.ok(route.length>1,'route must go around cover');
 let previous=start;for(const p of route){assert.ok(nav.free(p));assert.ok(nav.segmentClear(previous,p));previous=p;}
 assert.ok(Math.hypot(previous.x-goal.x,previous.y-goal.y)<25);
 assert.equal(nav.segmentClear(start,goal),false);
 assert.equal(nav.free({x:450,y:1730}),false,'head and torso still overlap crate below it');
 assert.equal(nav.free(nav.safePosition({x:450,y:1690})),true);
});
test('routes navigate around offset barriers and report disconnected areas',()=>{
 const nav=createNavigation([{left:20,right:350,top:300,bottom:330},{left:190,right:520,top:600,bottom:630}],540,960);
 let previous={x:270,y:180};const route=nav.route(previous,{x:270,y:800});
 assert.ok(route.length>=3);for(const p of route){assert.ok(nav.segmentClear(previous,p));previous=p;}
 const closed=createNavigation([{left:0,right:540,top:300,bottom:340}],540,960);
 assert.deepEqual(closed.route({x:270,y:180},{x:270,y:800}),[]);
});
test('entry above the viewport can route into the map and shots respect cover',()=>{
 const nav=createNavigation([{left:60,right:104,top:180,bottom:220}],540,960);
 assert.ok(nav.route({x:90,y:-16},{x:270,y:500}).length);
 assert.equal(nav.shotClear({x:80,y:150},{x:80,y:250}),false);
 assert.equal(nav.shotClear({x:140,y:150},{x:140,y:250}),true);
});

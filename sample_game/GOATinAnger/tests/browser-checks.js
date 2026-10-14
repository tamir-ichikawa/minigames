import { animateActor } from '../src/sprites.js';
import { EXTRACTION, SECTORS, cameraTopFor } from '../src/rules.js';
// Visit /?qa during development to exercise the real Phaser scene and physics.
export async function runBrowserChecks(game) {
  const report = document.createElement('pre');
  report.id = 'qa-report';
  Object.assign(report.style, { position: 'fixed', inset: '12px', zIndex: 999, background: '#eff3df', color: '#253d29', padding: '24px', overflow: 'auto', font: '14px/1.8 monospace', whiteSpace: 'pre-wrap' });
  report.textContent = 'Running Phaser integration checks…'; document.body.append(report);
  let scene;
  for(let i=0;i<300;i++) {
    scene=game.scene.getScene('Field');
    if(scene?.player)break;
    await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  const results=[];
  const check=(name,fn)=>{fn();results.push(`PASS ${name}`);};
  const assert=(ok,message)=>{if(!ok)throw new Error(message);};
  try {
    check('all ten characters render eight facings with changing hurt and death frames',()=>{
      for(const key of ['goat-leader','goat-scout','goat-medic','goat-rifleman','fox1','fox2','fox3','fox4','fox5','fox6']){
        const actor=scene.makeActor(270,2500,key,key.startsWith('goat'));
        for(let direction=0;direction<8;direction++){
          actor.facing=direction*Math.PI/4;actor.dead=false;actor.hurtUntil=1000;actor.action=null;
          animateActor(actor,0,0);const hurt1=actor.art.frame.name;
          animateActor(actor,0,100);assert(actor.art.frame.name!==hurt1,'hurt pose did not advance '+key);
          actor.dead=true;animateActor(actor,0,200);const down1=actor.art.frame.name;
          animateActor(actor,0,800);const final=actor.art.frame.name;
          assert(final!==down1,'death pose did not advance '+key);
          animateActor(actor,0,1300);assert(actor.art.frame.name===final,'death did not hold '+key);
          assert(actor.art.texture.key.includes('packed'),'missing directional texture '+key);
        }
        actor.destroy();
      }
    });
    check('start mission and select initial health',()=>{scene.startOrResume();assert(scene.state==='playing'&&scene.health===5,'mission failed to start');});
    check('keyboard movement updates the real physics body',()=>{
      const x=scene.player.x;scene.keys.right.isDown=true;
      scene.update(0,16);scene.physics.world.singleStep();
      scene.keys.right.isDown=false;
      assert(scene.player.x>x,'player did not move');
    });
    check('separate fire input shoots along the movement direction',()=>{
      for(const [key,angle] of [['up',-Math.PI/2],['right',0],['down',Math.PI/2],['left',Math.PI]]){
        scene.resetInput();scene.lastShot=-1000;scene.keys[key].isDown=true;scene.keys.fire.isDown=true;scene.update(0,16);
        const bullet=scene.projectiles.at(-1),v=scene.player.body.velocity;
        assert(bullet&&!bullet.hostile,'direction did not shoot');
        assert(Math.abs(v.x*bullet.body.velocity.y-v.y*bullet.body.velocity.x)<.001,'movement and bullet differ');
        assert(Math.cos(angle)*v.x+Math.sin(angle)*v.y>0,'wrong movement heading');
      }
      scene.resetInput();scene.keys.up.isDown=true;scene.keys.right.isDown=true;scene.keys.fire.isDown=true;scene.lastShot=-1000;scene.update(0,16);
      assert(scene.player.direction==='up-right','diagonal facing failed');scene.resetInput();
    });
    check('scroll follows northward travel and uncleared checkpoint blocks escape',()=>{
      scene.player.body.reset(270,2280);scene.update(0,16);
      assert(scene.cameras.main.scrollY===cameraTopFor(2280),'camera did not follow');
      scene.player.body.reset(270,2082);scene.keys.up.isDown=true;
      for(let i=0;i<40;i++){scene.update(0,16);scene.physics.world.singleStep();}
      assert(scene.player.y>=SECTORS[0].gate+29,'uncleared gate was crossed');
      scene.resetInput();scene.player.body.reset(270,2660);scene.update(0,16);
    });
    check('space fires and projectiles expire at 320 px',()=>{
      scene.keys.fire.isDown=true;scene.update(0,16);scene.keys.fire.isDown=false;
      const bullet=scene.projectiles.find(b=>!b.hostile);assert(bullet,'no player bullet');
      bullet.setPosition(bullet.spawnX+320.01,bullet.spawnY);scene.update(0,16);
      assert(!bullet.active,'bullet exceeded range');
    });
    check('enemy bullet collision damages player without destroying player',()=>{
      scene.invulnerableUntil=0;const hp=scene.health;scene.fire(scene.player,0,true);
      const bullet=scene.projectiles.at(-1);bullet.body.reset(scene.player.x,scene.player.y-20);bullet.body.setVelocity(0);
      scene.physics.world.singleStep();
      assert(scene.health===hp-1,'enemy bullet did not damage player '+JSON.stringify({p: {x:scene.player.body.x,y:scene.player.body.y,w:scene.player.body.width,h:scene.player.body.height},b:bullet.body?{x:bullet.body.x,y:bullet.body.y,w:bullet.body.width,h:bullet.body.height}:null,hp:scene.health,clock:scene.clock,paused:scene.physics.world.isPaused}));
      assert(scene.player.active&&scene.player.body,'player body was removed');
      assert(!bullet.active,'enemy bullet was not consumed');
    });
    check('damage cooldown prevents repeated contact damage',()=>{const hp=scene.health;scene.hurtPlayer();assert(scene.health===hp,'invulnerability did not hold');});
    check('cover consumes incoming bullets',()=>{
      scene.fire(scene.player,0);const bullet=scene.projectiles.at(-1);const cover=scene.obstacles.getChildren().at(-1);
      bullet.body.reset(cover.x,cover.y);bullet.body.setVelocity(1,0);scene.physics.world.singleStep();
      assert(!bullet.active,'bullet went through cover');
    });
    check('pause freezes simulation and resume restores it',()=>{
      scene.togglePause();const clock=scene.clock;scene.update(0,50);
      assert(scene.state==='paused'&&scene.clock===clock&&scene.physics.world.isPaused,'pause failed');
      scene.startOrResume();assert(scene.state==='playing'&&!scene.physics.world.isPaused,'resume failed');
    });
    check('real bullet collision defeats fox and increases score',()=>{
      scene.spawnWave();const enemy=scene.enemies[0];enemy.body.reset(270,2300);enemy.entering=false;enemy.hp=1;const before=scene.enemies.length;
      scene.fire(scene.player,0);const bullet=scene.projectiles.at(-1);bullet.body.reset(enemy.x,enemy.y-20);bullet.body.setVelocity(0);
      scene.physics.world.singleStep();
      assert(scene.enemies.length===before-1&&scene.score===100,'fox collision did not score');
    });
    check('reinforcements arrive separately from above and pending enemies block wave completion',()=>{
      assert(scene.pendingSpawns.length===5&&scene.nextWaveAt===Infinity,'wave ended while reinforcements were pending');
      const pending=scene.pendingSpawns.length;
      scene.clock=scene.nextSpawnAt-100;scene.update(0,16);
      assert(scene.pendingSpawns.length===pending,'reinforcement arrived early');
      scene.clock=scene.nextSpawnAt;scene.update(0,16);
      const enemy=scene.enemies.at(-1);
      assert(scene.pendingSpawns.length===pending-1&&enemy.y<scene.cameras.main.scrollY&&enemy.body.velocity.y>0,'enemy did not descend from above');
      const spawnAt=scene.nextSpawnAt;scene.togglePause();scene.update(0,5000);
      assert(scene.nextSpawnAt===spawnAt&&scene.pendingSpawns.length===pending-1,'pause advanced reinforcements');scene.resume();
    });
    check('all three staggered waves advance to extraction after exactly 24 kills',()=>{
      const defeatAll=()=>{
        while(scene.pendingSpawns.length)scene.spawnReinforcement();
        for(const enemy of [...scene.enemies]){enemy.hp=1;scene.fire(scene.player,0);scene.hitEnemy(scene.projectiles.at(-1),enemy);}
      };
      defeatAll();assert(scene.clearedSector===1,'sector1 was not cleared');
      scene.update(0,50);assert(scene.wave===1,'next wave started without travel');
      scene.player.body.reset(270,SECTORS[0].top+50);scene.update(0,16);assert(scene.wave===2&&scene.enemies.length===1&&scene.pendingSpawns.length===7,'wave 2 failed');
      scene.physics.world.singleStep();assert(scene.player.y>1900,'sector transition teleported player');
      defeatAll();scene.player.body.reset(270,SECTORS[1].top+50);scene.update(0,16);assert(scene.wave===3&&scene.enemies.length===1&&scene.pendingSpawns.length===9,'wave 3 failed');
      defeatAll();assert(scene.kills===24&&scene.state==='playing','final objective failed');
    });
    check('extraction completes mission and replay resets all state',()=>{
      scene.player.body.reset(EXTRACTION.x+EXTRACTION.width/2,EXTRACTION.y+EXTRACTION.height/2);scene.update(0,16);assert(scene.state==='won','extraction failed');
      scene.startOrResume();assert(scene.state==='playing'&&scene.wave===0&&scene.score===0&&scene.enemies.length===0&&scene.projectiles.length===0&&scene.pendingSpawns.length===0&&scene.fallen.length===0&&scene.health===5,'replay failed');
    });
    check('zero health shows defeat and allows restart',()=>{
      scene.health=1;scene.invulnerableUntil=0;scene.hurtPlayer();assert(scene.state==='lost','defeat failed');
      scene.startOrResume();assert(scene.state==='playing'&&scene.health===5,'restart after defeat failed');scene.togglePause();
    });
    report.textContent=`${results.length} / ${results.length} PHASER CHECKS PASSED\n\n${results.join('\n')}\n\nOpen / to play the normal game.`;
    report.dataset.result='passed';
  }catch(error){report.textContent=`${results.join('\n')}\nFAIL ${error.stack}`;report.dataset.result='failed';scene?.physics.pause();if(scene)scene.state='paused';}
}

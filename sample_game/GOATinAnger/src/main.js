import Phaser from 'phaser';
import './style.css';
import { createNavigation } from './navigation.js';
import { installActionFrames, animateActor, FACINGS } from './sprites.js';
import { WORLD, VIEW, SECTORS, cameraTopFor, canEnterNextSector, PLAYER_START, EXTRACTION, reinforcementDelay, reinforcementPosition, BULLET_RANGE, WAVES, UNITS, movementVector, withinRange, padScore } from './rules.js';

const $ = (id) => document.getElementById(id);
const assetUrl = name => new URL(`./assets/${name}`, document.baseURI).href;
const embedded = window.parent !== window && new URLSearchParams(location.search).has('minigame');
if (embedded) document.documentElement.classList.add('embedded');
let selectedUnit = 'leader';
let scene;
let soundEnabled = false;
let audioContext;
const touch = { up: false, down: false, left: false, right: false, fire: false };

function sound(kind) {
  if (!soundEnabled) return;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    const osc = audioContext.createOscillator(), gain = audioContext.createGain();
    const now = audioContext.currentTime;
    osc.type = kind === 'shot' ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(kind === 'shot' ? 185 : kind === 'hit' ? 95 : 550, now);
    osc.frequency.exponentialRampToValueAtTime(kind === 'shot' ? 65 : kind === 'hit' ? 35 : 850, now + .09);
    gain.gain.setValueAtTime(kind === 'shot' ? .025 : .065, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + .12);
    osc.connect(gain); gain.connect(audioContext.destination); osc.start(now); osc.stop(now + .13);
  } catch { soundEnabled = false; }
}

class FieldScene extends Phaser.Scene {
  constructor() { super('Field'); }
  preload() {
    for(const faction of ['goat','fox'])for(const facing of FACINGS)this.load.image(`${faction}-${facing}`,assetUrl(`${faction}-${facing}-v2.png`));
    this.load.on('loaderror', () => { $('overlay-description').textContent = '素材の読み込みに失敗しました。ページを再読み込みしてください。'; });
  }
  create() {
    scene = this;
    installActionFrames(this);
    this.animationClock = 0; this.pendingSpawns = []; this.nextSpawnAt = Infinity; this.fallen = [];
    this.state = 'ready'; this.clock = 0; this.score = 0; this.wave = 0; this.clearedSector=0;
    this.facing = -Math.PI / 2; this.lastShot = -1000; this.invulnerableUntil = 0;
    this.enemies = []; this.projectiles = []; this.pickups = []; this.kills = 0; this.effects = this.add.group();
    this.nextWaveAt = Infinity; this.fireQueued = false;
    this.rng = new Phaser.Math.RandomDataGenerator(['clover-green-hollow']);
    this.physics.world.setBounds(20, 90, WORLD.width - 40, WORLD.height - 110);
    this.obstacles = this.physics.add.staticGroup();
    this.drawMap();
    this.navigation=createNavigation(this.obstacles.getChildren().map(({body:b})=>({left:b.left,right:b.right,top:b.top,bottom:b.bottom})),WORLD.width,WORLD.height);
    this.makeBulletTextures();
    this.playerBullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.enemyGroup = this.physics.add.group();
    this.player = this.makeActor(PLAYER_START.x, PLAYER_START.y, `goat-${selectedUnit}`, true);
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.enemyGroup, this.obstacles);
    // Enemies share narrow passages without pinning one another against cover.
    this.physics.add.overlap(this.playerBullets, this.enemyGroup, (bullet, enemy) => this.hitEnemy(bullet, enemy));
    this.physics.add.overlap(this.player, this.enemyBullets, (_player, bullet) => { this.removeBullet(bullet); this.hurtPlayer(); });
    this.physics.add.overlap(this.player, this.enemyGroup, () => this.hurtPlayer());
    this.physics.add.collider(this.playerBullets, this.obstacles, (bullet) => { this.spark(bullet.x, bullet.y, 0xf9e2a6); this.removeBullet(bullet); });
    this.physics.add.collider(this.enemyBullets, this.obstacles, (bullet) => { this.spark(bullet.x, bullet.y, 0xdca87b); this.removeBullet(bullet); });
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.updateTravelBounds();
    this.cameras.main.setScroll(0,cameraTopFor(this.player.y));
    this.aimGraphics = this.add.graphics().setDepth(WORLD.height+500);
    this.keys = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D', fire: 'SPACE', pause: 'P', enter: 'ENTER', restart: 'R' });
    this.arrows = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-ESC', () => { if (this.state === 'playing') this.togglePause(); });
    this.input.keyboard.on('keydown-ENTER', () => { if (this.state !== 'playing') this.startOrResume(); });
    this.input.keyboard.on('keydown-R', () => { if (['won', 'lost'].includes(this.state)) this.startOrResume(); });

    this.input.mouse.disableContextMenu();
    this.input.keyboard.on('keydown-SPACE',()=>{if(this.state==='playing')this.fireQueued=true;});
    this.health = UNITS[selectedUnit].health; this.maxHealth = this.health;
    this.updateHud();
    $('start-button').innerHTML='作戦を開始 <span>↗</span>';
    $('start-button').disabled = false;
    document.querySelectorAll('.unit-choice').forEach(button=>button.disabled=false);
    this.game.canvas.setAttribute('aria-label', 'クローバー小隊。方向パッドで移動、射撃ボタンを押している間だけ連射。キーボードはWASDまたは矢印で移動、スペースで射撃。');
    this.game.canvas.setAttribute('role', 'img');
    this.physics.pause();
  }
  makeBulletTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xe4b24f, .25).fillRoundedRect(0, 0, 20, 10, 5);
    g.fillStyle(0xffedb0).fillRoundedRect(2, 3, 15, 4, 2); g.generateTexture('bullet', 20, 10); g.clear();
    g.fillStyle(0xed8756, .25).fillCircle(7, 7, 7); g.fillStyle(0xffad77).fillCircle(7, 7, 4);
    g.fillStyle(0xffe4b0).fillCircle(7, 7, 2); g.generateTexture('enemy-bullet', 14, 14); g.destroy();
  }
  drawMap() {
    const g=this.add.graphics().setDepth(-100);
    for(const [i,sector] of SECTORS.entries()) {
      const y=sector.top;
      g.fillStyle(sector.color).fillRect(0,y,WORLD.width,960);
      if(i===0){
        g.lineStyle(150,0xc2be91,.75).beginPath().moveTo(270,y+960).lineTo(230,y+580).lineTo(300,y+280).lineTo(270,y).strokePath();
        for(const [x,dy] of [[135,360],[405,490],[175,630]])this.sandbags(x,y+dy,60,26);
        this.crate(405,y+290);this.crate(85,y+530);
      }else if(i===1){
        g.fillStyle(0x557f8c).fillRect(0,y+380,540,240);
        for(let j=0;j<18;j++){g.lineStyle(2,0xa1c1be,.3).lineBetween((j*71)%500,y+400+(j*23)%210,(j*71)%500+35,y+400+(j*23)%210);}
        g.fillStyle(0x6f6450).fillRect(122,y+350,296,300);
        for(let k=0;k<15;k++){g.fillStyle(k%2?0xad986b:0xc1ab7b).fillRect(130,y+352+k*20,280,17);}
        g.lineStyle(8,0x5c5845).lineBetween(122,y+350,122,y+650).lineBetween(418,y+350,418,y+650);
        for(const x of [80,460])for(const dy of [290,730])this.crate(x,y+dy);
      }else{
        g.fillStyle(0xb7af90).fillRect(120,230,300,730);
        for(let yy=260;yy<960;yy+=70){g.lineStyle(2,0x918d74,.5).lineBetween(120,yy,420,yy);}
        for(const [x,yy] of [[115,370],[425,500],[90,700]])this.sandbags(x,yy,72,26);
        this.crate(440,270);this.crate(435,750);
        for(const x of [80,460]){g.fillStyle(0x505e4b).fillRect(x-30,180,60,100);g.fillStyle(0x67775c).fillTriangle(x-40,180,x+40,180,x,130);}
      }
      for(let n=0;n<360;n++){
        const x=this.rng.between(0,540),yy=y+this.rng.between(0,960);
        g.fillStyle(this.rng.pick([0x526d48,0xd8d4a3,0xa5b17d]),.24).fillEllipse(x,yy,3,2);
      }
      for(const x of [8,532])for(const dy of [250,420,740,920])this.tree(x,y+dy,i===2?23:30);
      this.add.text(270,y+875,`0${i+1} / ${sector.name}`,{fontFamily:'sans-serif',fontSize:'22px',color:'#e6e8c7'}).setOrigin(.5).setDepth(-20).setAlpha(.8);
    }
    this.gates=SECTORS.map((sector,i)=>{
      const line=this.add.graphics().setDepth(WORLD.height+50);
      line.lineStyle(3,0xf2ce73,.8).lineBetween(40,sector.gate,500,sector.gate);
      const label=this.add.text(270,sector.gate+24,i===2?'制圧後、撤収地点へ':'敵部隊を倒して突破',{fontFamily:'sans-serif',fontSize:'14px',color:'#f8ecc2'}).setOrigin(.5).setDepth(WORLD.height+51);
      return {line,label};
    });
    const {x,y,width,height}=EXTRACTION;
    this.extraction=this.add.graphics().setDepth(-10);
    this.extraction.lineStyle(2,0xeff6bd,.7).strokeRoundedRect(x,y,width,height,8);
    this.extraction.fillStyle(0xd9e6ab,.16).fillRoundedRect(x,y,width,height,8);
    this.exitLabel=this.add.text(x+width/2,y+height/2,'↑ 撤収地点',{fontFamily:'sans-serif',fontSize:'17px',color:'#e9edcf'}).setOrigin(.5).setDepth(-9);
    this.extraction.setAlpha(.4);this.exitLabel.setAlpha(.5);
  }
  updateTravelBounds() {
    const sector=SECTORS[Math.max(0,this.wave-1)];
    const top=this.wave>0&&this.clearedSector>=this.wave?95:sector.gate;
    this.player.body.setBoundsRectangle(new Phaser.Geom.Rectangle(22,top,WORLD.width-44,Math.min(WORLD.height-190,sector.top+1080)-top));
    this.gates.forEach((gate,i)=>{gate.line.setVisible(i>=this.clearedSector);gate.label.setVisible(i>=this.clearedSector);});
  }
  solid(x, y, w, h) {
    const body = this.add.rectangle(x, y, w, h, 0, 0); this.obstacles.add(body); return body;
  }
  tree(x,y,r) {
    const g = this.add.graphics().setDepth(y + 35);
    g.fillStyle(0x33462b,.16).fillEllipse(x+12,y+18,r*2.2,r*1.25);
    g.fillStyle(0x6b7050).fillRoundedRect(x-7,y-8,14,34,3);
    for (const [dx,dy,scale,color] of [[0,0,1,0x526e46],[-r*.36,-r*.18,.75,0x607d4e],[r*.36,-r*.28,.78,0x668552],[0,-r*.48,.76,0x75925c]]) {
      g.fillStyle(color).fillCircle(x+dx,y+dy,r*scale);
      g.lineStyle(2,0xb5c486,.12).strokeCircle(x+dx-3,y+dy-3,r*scale*.75);
    }
    this.solid(x,y+10,r*.75,r*.65);
  }
  sandbags(x,y,w,h) {
    const g = this.add.graphics().setDepth(y+15);
    g.fillStyle(0x394b31,.2).fillRoundedRect(x-w/2+5,y-h/2+10,w,h,8);
    for(let row=0;row<2;row++) for(let col=0;col<Math.floor(w/26);col++) {
      const bx=x-w/2+col*27+(row?8:0), by=y-h/2+row*14;
      g.fillStyle(row?0xa59d70:0xc7bd8b).fillRoundedRect(bx,by,29,17,6);
      g.lineStyle(1,0x797b51,.7).strokeRoundedRect(bx,by,29,17,6);
      g.lineStyle(1,0xe6dbaa,.4).lineBetween(bx+6,by+4,bx+22,by+4);
    }
    this.solid(x,y,w+7,h);
  }
  crate(x,y) {
    const g = this.add.graphics().setDepth(y+22);
    g.fillStyle(0x374c30,.2).fillRect(x-17,y-12,46,42);
    g.fillStyle(0x6b7550).fillRect(x-22,y-24,44,44);
    g.fillStyle(0x8e9365).fillRect(x-20,y-28,40,39);
    g.lineStyle(3,0xadb080).strokeRect(x-18,y-26,36,35);
    g.lineStyle(4,0x6b7450).lineBetween(x-15,y-22,x+15,y+5).lineBetween(x+15,y-22,x-15,y+5);
    this.solid(x,y,44,40);
  }
  makeActor(x,y,key,friendly) {
    const actor = this.add.container(x,y).setDepth(y);
    const shadow = this.add.ellipse(0,2,friendly?42:40,15,0x263a25,.24);
    const ring = this.add.ellipse(0,1,friendly?42:35,17).setStrokeStyle(friendly?2:1,friendly?0xe5efb2:0xb35e39,friendly?.9:.6);
    const friendlyRow = Object.keys(UNITS).indexOf(key.replace('goat-', ''));
    actor.faction=friendly?'goat':'fox'; actor.facing=friendly?-Math.PI/2:Math.PI/2;
    actor.sheet=`${actor.faction}-${friendly?'up':'down'}-packed`;
    actor.spriteRow = friendly ? friendlyRow : Number(key.replace('fox','')) - 1;
    const sprite=this.add.image(0,3,actor.sheet,`${actor.spriteRow}:0`).setOrigin(.5,1).setDisplaySize(96,96);
    actor.add([shadow,ring,sprite]); actor.art=sprite; actor.ring=ring;
    actor.shotUntil=0; actor.hurtUntil=0;
    this.physics.add.existing(actor); actor.body.setSize(24,32).setOffset(-12,-30).setCollideWorldBounds(friendly);
    return actor;
  }
  startOrResume() {
    if(this.state==='paused') { this.resume(); return; }
    if(this.state==='playing') return;
    this.resultTimer?.remove();
    for(const enemy of [...this.enemies,...this.fallen]) enemy.destroy(); this.enemies=[]; this.fallen=[];
    this.pendingSpawns=[]; this.nextSpawnAt=Infinity;
    for(const bullet of [...this.projectiles]) this.removeBullet(bullet);
    for(const pickup of this.pickups) pickup.destroy(); this.pickups=[];
    this.tweens.killAll(); this.effects.clear(true,true);
    this.player.setPosition(PLAYER_START.x,PLAYER_START.y); this.player.body.reset(PLAYER_START.x,PLAYER_START.y); this.player.setAlpha(1);
    this.setUnit(selectedUnit);
    this.score=0; this.kills=0; this.wave=0; this.clearedSector=0; this.lastHudAt=0; this.clock=0; this.nextWaveAt=900; this.lastShot=-1000; this.invulnerableUntil=1600;
    this.health=UNITS[selectedUnit].health; this.maxHealth=this.health; this.facing=-Math.PI/2;
    this.state='playing'; this.physics.resume(); this.resetInput();
    this.player.dead=false; this.player.facing=-Math.PI/2; this.player.victory=false; this.player.hurtUntil=0; this.player.shotUntil=0; this.player.action=null;
    this.extraction.setAlpha(.4); this.exitLabel.setAlpha(.5);
    this.updateTravelBounds();this.cameras.main.setScroll(0,cameraTopFor(this.player.y));
    $('overlay').classList.add('hidden'); $('status-label').textContent='IN OPERATION';
    $('pause-button').disabled=false; $('pause-button').textContent='Ⅱ';
    document.querySelectorAll('.unit-choice').forEach(button=>button.disabled=true);
    $('game-hint').textContent='方向パッドで移動、射撃ボタンで連射。同時押しもできます。';
    this.updateHud(); this.toast('作戦開始 — 北の前哨地へ進撃');
  }
  setUnit(key) {
    this.player.spriteRow=Object.keys(UNITS).indexOf(key); this.player.action=null;
    this.player.art.setFrame(`${this.player.spriteRow}:0`);
    this.health=UNITS[key].health; this.maxHealth=this.health; this.updateHud();
  }
  togglePause() {
    if(this.state==='paused') this.resume();
    else if(this.state==='playing') {
      this.state='paused'; this.physics.pause(); this.tweens.pauseAll(); this.resetInput();
      this.showOverlay('作戦を一時停止', 'ひと息ついたら、再び前線へ。', '作戦に戻る', 'P キーでも再開できます。');
      $('status-label').textContent='PAUSED'; $('pause-button').textContent='▶';
    }
  }
  resume() {
    this.state='playing'; this.physics.resume(); this.tweens.resumeAll(); this.resetInput();
    $('overlay').classList.add('hidden'); $('status-label').textContent='IN OPERATION'; $('pause-button').textContent='Ⅱ';
  }
  resetInput() { this.fireQueued=false; this.input.keyboard.resetKeys(); this.input.activePointer.isDown=false; touchSources.clear(); refreshTouch(); }
  spawnWave() {
    if(this.pendingSpawns.length || this.enemies.length || this.wave>=WAVES.length)return;
    this.wave++; this.nextWaveAt=Infinity; this.updateTravelBounds();
    this.pendingSpawns=Array.from({length:WAVES[this.wave-1]},(_,i)=>i);
    this.nextSpawnAt=this.clock;
    this.spawnReinforcement();
    this.toast(`0${this.wave} ${SECTORS[this.wave-1].name} — 敵部隊が接近`); this.updateHud();
  }
  spawnReinforcement() {
    if(!this.pendingSpawns.length)return;
    const i=this.pendingSpawns.shift();
    const {x,y}=this.navigation.safePosition(reinforcementPosition(i,this.wave,this.cameras.main.scrollY));
    const enemy=this.makeActor(x,y,`fox${(i+this.wave-1)%6+1}`,false);
    this.enemyGroup.add(enemy);
    enemy.body.setSize(24,32).setOffset(-12,-30).setCollideWorldBounds(false);
    enemy.hp=this.wave===3?3:2; enemy.nextShot=this.clock+3300;
    enemy.speed=48+this.wave*8+(i%3)*7; enemy.strafe=i%2?1:-1; enemy.entering=true; enemy.entryEndY=y+180;
    this.enemies.push(enemy);
    this.nextSpawnAt=this.pendingSpawns.length?this.clock+reinforcementDelay(this.wave):Infinity;
    this.updateHud();
  }
  waveCleared() {
    if(this.enemies.length || this.pendingSpawns.length)return;
    this.clearedSector=this.wave;this.nextWaveAt=Infinity;this.updateTravelBounds();
    if(this.wave<WAVES.length){this.toast('区間制圧！ ↑ 北へ進んで次のエリアへ');}
    else{this.extraction.setAlpha(1);this.exitLabel.setAlpha(1);this.toast('最終区間制圧！ 北の撤収地点へ ↑');}
    this.updateHud();
  }

  fire(actor,angle,hostile=false) {
    actor.shotUntil=this.clock+160; actor.facing=angle;
    const originX=actor.x+Math.cos(angle)*29, originY=actor.y-26+Math.sin(angle)*29;
    const bullet=(hostile?this.enemyBullets:this.playerBullets).create(originX,originY,hostile?'enemy-bullet':'bullet');
    bullet.setDepth(WORLD.height+200).setRotation(angle); bullet.body.setSize(hostile?8:10,hostile?8:5);
    bullet.spawnX=originX; bullet.spawnY=originY; bullet.range=hostile?440:BULLET_RANGE; bullet.hostile=hostile;
    this.physics.velocityFromRotation(angle,hostile?185+this.wave*12:610,bullet.body.velocity);
    this.projectiles.push(bullet);
    this.spark(originX,originY,hostile?0xefb875:0xffecaa,3);
    if(!hostile) sound('shot');
  }
  removeBullet(bullet) {
    if(!bullet.active)return;
    const index=this.projectiles.indexOf(bullet); if(index!==-1)this.projectiles.splice(index,1);
    bullet.destroy();
  }
  hitEnemy(bullet,enemy) {
    if(!bullet.active||!enemy.active||enemy.dead||this.state!=='playing')return;
    this.removeBullet(bullet); this.spark(enemy.x,enemy.y-25,0xf8e8b7,7); enemy.hp--; sound('hit');
    if(enemy.hp<=0) {
      const x=enemy.x,y=enemy.y;
      this.enemies=this.enemies.filter(e=>e!==enemy); enemy.body.enable=false; enemy.dead=true; enemy.ring.setVisible(false); enemy.fallAt=this.animationClock; enemy.hurtUntil=0; this.fallen.push(enemy); this.kills++; this.score+=100;
      const text=this.add.text(x,y-40,'+100',{fontFamily:'monospace',fontSize:'16px',color:'#f5f2c9'}).setOrigin(.5).setDepth(WORLD.height+400);
      this.effects.add(text);
      this.tweens.add({targets:text,y:y-80,alpha:0,duration:750,onComplete:()=>text.destroy()});
      if(this.kills%5===0)this.dropHealth(x,y);
      this.waveCleared();
      this.updateHud();
    } else { enemy.hurtUntil=this.clock+300; }
  }
  dropHealth(x,y) {
    const base=this.add.rectangle(0,0,24,24,0xebeed4).setStrokeStyle(2,0x688052);
    const cross=this.add.text(0,-1,'+',{fontFamily:'sans-serif',fontSize:'26px',color:'#678057'}).setOrigin(.5);
    this.pickups.push(this.add.container(x,y,[base,cross]).setDepth(y+10));
  }
  hurtPlayer() {
    if(this.state!=='playing'||this.clock<this.invulnerableUntil)return;
    this.health--; this.invulnerableUntil=this.clock+1300; this.player.hurtUntil=this.clock+300;
    this.cameras.main.shake(130,.004); this.cameras.main.flash(90,176,73,35,false); sound('hit');
    this.updateHud(); if(this.health<=0)this.finish(false);
  }
  spark(x,y,color,count=4) {
    for(let i=0;i<count;i++) {
      const dot=this.add.circle(x,y,this.rng.realInRange(1.5,3),color).setDepth(WORLD.height+300);
      this.effects.add(dot);
      const angle=this.rng.realInRange(0,Math.PI*2),distance=this.rng.between(8,23);
      this.tweens.add({targets:dot,x:x+Math.cos(angle)*distance,y:y+Math.sin(angle)*distance,alpha:0,duration:180,onComplete:()=>dot.destroy()});
    }
  }
  toast(message) { $('mission-toast').textContent=message; $('mission-toast').classList.add('visible'); this.toastUntil=this.clock+2600; }
  updateHud() {
    $('health-pips').innerHTML=Array.from({length:this.maxHealth},(_,i)=>`<i${i>=this.health?' class="empty"':''}></i>`).join('');
    $('health-pips').setAttribute('aria-label',`体力 ${this.health} / ${this.maxHealth}`);
    $('score-value').textContent=padScore(this.score);
    $('wave-label').textContent=this.wave?`${SECTORS[this.wave-1].name} ${this.wave}/3`:'北へ進撃';
    const remaining=this.enemies.length+this.pendingSpawns.length;
    $('wave-value').textContent=this.wave===3&&remaining===0?'↑ 北へ撤収':this.wave?(remaining?`残り ${remaining} 体`:'↑ 次の区間へ'):'出動待機';
    $('remaining-label').textContent=`${this.kills} / 24 撃破  ・  北へ ${Math.round(Math.max(0,PLAYER_START.y-this.player.y)/25)}m`;
  }
  showOverlay(title,description,button,note) {
    $('overlay-title').textContent=title; $('overlay-description').textContent=description;
    $('start-button').innerHTML=`${button} <span>↗</span>`; $('overlay-note').textContent=note;
    $('intro-controls').style.display='none'; $('overlay').classList.remove('hidden');
  }
  finish(won) {
    this.state=won?'won':'lost'; this.physics.pause(); this.player.body.setVelocity(0); this.player.setAlpha(1); this.aimGraphics.clear(); this.resetInput();
    this.player.dead=!won; this.player.victory=won;
    if(won) { this.score+=this.health*200; sound('clear'); }
    this.updateHud(); $('pause-button').disabled=true; $('status-label').textContent=won?'MISSION COMPLETE':'MISSION FAILED';
    $('mission-toast').classList.remove('visible');
    this.resultTimer=this.time.delayedCall(850,()=>this.showOverlay(won?'任務、完了。':'小隊、撤退。',won?`前哨地を守り抜いた。最終スコア ${padScore(this.score)}`:`撃破 ${this.kills} 体 / スコア ${padScore(this.score)}。隊員を変えて再挑戦しよう。`,'もう一度出動','隊員を選択して再出動できます。'));
    document.querySelectorAll('.unit-choice').forEach(button=>button.disabled=false);
    $('game-hint').textContent=won?'作戦成功！ お疲れさまでした。':'遮蔽物を使い、動きながら敵の弾を避けよう。';
  }
  animateAll(delta) {
    this.animationClock+=Math.min(delta,50);
    for(const actor of [this.player,...this.enemies,...this.fallen])animateActor(actor,this.clock,this.animationClock);
    for(const actor of [...this.fallen])if(this.animationClock-actor.fallAt>1200){actor.destroy();this.fallen=this.fallen.filter(a=>a!==actor);}
  }
  update(_,delta) {
    if(!this.player||this.state==='paused')return;
    if(this.state!=='playing'){this.animateAll(delta);return;}
    this.clock+=Math.min(delta,50);
    if(this.clock>=this.toastUntil)$('mission-toast').classList.remove('visible');
    if(this.clock>=this.nextWaveAt||canEnterNextSector(this.wave,this.clearedSector,this.player.y))this.spawnWave();
    if(this.clock>=this.nextSpawnAt)this.spawnReinforcement();
    const unit=UNITS[selectedUnit];
    const move=movementVector(this.keys.left.isDown||this.arrows.left.isDown||touch.left,
      this.keys.right.isDown||this.arrows.right.isDown||touch.right,
      this.keys.up.isDown||this.arrows.up.isDown||touch.up,
      this.keys.down.isDown||this.arrows.down.isDown||touch.down,unit.speed);
    const moving=Boolean(move.x||move.y);
    this.player.body.setVelocity(move.x,move.y);
    if(moving){this.facing=Math.atan2(move.y,move.x);this.player.facing=this.facing;}
    // Movement changes aim; firing is a separate input, also usable while standing.
    if((touch.fire||this.keys.fire.isDown||this.fireQueued)&&this.clock-this.lastShot>=unit.fireRate){this.fire(this.player,this.facing);this.lastShot=this.clock;}
    this.fireQueued=false;
    this.player.setDepth(this.player.y);
    this.player.setAlpha(this.clock<this.invulnerableUntil&&Math.floor(this.clock/95)%2===0?.55:1);
    this.cameras.main.setScroll(0,cameraTopFor(this.player.y));
    this.aimGraphics.clear();
    {
      const x=this.player.x,y=this.player.y-26,a=this.facing;
      this.aimGraphics.lineStyle(2,0xf5f2c9,.5).lineBetween(x+Math.cos(a)*42,y+Math.sin(a)*42,x+Math.cos(a)*65,y+Math.sin(a)*65);
    }
    for(const enemy of this.enemies){
      const dx=this.player.x-enemy.x,dy=this.player.y-enemy.y,dist=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
      if(enemy.entering&&(enemy.y>=enemy.entryEndY||(enemy.y>=120&&dist<240))){
        enemy.entering=false;enemy.body.setCollideWorldBounds(true);
      }
      const clearShot=this.navigation.shotClear({x:enemy.x,y:enemy.y-26},{x:this.player.x,y:this.player.y-26});
      if(enemy.entering||dist>230||!clearShot){
        if(this.clock>=(enemy.routeAt??0)||!enemy.route?.length||Math.hypot(this.player.x-(enemy.goalX??0),this.player.y-(enemy.goalY??0))>70){
          enemy.route=this.navigation.route(enemy,this.player);enemy.routeAt=this.clock+700;
          enemy.goalX=this.player.x;enemy.goalY=this.player.y;
        }
        while(enemy.route.length&&Math.hypot(enemy.route[0].x-enemy.x,enemy.route[0].y-enemy.y)<5)enemy.route.shift();
        const target=enemy.route[0];
        if(target){
          const angle=Math.atan2(target.y-enemy.y,target.x-enemy.x),speed=enemy.speed*(enemy.entering?1.3:1);
          enemy.body.setVelocity(Math.cos(angle)*speed,Math.sin(angle)*speed);
        }else enemy.body.setVelocity(0,0);
      }else{
        // Retreat only when the whole next step is clear; never push into cover.
        const step={x:enemy.x-Math.cos(a)*24,y:enemy.y-Math.sin(a)*24};
        const retreat=dist<145&&this.navigation.segmentClear(enemy,step)?-enemy.speed*.6:0;
        enemy.body.setVelocity(Math.cos(a)*retreat,Math.sin(a)*retreat);
      }
      if(this.clock>=enemy.shotUntil)enemy.facing=enemy.body.velocity.length()>1?Math.atan2(enemy.body.velocity.y,enemy.body.velocity.x):a;
      enemy.setDepth(enemy.y);
      if(!enemy.entering&&clearShot&&dist<420&&this.clock>enemy.nextShot){this.fire(enemy,a+this.rng.realInRange(-.12,.12),true);enemy.nextShot=this.clock+this.rng.between(1600,2600)-this.wave*100;}
    }
    for(const bullet of [...this.projectiles])if(!withinRange(bullet.x,bullet.y,bullet.spawnX,bullet.spawnY,bullet.range)||bullet.x<0||bullet.y<0||bullet.x>WORLD.width||bullet.y>WORLD.height)this.removeBullet(bullet);
    for(const pickup of [...this.pickups])if(this.health<this.maxHealth&&Math.hypot(pickup.x-this.player.x,pickup.y-this.player.y)<34){this.health=Math.min(this.maxHealth,this.health+2);pickup.destroy();this.pickups=this.pickups.filter(p=>p!==pickup);this.updateHud();sound('clear');}
    if(this.wave===WAVES.length&&!this.enemies.length&&!this.pendingSpawns.length&&this.player.x>EXTRACTION.x&&this.player.x<EXTRACTION.x+EXTRACTION.width&&this.player.y>EXTRACTION.y&&this.player.y<EXTRACTION.y+EXTRACTION.height)this.finish(true);
    this.animateAll(delta);
    if(this.clock-(this.lastHudAt??0)>200){this.updateHud();this.lastHudAt=this.clock;}
  }

}

$('start-button').disabled=true;
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'phaser-game', width: VIEW.width, height: VIEW.height,
  backgroundColor:'#929b70', antialias:true,
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
  physics:{default:'arcade',arcade:{debug:false,gravity:{x:0,y:0}}},
  scene:FieldScene, input:{activePointers:3}, render:{roundPixels:true},
});
// Fit the entire 9:16 game viewport; scroll position and world coordinates survive resize.
const resizeObserver=new ResizeObserver(([entry])=>{
  const {width,height}=entry.contentRect;
  if(width>0&&height>0)game.scale.setParentSize(width,height);
});
resizeObserver.observe($('game-stage'));
const shellObserver=new ResizeObserver(([entry])=>{
  const {width,height}=entry.contentRect;
  const stageWidth=Math.max(1,Math.min(width,(height-44)*VIEW.width/VIEW.height));
  $('game-stage').style.width=`${stageWidth}px`;
  $('game-stage').style.height=`${stageWidth*VIEW.height/VIEW.width}px`;
});
shellObserver.observe(document.querySelector('.game-shell'));
if(matchMedia('(any-pointer:coarse)').matches) $('intro-controls').innerHTML='<span>左の方向パッドで移動</span><span>右の射撃ボタンで連射</span>';
$('start-button').addEventListener('click',()=>scene?.startOrResume());
$('pause-button').addEventListener('click',()=>scene?.togglePause());
$('sound-button').addEventListener('click',()=>{ soundEnabled=!soundEnabled;$('sound-button').textContent=soundEnabled?'SOUND ON':'SOUND OFF';$('sound-button').setAttribute('aria-label',soundEnabled?'効果音をオフにする':'効果音をオンにする'); if(soundEnabled)sound('clear'); });
$('fullscreen-button').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.game-shell').requestFullscreen();}catch{$('game-hint').textContent='このブラウザでは全画面表示に対応していません。';}});
document.querySelectorAll('.unit-choice').forEach(button=>button.addEventListener('click',()=>{
  if(!scene?.player||['playing','paused'].includes(scene.state))return;
  selectedUnit=button.dataset.unit;const unit=UNITS[selectedUnit];
  document.querySelectorAll('.unit-choice').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});
  $('unit-portrait').src=button.querySelector('img').src;$('unit-portrait').alt=`ヤギの${unit.name}`;
  $('unit-name').innerHTML=`${unit.name} <span>${unit.english}</span>`;$('unit-role').textContent=unit.role;$('unit-description').textContent=unit.description;
  $('stat-speed').textContent=unit.speedDots;$('stat-fire').textContent=unit.fireDots;scene?.setUnit(selectedUnit);
}));
const touchSources=new Map();
function refreshTouch(){
  Object.keys(touch).forEach(key=>touch[key]=false);
  for(const direction of touchSources.values()) {
    if(direction==='fire')touch.fire=true;
    else direction.split('-').forEach(key=>touch[key]=true);
  }
  for(const button of document.querySelectorAll('[data-move], #touch-fire'))button.classList.toggle('pressed',!!touch[button.dataset.move??'fire']);
}
for(const button of document.querySelectorAll('[data-move], #touch-fire')) {
  button.addEventListener('pointerdown',event=>{
    event.preventDefault();if(scene?.state!=='playing')return;button.setPointerCapture(event.pointerId);
    if(button.id==='touch-fire')scene.fireQueued=true;
    touchSources.set(event.pointerId,button.dataset.move??'fire');refreshTouch();
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,event=>{touchSources.delete(event.pointerId);refreshTouch();});
}
// The platform owns suspension inside its iframe; standalone play keeps auto-pause.
if (!embedded) {
  window.addEventListener('blur',()=>{if(scene?.state==='playing')scene.togglePause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&scene?.state==='playing')scene.togglePause();});
} else {
  let pausedByHost = false;
  window.GameShell = { pause(force) {
    if (force) {
      scene?.resetInput();
      pausedByHost = scene?.state === 'playing';
      if (pausedByHost) scene.togglePause();
    } else {
      if (pausedByHost && scene?.state === 'paused') scene.resume();
      pausedByHost = false;
    }
  }};
}
window.MinigameScore = () => scene && scene.state !== 'ready'
  ? { value: scene.score, unit: '点', direction: 'higher' } : null;
document.querySelector('.intro-card').insertBefore(document.querySelector('.unit-select'),$('start-button'));
// Read-only inspection hook for local diagnostics.
window.clover={game,get snapshot(){return scene?{state:scene.state,health:scene.health,score:scene.score,wave:scene.wave,enemies:scene.enemies.length,pending:scene.pendingSpawns.length,action:scene.player.action,direction:scene.player.direction,cleared:scene.clearedSector,cameraY:scene.cameras.main.scrollY,bullets:scene.projectiles.length,player:{x:scene.player.x,y:scene.player.y}}:null;}};

if (import.meta.env.DEV && new URLSearchParams(location.search).has('qa')) {
  import('../tests/browser-checks.js').then(({ runBrowserChecks }) => runBrowserChecks(game));
}

import Phaser from 'phaser';
import { Combat, aimAngle, type Input } from './model';
import { ENEMIES, FIELD as F } from './data';
export class PitScene extends Phaser.Scene {
  onReady:()=>void=()=>{}; onLoadError:()=>void=()=>{};
  combat=new Combat(); controls:Input={move:0,fire:false,x:280,y:200}; onFrame:()=>void=()=>{}; onPause:()=>void=()=>{};
  private graphics!:Phaser.GameObjects.Graphics; private gate!:Phaser.GameObjects.Graphics;
  private spritePool:Phaser.GameObjects.Sprite[]=[];
  private sprites=new Map<string,Phaser.GameObjects.Sprite>(); private labels=new Map<number,Phaser.GameObjects.Text>();
  private keys!:Record<string,Phaser.Input.Keyboard.Key>; private shotUntil=0; private lastShot=0;
  constructor(private assetUrl:(path:string)=>string){super('pit');}
  preload(){this.load.on('loaderror',()=>this.onLoadError());this.load.atlas('sheet',this.assetUrl('games/ballpit/assets/characters-fx-v1.png'),this.assetUrl('games/ballpit/assets/characters-fx-v1.json'));this.load.atlas('actions',this.assetUrl('games/ballpit/assets/actions-v2.png'),this.assetUrl('games/ballpit/assets/actions-v2.json'));}
  create(){
    this.background();this.gate=this.add.graphics().setDepth(1);this.graphics=this.add.graphics().setDepth(3);
    this.keys=this.input.keyboard!.addKeys('A,D,LEFT,RIGHT,ESC') as typeof this.keys;
    this.keys.ESC.on('down',()=>this.onPause());
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{this.controls.x=p.x;this.controls.y=p.y;});
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(p.leftButtonDown()||p.wasTouch){this.controls.x=p.x;this.controls.y=p.y;this.controls.fire=true;this.combat.angle=aimAngle(p.x,p.y,this.combat.x,this.combat.angle);this.combat.fire();}});
    this.input.on('pointerup',()=>this.controls.fire=false);this.input.on('gameout',()=>this.clearInput());
    this.game.canvas.setAttribute('aria-label','城塞PITの戦闘画面。AとDで左右移動、マウスで狙い、左クリック長押しで発射。');this.game.canvas.tabIndex=0;
    this.events.once('shutdown',()=>{this.sprites.clear();this.spritePool=[];this.labels.clear();});
    this.onFrame();this.onReady();
  }
  clearInput(){this.controls.fire=false;this.controls.move=0;this.input?.keyboard?.resetKeys();}
  restartCombat(c:Combat){this.combat=c;this.clearInput();this.lastShot=0;this.shotUntil=0;}
  update(_time:number,delta:number){
    if(!this.graphics)return;
    const left=this.keys.A.isDown||this.keys.LEFT.isDown,right=this.keys.D.isDown||this.keys.RIGHT.isDown;
    const focused=/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName??'');
    const input={...this.controls,move:focused?0:this.controls.move||Number(right)-Number(left)};
    this.combat.update(delta/1000,input);
    this.renderCombat();this.onFrame();
  }
  private background(){
    const g=this.add.graphics();g.fillStyle(0x101e29).fillRect(0,0,F.width,F.height);
    for(let y=76;y<640;y+=32)for(let x=28;x<532;x+=40){
      g.fillStyle((x/40+y/32)%3<1?0x243540:0x283b45).fillRect(x+1,y+1,38,30);
      g.lineStyle(1,0x39505a,.35).lineBetween(x+3,y+2,x+35,y+2);
      if((x+y)%7===0)g.fillStyle(0x496052,.5).fillRect(x+2,y+24,8,4);
    }
    g.lineStyle(2,0x54605d,.3).strokeCircle(280,320,100);g.lineStyle(1,0x54605d,.22).strokeCircle(280,320,114);
    g.lineStyle(2,0x54605d,.25).strokePoints([{x:280,y:270},{x:330,y:320},{x:280,y:370},{x:230,y:320}],true);
    for(const x of [0,532])for(let y=0;y<660;y+=24){g.fillStyle(0x53616b).fillRect(x,y,28,23);g.fillStyle(0x71808a).fillRect(x+2,y+1,24,4);g.fillStyle(0x303e4a).fillRect(x+2,y+19,24,4);}
    for(let x=28;x<532;x+=42){g.fillStyle(0x4b5965).fillRect(x,0,40,75);g.fillStyle(0x73818b).fillRect(x,0,40,8);g.lineStyle(2,0x2e3a46).lineBetween(x,37,x+40,37);}
    for(const x of [74,449]){g.fillStyle(0x805d79).fillRect(x,20,27,47);g.fillStyle(0xe1bf75).fillRect(x-2,18,31,4);g.fillStyle(0xd7b773).fillTriangle(x+13,31,x+6,44,x+20,44);}
    for(const x of [43,511])for(const y of [106,330,550]){g.fillStyle(0x1d2229).fillRect(x-4,y,8,22);g.fillStyle(0xe5aa5d).fillRect(x-5,y-6,10,11);g.fillStyle(0xffdc8a).fillRect(x-2,y-11,4,14);}
    g.fillStyle(0x09151e,.8).fillRect(28,610,504,35);g.lineStyle(5,0x288da8,.35).lineBetween(28,F.collectY,532,F.collectY);g.lineStyle(2,0x8bf3e4).lineBetween(28,F.collectY,532,F.collectY);
    for(let x=64;x<532;x+=72)g.lineStyle(1,0x7cd4ce).strokePoints([{x,y:623},{x:x+5,y:628},{x,y:633},{x:x-5,y:628}],true);
    this.add.text(280,647,'魔 法 の 回 収 ラ イ ン',{fontFamily:'sans-serif',fontSize:'10px',color:'#94b4b7'}).setOrigin(.5);
  }
  private sprite(key:string,x:number,y:number,frame:number,size:number,depth=4,texture='sheet'){
    let s=this.sprites.get(key);if(!s){s=this.spritePool.pop()??this.add.sprite(x,y,texture,String(frame));this.sprites.set(key,s);}
    s.setVisible(true).setActive(true).setDepth(depth).setRotation(0).setPosition(x,y).setTexture(texture,String(frame));
    s.setDisplaySize(size,size*s.frame.realHeight/s.frame.realWidth).setAlpha(1).clearTint();return s;
  }
  private renderCombat(){
    const m=this.combat,g=this.graphics,alive=new Set<string>();g.clear();
    const animatedFrame=Math.floor(m.time*9)%8;
    this.gate.clear().fillStyle(0x121821).fillRoundedRect(225,8,110,68,36);
    const opening=m.gateOpen;
    for(const side of [-1,1]){const x=side===-1?229-opening*25:281+opening*25;
      this.gate.fillStyle(0x695347).fillRect(x,24,50,50).lineStyle(2,0x342b2c).strokeRect(x,24,50,50);
      for(let i=1;i<5;i++)this.gate.lineBetween(x+i*10,25,x+i*10,73);
      this.gate.fillStyle(0x87908e).fillRect(x+2,42,46,5);
    }
    if(m.phase==='playing'){
      const dx=Math.cos(m.angle),dy=-Math.sin(m.angle);const muzzle=m.muzzle;
      for(let i=12;i<112;i+=14)g.fillStyle(0xb7e9e5,1-i/170).fillCircle(muzzle.x+dx*i,muzzle.y+dy*i,2);
      if(m.settings.prediction){const times=[dy<0?(F.top+6-muzzle.y)/dy:Infinity,dx>0?(F.right-6-muzzle.x)/dx:dx<0?(F.left+6-muzzle.x)/dx:Infinity];const t=Math.min(...times),x=muzzle.x+dx*t,y=muzzle.y+dy*t;
        g.lineStyle(1,0xb3d9cc,.35).lineBetween(muzzle.x,muzzle.y,x,y);g.lineBetween(x,y,x+(times[1]<times[0]?-dx:dx)*85,y+(times[0]<=times[1]?-dy:dy)*85);}

    }
    for(const w of m.warnings){
      g.fillStyle(w.struck?0xf3bd76:0xe99c77,w.struck?.38:.12+.08*Math.sin(w.age*18)).fillRect(w.x-w.width/2,85,w.width,520);
      g.lineStyle(2,0xf2b377,.9).strokeRect(w.x-w.width/2,85,w.width,520);
      if(!w.struck)g.fillStyle(0xffcc8a).fillTriangle(w.x,F.playerY-65,w.x-7,F.playerY-52,w.x+7,F.playerY-52);
    }
    for(let i=0;i<7;i++){const x=48+i*72+Math.sin(m.time*1.3+i)*8;g.fillStyle(0x91d9df,.2+.1*Math.sin(m.time*2+i)).fillCircle(x,F.collectY-3,2);}
    for(const e of m.enemies){
      const d=ENEMIES[e.kind],key='e'+e.id;alive.add(key);
      let texture='sheet',frame=e.kind==='golem'?48+(e.open?4:0)+Math.floor(e.age*5)%4:d.row*8+Math.floor(e.age*9)%8;
      if(e.kind==='skeleton'&&e.born>0){texture='actions';frame=16+Math.min(7,Math.floor((.6-e.born)/.6*8));}
      if(e.kind==='golem'){
        if(!e.open&&e.attackClock<2.1){texture='actions';frame=e.attackClock<1.2?48+Math.min(3,Math.floor(e.attackClock/1.2*4)):52;}
        else if(e.open&&e.attackClock<2.4){texture='actions';frame=53+Math.min(2,Math.floor(Math.max(0,e.attackClock-2.1)/.1));}
      }
      const bounce=e.born>0&&e.kind==='slime'?Math.sin((1-e.born/.3)*Math.PI)*15:0;

      g.fillStyle(0x07151b,.4).fillEllipse(e.x,e.y+d.size*.3,d.size*.6,9);
      const s=this.sprite(key,e.x,e.y+(e.kind==='golem'?19:0)-bounce,frame,d.size,4,texture);if(!e.solid&&e.kind==='ghost')s.setAlpha(.25);if(e.hit>0){s.setTint(0xffe6ad);if(e.kind==='slime')s.setDisplaySize(d.size*1.12,d.size*.8);}
      if(e.kind==='golem'&&e.open)g.lineStyle(2,0x9bfff5,.8).strokeCircle(e.x,e.y+12,21);
      if(e.kind!=='golem'&&e.hp<e.maxHP){g.fillStyle(0x101d26).fillRect(e.x-16,e.y-d.size*.5,32,4);g.fillStyle(0xd8bb81).fillRect(e.x-16,e.y-d.size*.5,32*e.hp/e.maxHP,4);}
    }
    for(const b of m.balls){
      if(b.reflections){g.lineStyle(2,0xa8f5ef,.8).strokeCircle(b.x,b.y,10);g.lineStyle(2,0x8abdd1,.35).lineBetween(b.x,b.y,b.x-b.vx*.035,b.y-b.vy*.035);}
      g.fillStyle(0x4dacf0).fillCircle(b.x,b.y,b.radius);g.fillStyle(0xd7f4ff).fillCircle(b.x-1,b.y-1,b.radius*.45);
    }
    for(const shot of m.enemyShots){g.fillStyle(0xb78472).fillCircle(shot.x,shot.y,7);g.lineStyle(1,0xffc69a).strokeCircle(shot.x,shot.y,7);}
    for(const gem of m.gems){if(gem.age<.05)continue;const key='g'+gem.id;alive.add(key);this.sprite(key,gem.x,gem.y,72+animatedFrame,gem.value>=15?25:18,5);}
    if(m.stats.shots!==this.lastShot){this.lastShot=m.stats.shots;this.shotUntil=m.time+.28;}
    const firing=m.time<this.shotUntil,playerFrame=firing?8+Math.min(7,Math.floor((.28-(this.shotUntil-m.time))/.035)):animatedFrame;
    alive.add('player');g.fillStyle(0x08171d,.5).fillEllipse(m.x,F.playerY+19,38,9);
    const recoil=m.invincible>.6?Math.sin(m.time*90)*2:0;
    const player=this.sprite('player',m.x+recoil,F.playerY,playerFrame,62,6,'actions').setRotation(Math.PI/2-m.angle);
    if(m.invincible>0){player.setAlpha(Math.floor(m.invincible*16)%2?.4:1);player.setTint(0xffbdc1);}
    for(const fx of m.effects){
      if(fx.kind==='shot'||fx.kind==='spawn')continue;
      const progress=fx.age/fx.duration,key='f'+fx.id;const frame=Math.min(7,Math.floor(progress*8));
      if(fx.kind==='collect'){
        const x=fx.x+(280-fx.x)*Math.min(.15,progress*.15);
        g.lineStyle(2,0xc5a5ff,1-progress).strokeEllipse(fx.x,fx.y,12+progress*85,8+progress*18);
        g.fillStyle(0xb4e9ff,1-progress).fillCircle(x,fx.y,6*(1-progress));
        if(fx.value)g.lineStyle(3,0x8fdbed,1-progress).lineBetween(fx.x-progress*50,fx.y,fx.x+progress*50,fx.y);
      }
      let texture='sheet',row=7,fxFrame=frame,size=fx.kind==='hit'?(fx.source==='skeleton'?38:25):32,offsetY=0;
      if(fx.kind==='death'){
        row=8;size=60;if(fx.source==='slime'&&progress<.25){row=2;fxFrame=0;size=48*(1+progress*1.6);}
        if(fx.source==='skeleton'){texture='actions';row=3;size=58;}
        if(fx.source==='bat'){texture='actions';row=4;size=48;}
        if(fx.source==='ghost'){texture='actions';row=5;size=50;}
        if(fx.source==='golem'){texture='actions';row=7;size=140;offsetY=19;}
      }
      alive.add(key);const s=this.sprite(key,fx.x,fx.y+offsetY,row*8+fxFrame,size,7,texture).setAlpha(1-progress*.7);
      if(fx.kind==='hit'&&fx.source==='golem')s.setTint(fx.value>0?0x83fff5:0xa4b6c4);
      if(fx.kind==='collect')s.setTint(0xbfa0ff);if(fx.kind==='hurt')s.setTint(0xff8296).setAlpha((1-progress)*.5);
      if(fx.kind==='hit'){
        let text=this.labels.get(fx.id);if(!text){text=this.add.text(fx.x,fx.y-17,fx.value>0?String(Math.round(fx.value)):'装甲',{fontFamily:'sans-serif',fontSize:fx.source==='skeleton'?'17px':'13px',fontStyle:'bold',color:fx.value>0?'#fff0bc':'#a4b6c4',stroke:'#1d2e39',strokeThickness:3}).setOrigin(.5).setDepth(8);this.labels.set(fx.id,text);}
        text.setPosition(fx.x,fx.y-17-progress*18).setAlpha(1-progress);
      }
    }
    for(const [key,s]of this.sprites)if(!alive.has(key)){s.setVisible(false).setActive(false);if(this.spritePool.length<160)this.spritePool.push(s);else s.destroy();this.sprites.delete(key);}
    for(const [id,t]of this.labels)if(!m.effects.some(e=>e.id===id)){t.destroy();this.labels.delete(id);}
    // Small gate progress lights make remaining spawns readable without covering enemies.
    for(let i=0;i<4;i++)g.fillStyle(i<=m.wave?0xe4c58c:0x4b5c65).fillRect(248+i*18,4,10,3);
  }
}

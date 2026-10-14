import { DEFAULTS, ENEMIES, FIELD as F, UPGRADE_IDS, WAVES, LIMITS, UPGRADE_CAPS, type EnemyKind, type Settings, type Upgrade } from './data';
export type Phase='ready'|'playing'|'upgrade'|'paused'|'intermission'|'clear'|'dead';
export interface Input { move:number; fire:boolean; x:number; y:number }
export interface Enemy {id:number;kind:EnemyKind;x:number;y:number;hp:number;maxHP:number;radius:number;age:number;solid:boolean;open:boolean;route:number;hit:number;born:number;attackClock:number}
export interface Ball {id:number;x:number;y:number;vx:number;vy:number;radius:number;age:number;damage:number;pierce:number;reflections:number;walls:number;enemies:number;contacts:Set<number>;lastHit:Map<number,number>;hits:number;kills:number}
export interface Gem {id:number;x:number;y:number;age:number;value:number}
export interface Effect {id:number;kind:'hit'|'death'|'collect'|'hurt'|'shot'|'spawn'|'warning';x:number;y:number;age:number;value:number;duration:number;source:EnemyKind}
export interface Warning {x:number;age:number;struck:boolean;width:number;delay:number}
export interface EnemyShot {id:number;x:number;y:number;vx:number;vy:number;age:number}
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export function aimAngle(x:number,y:number,px:number,previous:number){const dx=x-px,up=Math.max(F.playerY-y,0);return dx===0&&up===0?previous:clamp(Math.atan2(up,dx),Math.PI/12,Math.PI*11/12);}
export function requiredExp(level:number,base=50,growth=1.25){return Math.floor(base*growth**(level-1));}
/** Earliest circle impact in the segment, including initially overlapping objects. */
export function circleTime(x:number,y:number,dx:number,dy:number,cx:number,cy:number,r:number):number|null{
  const ox=x-cx,oy=y-cy,c=ox*ox+oy*oy-r*r,a=dx*dx+dy*dy;
  if(c<=0)return 0;if(a===0)return null;
  const b=ox*dx+oy*dy,d=b*b-a*c;if(d<0)return null;
  const t=(-b-Math.sqrt(d))/a;return t>=0&&t<=1?t:null;
}
export class Combat {
  settings:Settings; transitionKind:'start'|'wave'|'final'='start'; transitionElapsed=0; advanced=false; enemyShots:EnemyShot[]=[];
  shotLog:{id:number;hits:number;kills:number;age:number;reason:string}[]=[];
  phase:Phase='ready'; resumePhase:Phase='playing';
  x=280; hp=100; maxHP=100; level=1; exp=0; pending=0; total=3; time=0; wave=0; spawned=0; spawnClock=0; intervalClock=0; invincible=0; angle=Math.PI/2; transition=0; nextWave=false;
  enemies:Enemy[]=[];balls:Ball[]=[];gems:Gem[]=[];effects:Effect[]=[];warnings:Warning[]=[];choices:Upgrade[]=[];
  upgrades:Record<Upgrade,number>={damage:0,speed:0,count:0,health:0,pierce:0,heal:0};
  stats={shots:0,hits:0,kills:0,wallReflections:0,enemyReflections:0,lineReturns:0,lifeReturns:0,emptyTime:0,firstLevelTime:0,collisionLimit:0,damageTaken:0};
  damageLog:{time:number;x:number;source:string}[]=[];
  private uid=0;private rng:number;private accumulator=0;
  constructor(settings:Partial<Settings>={}){this.settings={...DEFAULTS,...settings};this.total=this.settings.balls;this.rng=this.settings.seed>>>0;}
  get ready(){return this.total-this.balls.length;}
  get activePhase(){return this.phase==='paused'?this.resumePhase:this.phase;}
  get gateOpen(){if(this.phase==='ready')return 0;if(this.activePhase!=='intermission')return this.phase==='clear'?0:1;const t=this.transitionElapsed;if(this.transitionKind==='start')return clamp((t-1)/.8,0,1);if(t<1.4)return 1-clamp((t-.6)/.8,0,1);return this.transitionKind==='final'?0:clamp((t-3.4)/.8,0,1);}
  get muzzle(){return {x:this.x+Math.cos(this.angle)*24,y:F.playerY-Math.sin(this.angle)*24};}
  get need(){return requiredExp(this.level,this.settings.baseExp,this.settings.growth);}
  get boss(){return this.enemies.find(e=>e.kind==='golem');}
  private random(){this.rng=(Math.imul(1664525,this.rng)+1013904223)>>>0;return this.rng/4294967296;}
  start(){if(this.phase==='ready')this.beginTransition('start');}
  private beginTransition(kind:typeof this.transitionKind){this.phase='intermission';this.transitionKind=kind;this.transitionElapsed=0;this.advanced=false;this.transition=kind==='start'?1.8:kind==='final'?2.6:4.2;for(const b of [...this.balls])this.recover(b,false,'wave');this.enemyShots=[];this.warnings=[];}
  pause(){if(['playing','upgrade','intermission'].includes(this.phase)){this.resumePhase=this.phase;this.phase='paused';this.accumulator=0;}}
  resume(){if(this.phase==='paused'){this.phase=this.resumePhase;this.accumulator=0;}}
  effect(kind:Effect['kind'],x:number,y:number,value=0,source:EnemyKind='slime'){
    const duration=kind==='hit'?.2:kind==='death'?(source==='golem'?1.2:.3):kind==='spawn'?.6:kind==='collect'?.45:.25;
    if(this.effects.length>=LIMITS.effects)this.effects.shift();this.effects.push({id:++this.uid,kind,x,y,age:0,value,duration,source});
  }
  private advanceEffects(dt:number){for(const f of this.effects)f.age+=dt;this.effects=this.effects.filter(f=>f.age<f.duration);}
  update(dt:number,input:Input){
    if(!['playing','intermission'].includes(this.phase))return;
    this.accumulator+=Math.min(dt,.05);
    while(this.accumulator>=1/120){this.accumulator-=1/120;this.step(1/120,input);if(!['playing','intermission'].includes(this.phase)){this.accumulator=0;break;}}
  }
  private step(dt:number,input:Input){
    if(this.phase==='intermission'){
      this.advanceEffects(dt);this.transition-=dt;this.transitionElapsed+=dt;
      if(this.transitionKind==='wave'&&!this.advanced&&this.transitionElapsed>=2.4){this.advanced=true;this.wave++;this.spawned=0;}
      if(this.transition<=0){if(this.transitionKind==='final'){this.phase='clear';return;}this.phase='playing';this.spawnClock=0;this.intervalClock=0;if(this.settings.practice)this.setupPractice();}
      return;
    }
    this.time+=dt;this.intervalClock=Math.max(0,this.intervalClock-dt);this.invincible=Math.max(0,this.invincible-dt);
    this.x=clamp(this.x+clamp(input.move,-1,1)*this.settings.playerSpeed*dt,F.left+Math.max(F.playerRadius,30),F.right-Math.max(F.playerRadius,30));
    this.angle=aimAngle(input.x,input.y,this.x,this.angle);
    this.advanceEffects(dt);
    this.spawnClock-=dt;
    if(this.spawned<WAVES[this.wave].length&&this.spawnClock<=0&&this.enemies.length<LIMITS.enemies){this.spawn(WAVES[this.wave][this.spawned]);this.spawned++;this.spawnClock=this.settings.spawnInterval;}
    for(const e of this.enemies){
      e.age+=dt;e.born=Math.max(0,e.born-dt);e.hit=Math.max(0,e.hit-dt);e.solid=e.born<=0&&(e.kind!=='ghost'||e.age%3.5<2);if(e.born>0)continue;
      if(e.kind==='golem'){
        e.x=280+Math.sin(e.age*.4)*105;e.y=187+Math.sin(e.age*.7)*16;
        const cycle=e.attackClock;e.attackClock+=dt;e.open=cycle>=2.1&&cycle<5.3;
        if(cycle===0){this.warnings.push({x:this.x,age:0,struck:false,width:80,delay:1.2});this.effect('warning',e.x,e.y);}
        if(cycle<1.2&&e.attackClock>=1.2){for(let i=-1;i<=1;i++){const dx=this.x-e.x+i*110,dy=F.playerY-e.y,l=Math.hypot(dx,dy);this.enemyShots.push({id:++this.uid,x:e.x,y:e.y+30,vx:dx/l*155,vy:dy/l*155,age:0});}}
        if(e.attackClock>=6)e.attackClock=0;
      }else if(!this.settings.practice){
        const routePhase=e.y<150, targetX=routePhase?e.route:this.x;
        const dx=targetX-e.x,dy=(routePhase?166:F.playerY)-e.y,l=Math.hypot(dx,dy)||1,s=ENEMIES[e.kind].speed*this.settings.enemySpeed;
        const weave=e.kind==='bat'?Math.sin(e.age*3.3+e.id)*23:e.kind==='ghost'?Math.sin(e.age*2+e.id)*12:0;
        e.x=clamp(e.x+(dx/l*s+weave)*dt,F.left+e.radius,F.right-e.radius);
        e.y=Math.min(F.playerY-e.radius,e.y+dy/l*s*dt);
      }
    }
    if(input.fire){if(this.ready===0)this.stats.emptyTime+=dt;else if(this.intervalClock<=0)this.fire();}
    for(const b of [...this.balls]){
      b.age+=dt;if(b.age>=this.settings.lifetime){this.recover(b,false);continue;}this.moveBall(b,dt);
    }
    // Dead enemies have already left the list, so they cannot hurt the player.
    for(const e of this.enemies)if(e.solid&&Math.hypot(e.x-this.x,e.y-F.playerY)<e.radius+F.playerRadius&&this.hurt(ENEMIES[e.kind].name))e.y=Math.min(e.y,F.playerY-e.radius-F.playerRadius-this.settings.pushback);
    for(const w of this.warnings){w.age+=dt;if(w.age>=w.delay&&!w.struck){w.struck=true;if(Math.abs(this.x-w.x)<w.width/2+F.playerRadius)this.hurt('ゴーレムの衝撃波');}}
    this.warnings=this.warnings.filter(w=>w.age<w.delay+.45);
    for(const shot of this.enemyShots){shot.age+=dt;shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;if(Math.hypot(shot.x-this.x,shot.y-F.playerY)<F.playerRadius+6){this.hurt('ゴーレムの石弾');shot.age=9;}}
    this.enemyShots=this.enemyShots.filter(s=>s.age<8&&s.x>F.left&&s.x<F.right&&s.y<F.collectY);
    if(this.hp<=0){this.phase='dead';this.pending=0;return;}
    for(const g of [...this.gems]){
      g.age+=dt;if(g.age>.1){const t=Math.min(1,dt/Math.max(.01,.7-g.age));g.x+=(this.x-g.x)*t;g.y+=(F.playerY-g.y)*t;}
      if(g.age>=.7||g.age>.1&&Math.hypot(g.x-this.x,g.y-F.playerY)<16){this.exp+=g.value;this.gems=this.gems.filter(v=>v!==g);}
    }
    const done=this.spawned===WAVES[this.wave].length&&this.enemies.length===0;
    if(done){this.flushExp();this.nextWave=true;}
    this.resolve();
  }
  spawn(kind:EnemyKind){
    const d=ENEMIES[kind];const route=[65,495,140,420,225,335][this.spawned%6];
    const e:Enemy={id:++this.uid,kind,x:280+(this.spawned%3-1)*28,y:95,hp:d.hp*this.settings.enemyHP,maxHP:d.hp*this.settings.enemyHP,radius:d.radius,age:0,solid:true,open:false,route,hit:0,born:kind==='skeleton'?.6:.3,attackClock:0};
    this.enemies.push(e);this.effect('spawn',e.x,e.y,0,kind);return e;
  }
  fire(){
    if(this.phase!=='playing'||this.ready<=0||this.intervalClock>0)return;
    const speed=this.settings.speed*(1+.15*this.upgrades.speed),muzzle=this.muzzle;
    this.balls.push({id:++this.uid,x:muzzle.x,y:muzzle.y,vx:Math.cos(this.angle)*speed,vy:-Math.sin(this.angle)*speed,radius:6,age:0,damage:10*(1+.2*this.upgrades.damage),pierce:this.upgrades.pierce,reflections:0,walls:0,enemies:0,contacts:new Set(),lastHit:new Map(),hits:0,kills:0});
    this.stats.shots++;this.intervalClock=this.settings.interval;this.effect('shot',this.x,F.playerY);
  }
  private parts(e:Enemy){
    if(e.kind!=='golem')return [{x:e.x,y:e.y,r:e.radius,core:false}];
    return e.open?[
      {x:e.x,y:e.y+12,r:21,core:true},
      {x:e.x-43,y:e.y+5,r:20,core:false},{x:e.x+43,y:e.y+5,r:20,core:false},{x:e.x,y:e.y-33,r:22,core:false}
    ]:[{x:e.x,y:e.y,r:53,core:false}];
  }
  moveBall(b:Ball,dt:number){
    let remain=dt,iterations=0;
    while(remain>1e-7&&iterations++<12){
      for(const id of b.contacts){const e=this.enemies.find(e=>e.id===id);if(!e||!e.solid||this.parts(e).every(p=>Math.hypot(b.x-p.x,b.y-p.y)>b.radius+p.r+.1))b.contacts.delete(id);}
      const dx=b.vx*remain,dy=b.vy*remain;
      let t=1,wallX=false,wallY=false,collect=false,target:Enemy|undefined,part:{x:number;y:number;r:number;core:boolean}|undefined;
      const wall=(at:number,x:boolean,y:boolean,c=false)=>{if(at>=-1e-9&&at<=t+1e-9){if(at<t-1e-9){wallX=false;wallY=false;collect=false;target=undefined;}t=Math.max(0,at);wallX ||=x;wallY ||=y;collect ||=c;}};
      if(dx<0)wall((F.left+b.radius-b.x)/dx,true,false);else if(dx>0)wall((F.right-b.radius-b.x)/dx,true,false);
      if(dy<0)wall((F.top+b.radius-b.y)/dy,false,true);else if(dy>0)wall((F.collectY-b.radius-b.y)/dy,false,false,true);
      for(const e of this.enemies){if(!e.solid||b.contacts.has(e.id))continue;
        for(const p of this.parts(e)){const hit=circleTime(b.x,b.y,dx,dy,p.x,p.y,b.radius+p.r);if(hit!==null&&hit<t){t=hit;target=e;part=p;wallX=wallY=collect=false;}}
      }
      b.x+=dx*t;b.y+=dy*t;remain*=1-t;
      if(collect){this.recover(b,true);return;}
      if(target&&part){
        b.contacts.add(target.id);
        const last=b.lastHit.get(target.id)??-Infinity;
        if(this.time-last>=.1){
          const damage=target.kind==='golem'?(part.core?b.damage*2:0):b.damage;
          target.hp-=damage;target.hit=.1;b.lastHit.set(target.id,this.time);if(damage>0){this.stats.hits++;b.hits++;}
          this.effect('hit',target.x+(b.id%5-2)*4,target.y,damage,target.kind);
        }
        if(b.pierce>0&&target.kind!=='golem')b.pierce--;
        else{
          let nx=b.x-part.x,ny=b.y-part.y,len=Math.hypot(nx,ny);
          if(len<.001){len=Math.hypot(b.vx,b.vy);nx=-b.vx;ny=-b.vy;}
          nx/=len;ny/=len;const dot=b.vx*nx+b.vy*ny;
          b.x=part.x+nx*(part.r+b.radius+.15);b.y=part.y+ny*(part.r+b.radius+.15);
          if(dot<0){b.vx-=2*dot*nx;b.vy-=2*dot*ny;b.reflections++;b.enemies++;this.stats.enemyReflections++;}
        }
        if(target.hp<=0){b.kills++;this.kill(target);}
      }else if(wallX||wallY){
        if(wallX)b.vx*=-1;if(wallY)b.vy*=-1;
        b.x=clamp(b.x,F.left+b.radius+.001,F.right-b.radius-.001);b.y=Math.max(F.top+b.radius+.001,b.y);
        b.reflections++;b.walls++;this.stats.wallReflections++;
      }else break;
    }
    if(remain>1e-7&&iterations>12)this.stats.collisionLimit++;
  }
  private recover(b:Ball,line:boolean,reason=line?'line':'lifetime'){
    this.balls=this.balls.filter(v=>v!==b);if(reason!=='wave'){if(line)this.stats.lineReturns++;else this.stats.lifeReturns++;}
    this.shotLog.push({id:b.id,hits:b.hits,kills:b.kills,age:b.age,reason});if(this.shotLog.length>1000)this.shotLog.shift();
    if(reason!=='wave')this.effect('collect',b.x,line?F.collectY:b.y,line?1:0);
  }
  kill(e:Enemy){if(!this.enemies.includes(e))return;this.enemies=this.enemies.filter(v=>v!==e);this.stats.kills++;this.effect('death',e.x,e.y,1,e.kind);
    this.gems.push({id:++this.uid,x:e.x,y:e.y,age:0,value:ENEMIES[e.kind].exp});
    if(e.kind==='golem'){this.enemies=[];this.warnings=[];this.enemyShots=[];}
  }
  private setupPractice(){
    this.enemies=[];this.spawned=WAVES[this.wave].length;
    const points=this.settings.practice===1?[[200,260],[360,260]]:this.settings.practice===2?[[82,200],[478,200],[82,310],[478,310]]:[[190,200],[370,200],[240,370],[320,370]];
    for(const [x,y]of points){const e=this.spawn('skeleton');e.x=x;e.y=y;e.born=0;e.solid=true;}
  }
  hurt(source:string){if(this.invincible>0||this.hp<=0)return false;this.hp=Math.max(0,this.hp-this.settings.contactDamage);this.stats.damageTaken+=this.settings.contactDamage;this.invincible=.8;this.effect('hurt',this.x,F.playerY);this.damageLog.push({time:this.time,x:this.x,source});return true;}
  private flushExp(){for(const g of this.gems)this.exp+=g.value;this.gems=[];}
  resolve(){
    if(this.hp<=0){this.phase='dead';this.pending=0;return;}
    while(this.exp>=this.need){this.exp-=this.need;this.level++;this.pending++;if(!this.stats.firstLevelTime)this.stats.firstLevelTime=this.time;}
    if(this.pending){this.phase='upgrade';this.rollChoices();return;}
    if(this.nextWave){this.nextWave=false;this.beginTransition(this.settings.practice||this.wave===WAVES.length-1?'final':'wave');}
  }
  private rollChoices(){const pool=UPGRADE_IDS.filter(id=>id!=='heal'&&(id==='count'?this.total<LIMITS.balls:this.upgrades[id]<UPGRADE_CAPS[id]));if(!pool.length){this.choices=['heal'];return;}for(let i=pool.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}this.choices=pool.slice(0,3);}
  choose(id:Upgrade){if(this.phase!=='upgrade'||!this.choices.includes(id))return;this.upgrades[id]++;if(id==='heal')this.hp=Math.min(this.maxHP,this.hp+20);if(id==='count')this.total++;if(id==='health'){this.maxHP+=20;this.hp=Math.min(this.maxHP,this.hp+20);}this.pending--;this.phase='playing';this.resolve();}
  snapshot(){return {version:'0.2.0',shotLog:[...this.shotLog],settings:this.settings,phase:this.phase,time:this.time,wave:this.wave+1,hp:this.hp,level:this.level,exp:this.exp,total:this.total,ready:this.ready,upgrades:{...this.upgrades},stats:{...this.stats},damageLog:[...this.damageLog]};}
}

import { BONUSES, DIFFICULTIES, STORIES, type Character, type Difficulty, type Skill } from './content';
import { advanceFlight, flightAngle, resizeFlight, spawnFlight, type Target } from './flights';
export type { Target } from './flights';
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export interface Ball { x:number;y:number;vx:number;vy:number;radius:number; }
export interface Event { type:'return'|'enemy-return'|'goal'|'miss'|'bonus'|'skill'|'guard';x:number;y:number;points:number; }
export class StoryMatch {
  phase:'intro'|'playing'|'clear'|'over'|'ending'='intro';
  hp=5;score=0;chapterIndex=0;goals=0;totalGoals=0;charge=0;endless=false;
  playerX=240;enemyX=240;height=760;elapsed=0;serve=1.2;rallyHits=0;
  ball:Ball={x:240,y:380,vx:80,vy:255,radius:8};targets:Target[]=[];
  skill:Skill|null=null;skillTime=0;private shot=false;private shield=false;
  private accumulator=0;private nextTarget=6;private serial=0;private aim=240;private aimIn=0;
  constructor(readonly character:Character,private random= Math.random,readonly difficulty:Difficulty='normal'){}
  get pace(){return DIFFICULTIES[this.difficulty];}
  get ballSpeed(){return Math.hypot(this.ball.vx,this.ball.vy);}
  get chapter(){return STORIES[this.character.side].chapters[this.chapterIndex];}
  get top(){return 28;} get bottom(){return this.height-28;}
  get width(){return this.character.width+(this.skill==='wide'?54:0);}
  get enemyWidth(){return this.endless?82:96-this.chapterIndex*5;}
  resize(height:number){const ratio=height/this.height;this.height=height;this.ball.y*=ratio;this.targets.forEach(t=>resizeFlight(t,ratio));}
  move(x:number){this.playerX=clamp(x,16+this.width/2,464-this.width/2);}
  start(){if(this.phase==='intro'){this.phase='playing';this.prepare();}}
  next(){if(this.phase!=='clear')return;if(this.chapterIndex===2){this.phase='ending';return;}this.chapterIndex++;this.hp=Math.min(5,this.hp+1);this.goals=0;this.charge=0;this.clearSkill();this.targets=[];this.phase='intro';}
  startEndless(){if(this.phase!=='ending')return;this.endless=true;this.phase='playing';this.hp=5;this.goals=0;this.charge=0;this.clearSkill();this.targets=[];this.prepare();}
  activate():boolean {
    if(this.phase!=='playing'||this.charge<100||this.skill!==null)return false;
    this.charge=0;this.skill=this.character.skill;
    this.skillTime=({wide:6,slow:5,shot:8,sleep:5,fever:7,guard:8,charge:6})[this.skill];
    this.shot=this.skill==='shot';this.shield=this.skill==='guard';this.move(this.playerX);return true;
  }
  private clearSkill(){this.skill=null;this.skillTime=0;this.shot=false;this.shield=false;}
  private prepare(){this.serve=1.2;this.rallyHits=0;this.aimIn=0;const speed=this.pace.serve+this.chapterIndex*24;this.ball={x:this.playerX,y:this.height*.61,vx:(this.random()<.5?-1:1)*80,vy:speed,radius:8};}
  private award(n:number){const points=n*(this.skill==='fever'?2:1);this.score+=points;return points;}
  advance(seconds:number){const events:Event[]=[];if(this.phase!=='playing')return events;this.accumulator+=clamp(seconds,0,.1);while(this.accumulator>=1/120-1e-9&&this.phase==='playing'){this.accumulator-=1/120;this.step(1/120,events);}return events;}
  private step(dt:number,events:Event[]){
    this.elapsed+=dt;
    if(this.skill){this.skillTime-=dt;if(this.skillTime<=0)this.clearSkill();}
    if(this.serve>0){this.serve=Math.max(0,this.serve-dt);this.ball.x=this.playerX;return;}
    const b=this.ball;this.aimIn-=dt;
    if(this.aimIn<=0){
      this.aimIn=this.pace.reaction;
      if(this.difficulty==='easy')this.aim=b.vy<0?b.x+Math.sin(this.elapsed*1.7)*38:240;
      else {
        // Predict wall bounces, but faster rallies eventually exceed the opponent's accuracy.
        const travel=b.vy<0?Math.max(0,(this.top+6+b.radius-b.y)/b.vy):0;
        const left=16+b.radius,span=448-b.radius*2,period=span*2;
        const projected=((b.x+b.vx*travel-left)%period+period)%period;
        const landing=left+(projected<=span?projected:period-projected);
        const error=5+Math.max(0,this.ballSpeed-this.pace.threshold)*.48;
        this.aim=b.vy<0?landing+Math.sin(this.elapsed*2.1+this.rallyHits)*error:240;
      }
    }
    const ai=(this.difficulty==='easy'?this.chapter.ai:this.pace.ai+this.chapterIndex*22)*(this.skill==='sleep'?.3:1);
    this.enemyX=clamp(this.enemyX+clamp(this.aim-this.enemyX,-ai*dt,ai*dt),16+this.enemyWidth/2,464-this.enemyWidth/2);
    const previousY=b.y;const motion=this.skill==='slow'?.56:1;
    b.x+=b.vx*dt*motion;b.y+=b.vy*dt*motion;
    if(b.x-b.radius<16){b.x=16+b.radius;b.vx=Math.abs(b.vx);}if(b.x+b.radius>464){b.x=464-b.radius;b.vx=-Math.abs(b.vx);}
    const playerPlane=this.bottom-6-b.radius, enemyPlane=this.top+6+b.radius;
    if(b.vy>0&&previousY<=playerPlane&&b.y>=playerPlane&&Math.abs(b.x-this.playerX)<=this.width/2+b.radius){
      b.y=playerPlane;this.bounce(this.playerX,this.width,-1,this.shot);if(this.shot)this.clearSkill();
      this.charge=Math.min(100,this.charge+this.character.charge);events.push({type:'return',x:b.x,y:this.bottom,points:this.award(this.skill==='charge'?30:10)});
    }
    if(b.vy<0&&previousY>=enemyPlane&&b.y<=enemyPlane&&Math.abs(b.x-this.enemyX)<=this.enemyWidth/2+b.radius){b.y=enemyPlane;this.bounce(this.enemyX,this.enemyWidth,1,false);events.push({type:'enemy-return',x:b.x,y:this.top,points:0});}
    for(const t of this.targets)advanceFlight(t,dt);
    for(const t of [...this.targets]){
      const shape=BONUSES[t.kind],rx=shape.radiusX+b.radius,ry=shape.radiusY+b.radius;
      // Collision follows the same heading as the sprite, including diagonal/curved flight.
      const angle=flightAngle(t),cos=Math.cos(angle),sin=Math.sin(angle),worldX=b.x-t.x,worldY=b.y-t.y;
      const dx=worldX*cos+worldY*sin,dy=-worldX*sin+worldY*cos,d=Math.hypot(dx/rx,dy/ry);if(d>1)continue;
      const normal=Math.hypot(dx/(rx*rx),dy/(ry*ry));
      const localNX=normal?dx/(rx*rx)/normal:0,localNY=normal?dy/(ry*ry)/normal:(b.vy>0?-1:1);
      const nx=localNX*cos-localNY*sin,ny=localNX*sin+localNY*cos;
      b.x=d?t.x+worldX/d+nx:t.x+nx*(ry+1);b.y=d?t.y+worldY/d+ny:t.y+ny*(ry+1);
      const dot=(b.vx-t.vx)*nx+(b.vy-(t.vy??0))*ny;if(dot<0){b.vx-=2*dot*nx;b.vy-=2*dot*ny;}
      const speed=clamp(Math.hypot(b.vx,b.vy),this.pace.serve,Math.max(this.pace.cap,550)),ratio=clamp(b.vx/(Math.hypot(b.vx,b.vy)||1),-.85,.85);b.vx=ratio*speed;b.vy=(b.vy<0?-1:1)*Math.sqrt(speed*speed-b.vx*b.vx);
      this.targets=this.targets.filter(v=>v.id!==t.id);events.push({type:'bonus',x:t.x,y:t.y,points:this.award(BONUSES[t.kind].points)});
    }
    this.targets=this.targets.filter(t=>t.x>-120&&t.x<600&&(!t.flight||t.flight.age<=t.flight.duration));
    if(this.elapsed>=this.nextTarget&&this.targets.length<2){this.targets.push(spawnFlight(++this.serial,this.height,this.random));this.nextTarget=this.elapsed+7+this.random()*4;}
    if(b.y-b.radius>this.height){
      if(this.shield){this.clearSkill();this.prepare();events.push({type:'guard',x:b.x,y:this.bottom,points:0});return;}
      this.hp--;events.push({type:'miss',x:b.x,y:this.bottom,points:0});
      this.prepare();if(this.hp===0){this.phase='over';this.targets=[];this.clearSkill();}
    }else if(b.y+b.radius<0){this.goals++;this.totalGoals++;events.push({type:'goal',x:b.x,y:this.top,points:this.award(100)});
      this.prepare();if(this.goals>=3&&!this.endless){this.phase='clear';this.targets=[];this.clearSkill();}
    }
  }
  private bounce(center:number,width:number,dir:number,power:boolean){this.rallyHits++;const base=this.ballSpeed;const speed=power?Math.min(Math.max(550,base+130),Math.max(550,this.pace.cap)):Math.min(this.pace.cap,base+this.pace.gain);const angle=clamp((this.ball.x-center)/(width/2),-1,1)*Math.PI/3;this.ball.vx=Math.sin(angle)*speed;this.ball.vy=dir*Math.cos(angle)*speed;}
}

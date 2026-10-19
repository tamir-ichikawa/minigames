export type Point = { x: number; y: number };
export type Road = { points: Point[]; width: number };
export type Phase = 'title' | 'intro' | 'playing' | 'miss' | 'clear' | 'ending';
export type Hazard = {kind:'patrol';path:Point[];speed:number} | {kind:'chase';start:number;trigger:number;tunnel:number;speed:number};
export type Level = {
  theme:'forest'|'river'|'camp'|'cliff'|'garden'|'dusk'; hazard?:Hazard;
  title: string; subtitle: string; tag: string; story: string; tip: string;
  roads: Road[]; safe: (Point & { radius: number })[];
  start: Point; goal: Point; checkpoint: Point; medals: Point[];
};
const points = (p: number[][]) => p.map(([x, y]) => ({ x, y }));
export const WIDTH = 720, HEIGHT = 820, RADIUS = 9, SPEED = 230;
export const LEVELS: Level[] = [
  {
    theme:'forest',
    title: 'はぐれた森の小道', subtitle: '木漏れ日の向こうへ', tag: 'FOREST PATH',
    story: '栞音と泊まりに来た、山あいのコテージ。\n散歩の途中で別の小道に入り、はぐれてしまった。\n森の向こうに、帰り道の道しるべ。\n栞音を探して、ひとあしずつ進もう。',
    tip: 'ドラッグで移動。指を離すと止まるよ。',
    roads: [
      { points: points([[105,735],[105,610],[300,610],[300,460],[570,460],[570,305],[390,305],[390,140],[610,140]]), width: 76 },
      { points: points([[300,535],[180,535]]), width: 52 },
    ],
    safe: [{x:105,y:735,radius:51},{x:300,y:460,radius:49},{x:610,y:140,radius:48}],
    start: {x:105,y:735}, goal: {x:610,y:140}, checkpoint: {x:300,y:460},
    medals: points([[180,535],[570,385],[390,215]]),
  },
  {
    theme:'river', hazard:{kind:'patrol',path:points([[360,240],[360,645]]),speed:88},
    title: 'ナックルの木橋', subtitle: 'あわてず、ひとやすみ', tag: 'KNUCKLE’S BRIDGE',
    story: '木橋を見張っているのはナックル。\n行ったり来たり、同じ道を歩いている。\n横の待避所で、通りすぎるのを待とう。',
    tip: '丸い待避所でナックルをやり過ごそう。',
    roads: [
      { points: points([[135,735],[360,735],[360,130],[580,130]]), width: 66 },
      { points: points([[360,555],[285,555]]), width: 61 },
      { points: points([[360,375],[435,375]]), width: 61 },
    ],
    safe: [{x:135,y:735,radius:49},{x:285,y:555,radius:40},{x:435,y:375,radius:40},{x:580,y:130,radius:48}],
    start: {x:135,y:735}, goal: {x:580,y:130}, checkpoint: {x:285,y:555},
    medals: points([[285,555],[435,375],[360,195]]),
  },
  {
    theme:'camp', hazard:{kind:'chase',start:150,trigger:395,tunnel:965,speed:155},
    title: 'キャンプ場の抜け道', subtitle: 'スパイクを振りきって', tag: 'CAMP ESCAPE',
    story: 'キャンプ場の先にも、帰り道は続いている。\nスパイクが気づいたら、止まらずに進もう。\n猫だけが通れる抜け穴が、その先にある。',
    tip: '足あとをたどって、猫の抜け穴へ！',
    roads: [
      { points: points([[125,735],[125,580],[330,580],[330,420],[555,420],[555,245],[365,245],[365,125],[580,125]]), width: 74 },
      { points: points([[125,660],[230,660],[230,580]]), width: 49 },
    ],
    safe: [{x:125,y:735,radius:49},{x:330,y:580,radius:48},{x:580,y:125,radius:49}],
    start: {x:125,y:735}, goal: {x:580,y:125}, checkpoint: {x:330,y:580},
    medals: points([[230,660],[435,420],[365,190]]),
  },
  {
    theme:'river',title:'せせらぎの細道',subtitle:'水音を道しるべに',tag:'RIVER BEND',
    story:'川沿いに、小さな道が続いている。\n折り返しでは指を止めて、次の曲がり角を見よう。',tip:'道幅が少し細くなるよ。ゆっくり曲がろう。',
    roads:[{points:points([[90,735],[90,550],[240,550],[240,650],[430,650],[430,430],[200,430],[200,250],[530,250],[530,120],[620,120]]),width:54}],
    safe:[{x:90,y:735,radius:43},{x:430,y:430,radius:42},{x:620,y:120,radius:43}],
    start:{x:90,y:735},goal:{x:620,y:120},checkpoint:{x:430,y:430},medals:points([[240,620],[200,340],[530,185]]),
  },
  {
    theme:'cliff',title:'こもれびの崖道',subtitle:'ななめの一歩',tag:'CLIFF WALK',
    story:'山の斜面を、くねくねした道が登っていく。\n下には柔らかい茂み。あせらず、道の真ん中へ。',tip:'斜めの道は、曲がり角でいったん止まると安心。',
    roads:[{points:points([[125,735],[300,640],[150,500],[350,390],[210,245],[410,140],[600,140]]),width:54}],
    safe:[{x:125,y:735,radius:44},{x:350,y:390,radius:44},{x:600,y:140,radius:44}],
    start:{x:125,y:735},goal:{x:600,y:140},checkpoint:{x:350,y:390},medals:points([[225,570],[280,318],[500,140]]),
  },
  {
    theme:'forest',hazard:{kind:'chase',start:150,trigger:430,tunnel:1155,speed:162},
    title:'倒木のトンネル',subtitle:'小さな体が大活躍',tag:'HOLLOW TREE',
    story:'スパイクが森を回りこんできた！\n大きな倒木に、マロだけが通れる穴がある。',tip:'追いかけられたら、倒木の向こうへ進もう。',
    roads:[{points:points([[140,735],[140,600],[380,600],[380,450],[180,450],[180,280],[520,280],[520,125],[610,125]]),width:66}],
    safe:[{x:140,y:735,radius:44},{x:380,y:600,radius:44},{x:610,y:125,radius:44}],
    start:{x:140,y:735},goal:{x:610,y:125},checkpoint:{x:380,y:600},medals:points([[260,600],[180,360],[520,190]]),
  },
  {
    theme:'river',hazard:{kind:'patrol',path:points([[200,430],[530,430]]),speed:96},
    title:'ナックルの見回り道',subtitle:'左右を見て、ひとやすみ',tag:'RIVERSIDE PATROL',
    story:'今度のナックルは横の道を見回っている。\n上下にふくらんだ待避所を使って、向こう側へ。',tip:'上下の待避所で、ナックルの向きを見よう。',
    roads:[{points:points([[100,735],[100,430],[620,430],[620,130],[470,130]]),width:64},{points:points([[260,430],[260,510]]),width:60},{points:points([[440,430],[440,350]]),width:60}],
    safe:[{x:100,y:735,radius:44},{x:260,y:510,radius:42},{x:440,y:350,radius:42},{x:470,y:130,radius:44}],
    start:{x:100,y:735},goal:{x:470,y:130},checkpoint:{x:260,y:510},medals:points([[260,510],[440,350],[620,240]]),
  },
  {
    theme:'garden',title:'花畑のまわり道',subtitle:'おさかなをたどって',tag:'FLOWER GARDEN',
    story:'花の香りがする庭に出た。\n一度戻る道もあるけれど、ちゃんと先につながっている。',tip:'近くに見える道へ飛び移らず、つながりをたどろう。',
    roads:[{points:points([[100,735],[100,580],[250,580],[250,700],[440,700],[440,500],[590,500],[590,330],[390,330],[390,180],[110,180],[110,100]]),width:52}],
    safe:[{x:100,y:735,radius:44},{x:440,y:500,radius:44},{x:110,y:100,radius:44}],
    start:{x:100,y:735},goal:{x:110,y:100},checkpoint:{x:440,y:500},medals:points([[250,650],[590,390],[250,180]]),
  },
  {
    theme:'dusk',hazard:{kind:'chase',start:160,trigger:445,tunnel:1585,speed:168},
    title:'夕暮れのキャンプ場',subtitle:'灯りのほうへ',tag:'EVENING CAMP',
    story:'テントに灯りがともり始めた。\nスパイクをかわして、コテージへの最後の道へ進もう。',tip:'大きな折り返しも道に沿って。抜け穴は左奥だよ。',
    roads:[{points:points([[100,735],[100,550],[330,550],[330,700],[580,700],[580,470],[380,470],[380,260],[150,260],[150,115],[360,115]]),width:62}],
    safe:[{x:100,y:735,radius:44},{x:330,y:550,radius:44},{x:360,y:115,radius:44}],
    start:{x:100,y:735},goal:{x:360,y:115},checkpoint:{x:330,y:550},medals:points([[210,550],[580,580],[150,185]]),
  },
  {
    theme:'camp',hazard:{kind:'chase',start:160,trigger:450,tunnel:1345,speed:175},
    title:'栞音の待つコテージ',subtitle:'ただいま、栞音',tag:'HOME AT LAST',
    story:'あの窓の灯りは、栞音のコテージ。\n最後の抜け穴を通れば、いつもの腕が待っている。',tip:'最後まで足元を見て。猫の穴を抜けて、栞音のもとへ！',
    roads:[{points:points([[110,735],[310,735],[310,570],[100,570],[100,380],[360,380],[360,200],[585,200],[585,110]]),width:62}],
    safe:[{x:110,y:735,radius:44},{x:310,y:570,radius:44},{x:585,y:110,radius:44}],
    start:{x:110,y:735},goal:{x:585,y:110},checkpoint:{x:310,y:570},medals:points([[310,645],[230,380],[545,200]]),
  },
];
export const TOTAL_MEDALS=LEVELS.reduce((sum,level)=>sum+level.medals.length,0);
export const distance = (a: Point, b: Point) => Math.hypot(a.x-b.x, a.y-b.y);
export function segmentDistance(p: Point, a: Point, b: Point) {
  const dx=b.x-a.x, dy=b.y-a.y, len=dx*dx+dy*dy;
  const t=len ? Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len)) : 0;
  return distance(p,{x:a.x+dx*t,y:a.y+dy*t});
}
export function onRoad(level: Level, p: Point, radius=RADIUS) {
  return level.safe.some(s=>distance(s,p)<=s.radius-radius) || level.roads.some(r=>
    r.points.slice(1).some((b,i)=>segmentDistance(p,r.points[i],b)<=r.width/2-radius));
}
export function pointAlong(path: Point[], progress: number): Point {
  let remaining=Math.max(0,progress);
  for(let i=1;i<path.length;i++) {
    const a=path[i-1],b=path[i],length=distance(a,b);
    if(remaining<=length) return {x:a.x+(b.x-a.x)*remaining/length,y:a.y+(b.y-a.y)*remaining/length};
    remaining-=length;
  }
  return {...path[path.length-1]};
}
export const pathLength=(path:Point[])=>path.slice(1).reduce((sum,p,i)=>sum+distance(path[i],p),0);
export function pathProgress(path: Point[], p: Point) {
  let best=Infinity,result=0,traveled=0;
  for(let i=1;i<path.length;i++) {
    const a=path[i-1],b=path[i],length=distance(a,b),dx=b.x-a.x,dy=b.y-a.y;
    const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(length*length)));
    const d=distance(p,{x:a.x+t*dx,y:a.y+t*dy});
    if(d<best){best=d;result=traveled+t*length;}
    traveled+=length;
  }
  return result;
}
export type StageRecord = { seconds: number; misses: number; medals: number };
export class Adventure {
  phase: Phase='title'; stage=0; pos:Point={...LEVELS[0].start}; target:Point|null=null;
  seconds=0; stageSeconds=0; misses=0; stageMisses=0; medals=new Set<string>();
  checkpoint=false; checkpointNotice=0; deathTimer=0; missReason='';
  clock=0; chase='idle' as 'idle'|'warning'|'chasing'|'escaped'; chaseClock=0; dogProgress=150;
  records:StageRecord[]=[]; event='';
  get level(){return LEVELS[this.stage];}
  get stageMedals(){return this.level.medals.filter((_,i)=>this.medals.has(`${this.stage}:${i}`)).length;}
  get dogBlocked(){const h=this.level.hazard;return h?.kind==='chase'&&this.chase==='escaped'&&this.dogProgress>=h.tunnel-32;}
  get dog():Point|null {
    const h=this.level.hazard;
    if(h?.kind==='patrol'){
      const length=pathLength(h.path),cycle=(this.clock*h.speed)%(length*2);
      return pointAlong(h.path,cycle<=length?cycle:length*2-cycle);
    }
    if(h?.kind==='chase'&&this.chase!=='idle')return pointAlong(this.level.roads[0].points,this.dogProgress);
    return null;
  }
  private resetChase(){this.chase='idle';this.chaseClock=0;this.dogProgress=this.level.hazard?.kind==='chase'?this.level.hazard.start:0;}
  begin(){this.phase='intro';}
  play(){this.phase='playing';this.clearInput();}
  clearInput(){this.target=null;}
  moveTarget(dx:number,dy:number){const t=this.target??this.pos;this.target={x:t.x+dx,y:t.y+dy};}
  fail(reason:string){
    if(this.phase!=='playing')return;
    this.phase='miss';this.misses++;this.stageMisses++;this.missReason=reason;this.deathTimer=1.15;this.clearInput();this.event='miss';
  }
  retry(){
    this.pos={...(this.checkpoint?this.level.checkpoint:this.level.start)};
    this.clock=0;this.resetChase();
    this.clearInput();this.phase='playing';
  }
  next(){
    if(this.phase!=='clear')return;
    if(this.stage===LEVELS.length-1){this.phase='ending';return;}
    this.stage++;this.pos={...this.level.start};this.stageSeconds=0;this.stageMisses=0;
    this.checkpoint=false;this.checkpointNotice=0;this.clock=0;this.resetChase();this.phase='intro';this.clearInput();
  }
  tick(delta:number, keys:Point={x:0,y:0}) {
    this.event='';
    if(this.phase==='miss'){this.deathTimer-=delta;if(this.deathTimer<=0)this.retry();return;}
    if(this.phase!=='playing')return;
    // Fixed-size substeps prevent a fast pointer or slow frame from crossing a gap or a dog.
    const dt=Math.min(delta,.1), steps=Math.max(1,Math.ceil(dt/(1/120)));
    for(let s=0;s<steps&&this.phase==='playing';s++)this.step(dt/steps,keys);
  }
  private step(dt:number,keys:Point){
    this.seconds+=dt;this.stageSeconds+=dt;this.clock+=dt;
    this.checkpointNotice=Math.max(0,this.checkpointNotice-dt);
    let dx=keys.x,dy=keys.y,length=Math.hypot(dx,dy),amount=SPEED*dt;
    if(length===0&&this.target){dx=this.target.x-this.pos.x;dy=this.target.y-this.pos.y;length=Math.hypot(dx,dy);amount=Math.min(amount,length);}
    if(length>.01){
      const next={x:this.pos.x+dx/length*amount,y:this.pos.y+dy/length*amount};
      if(!onRoad(this.level,next)){this.fail('道からころりん！ 茂みでひとやすみ。');return;}
      this.pos=next;
    }
    if(!this.checkpoint && distance(this.pos,this.level.checkpoint)<26){this.checkpoint=true;this.checkpointNotice=3;this.event='checkpoint';}
    this.level.medals.forEach((m,i)=>{
      const key=`${this.stage}:${i}`;
      if(!this.medals.has(key)&&distance(this.pos,m)<23){this.medals.add(key);this.event='medal';}
    });
    const h=this.level.hazard;
    if(h?.kind==='chase'){
      const progress=pathProgress(this.level.roads[0].points,this.pos);
      if(this.chase==='idle'&&progress>h.trigger){this.chase='warning';this.chaseClock=1.4;this.dogProgress=h.start;this.event='warning';}
      if(this.chase==='warning'){this.chaseClock-=dt;if(this.chaseClock<=0)this.chase='chasing';}
      // Crossing changes only the chase state, never the dog's position.
      // Spike keeps walking from his current location and stops at the near side.
      if(progress>h.tunnel+RADIUS&&this.chase!=='escaped'){this.chase='escaped';this.event='escaped';}
      if(this.chase==='chasing'||this.chase==='escaped')this.dogProgress=Math.min(h.tunnel-32,this.dogProgress+h.speed*dt);
    }
    const dog=this.dog;
    if(dog&&!(h?.kind==='chase'&&(this.chase==='warning'||this.chase==='escaped'))&&distance(dog,this.pos)<RADIUS+19){this.fail(h?.kind==='patrol'?'ナックルに見つかった！ 待避所を使おう。':'スパイクが追いついた！ 抜け穴を目指そう。');return;}
    if(distance(this.pos,this.level.goal)<28){
      this.phase='clear';this.clearInput();this.event='clear';
      this.records.push({seconds:this.stageSeconds,misses:this.stageMisses,medals:this.stageMedals});
    }
  }
}

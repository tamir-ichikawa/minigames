import Phaser from 'phaser';
import { WIDTH, HEIGHT, LEVELS, onRoad, pointAlong, type Point } from './model';

/** Scenery is drawn from the same road geometry used by collision, at fixed world coordinates. */
export function paintMap(scene: Phaser.Scene, stage: number) {
  const key=`maro-map-${stage}`;
  if(scene.textures.exists(key))return key;
  const texture=scene.textures.createCanvas(key,WIDTH,HEIGHT)!;
  const c=texture.context,level=LEVELS[stage];
  let seed=177+stage*47;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const ellipse=(x:number,y:number,rx:number,ry:number,color:string)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
  const line=(p:Point[],width:number,color:string,offset=0)=>{
    c.beginPath();p.forEach((v,i)=>i?c.lineTo(v.x,v.y+offset):c.moveTo(v.x,v.y+offset));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();
  };
  const text=(x:number,y:number,t:string,size=15,color='#49614a')=>{c.font=`700 ${size}px system-ui, sans-serif`;c.fillStyle=color;c.textAlign='center';c.fillText(t,x,y);};
  const palette=level.theme==='cliff'?['#c5b793','#a48e70','#746d58']:level.theme==='garden'?['#c4cf9d','#a0b67b','#688b63']:level.theme==='dusk'?['#9a9bab','#747e8b','#485e66']:['#a8bb88','#829c69','#547957'];
  const ground=c.createLinearGradient(0,0,WIDTH,HEIGHT);palette.forEach((color,i)=>ground.addColorStop(i/2,color));c.fillStyle=ground;c.fillRect(0,0,WIDTH,HEIGHT);
  for(let i=0;i<190;i++)ellipse(rand()*WIDTH,rand()*HEIGHT,12+rand()*70,8+rand()*35,['#a5b98322','#c6d49e24','#365f3c12'][i%3]);
  if(level.theme==='river'){
    const river=(width:number,color:string)=>{c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(350,-60);c.bezierCurveTo(500,150,245,325,355,495);c.bezierCurveTo(465,630,355,740,370,880);c.stroke();};
    river(308,'#456e63');river(278,'#95b6a3');river(254,'#79aaa6');river(211,'#80b6b1');
    for(let i=0;i<80;i++){const x=235+rand()*255,y=rand()*HEIGHT;c.strokeStyle='#deefcf35';c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+12,y+4,x+26,y);c.stroke();}
  }
  // Elevation rim and rounded, clearly bounded walking surfaces.
  for(const r of level.roads){line(r.points,r.width+13,'#36543e55',10);line(r.points,r.width+6,'#746c48');line(r.points,r.width,'#ddc89a');line(r.points,r.width-9,'#e6d5ae');}
  for(const s of level.safe){ellipse(s.x,s.y+7,s.radius+5,s.radius+4,'#36543e55');ellipse(s.x,s.y,s.radius+3,s.radius+3,'#746c48');ellipse(s.x,s.y,s.radius,s.radius,'#e6d5ae');}
  if(stage===1){
    c.save();c.beginPath();c.rect(329,190,62,493);c.clip();
    for(let y=190;y<685;y+=22){c.fillStyle=(y%44<22)?'#c19e6c':'#d0ae7a';c.fillRect(329,y,62,20);c.strokeStyle='#805f44';c.lineWidth=1;c.strokeRect(330,y,60,20);ellipse(337,y+5,1.7,1.7,'#78664a');ellipse(383,y+15,1.7,1.7,'#78664a');}
    c.restore();
    for(const x of [322,398]){c.strokeStyle='#70593d';c.lineWidth=4;c.beginPath();c.moveTo(x,191);c.lineTo(x,679);c.stroke();for(let y=205;y<680;y+=72){c.fillStyle='#846540';c.fillRect(x-4,y-13,8,20);ellipse(x,y-13,5,3,'#b99863');}}
  }
  if(level.hazard?.kind==='patrol'&&stage!==1){
    const road=level.roads[0],y=level.hazard.path[0].y;
    const i=road.points.findIndex((p,i)=>p.y===y&&road.points[i+1]?.y===y);
    if(i>=0){
      const left=Math.min(road.points[i].x,road.points[i+1].x),right=Math.max(road.points[i].x,road.points[i+1].x);
      const top=y-road.width/2;
      // Match the deck to the walkable road, not the shorter patrol route.
      // Isolate stroke state: the road's broad outline must never become a plank outline.
      c.save();c.lineWidth=1;c.lineJoin='miter';
      c.beginPath();c.rect(left,top,right-left,road.width);c.clip();
      c.fillStyle='#856b49';c.fillRect(left,top,right-left,road.width);
      for(let x=left;x<right;x+=24){
        c.fillStyle=((x-left)/24)%2?'#c6aa79':'#d2b685';c.fillRect(x+1,top,22,road.width);
        c.strokeStyle='#856b49';c.strokeRect(x+1.5,top+.5,21,road.width-1);
        c.strokeStyle='#ecd0a144';c.beginPath();c.moveTo(x+7,top+9);c.lineTo(x+7,top+road.width-9);c.stroke();
        ellipse(x+12,top+6,1.3,1.3,'#78664a');ellipse(x+12,top+road.width-6,1.3,1.3,'#78664a');
      }
      c.restore();
    }
    for(const bay of level.safe.slice(1,-1))text(bay.x,bay.y+(bay.y<y?-51:57),'待避所',14,'#fbf4dc');
  }
  if(level.theme==='cliff'){
    for(const r of level.roads)line(r.points,r.width+19,'#6d62522a',18);
    // Repaint the walking surface over its cliff-side shadow.
    for(const r of level.roads){line(r.points,r.width,'#ddc89a');line(r.points,r.width-9,'#e6d5ae');}
  }
  // Fine pebbles only inside the playable road.
  for(let i=0;i<530;i++){const p={x:rand()*WIDTH,y:rand()*HEIGHT};if(onRoad(level,p,4)&&!(stage===1&&Math.abs(p.x-360)<34&&p.y>190&&p.y<683))ellipse(p.x,p.y,1+rand()*2,.8+rand(),'#947c4d33');}
  for(const r of level.roads){c.setLineDash([2,17]);line(r.points,2,'#aa8f6244');c.setLineDash([]);}
  const tree=(x:number,y:number,size:number,tint:number)=>{
    ellipse(x+8,y+size*.38,size*.72,size*.29,'#203f3338');
    c.fillStyle='#6a6246';c.fillRect(x-4,y-12,8,size*.5);
    const colors=[['#426547','#628354','#7e9b62'],['#52764d','#77925c','#93aa6d'],['#355e46','#4c7a53','#719464']][tint];
    ellipse(x,y-size*.42,size*.56,size*.65,colors[0]);ellipse(x-size*.22,y-size*.63,size*.45,size*.45,colors[1]);ellipse(x+size*.21,y-size*.54,size*.39,size*.42,colors[1]);ellipse(x-size*.12,y-size*.79,size*.36,size*.31,colors[2]);
    c.strokeStyle='#c7d59b2b';c.lineWidth=2;c.beginPath();c.arc(x-size*.14,y-size*.68,size*.3,3.8,5.2);c.stroke();
  };
  // Leave character paths and waiting bays unobscured by the canopy.
  for(let i=0;i<160;i++){
    const x=rand()*WIDTH,y=rand()*HEIGHT,size=23+rand()*30;
    if(onRoad(level,{x,y:y-size*.3},-size*.9))continue;
    if(level.theme==='river'&&x>205&&x<505)continue;
    if(y<200&&x>490)continue;
    tree(x,y,size,Math.floor(rand()*3));
  }
  for(let i=0;i<190;i++){
    const x=rand()*WIDTH,y=rand()*HEIGHT;
    if(onRoad(level,{x,y},-15)||(level.theme==='river'&&x>200&&x<510))continue;
    c.strokeStyle='#c7d59b66';c.lineWidth=1.4;c.beginPath();c.moveTo(x-5,y-6);c.lineTo(x,y);c.lineTo(x+3,y-9);c.stroke();
    if(i%4===0){ellipse(x+5,y-3,2.5,2.5,'#f1d8a6');ellipse(x+5,y-3,.9,.9,'#d09e5b');}
  }
  if(level.theme==='garden')for(let i=0;i<160;i++){
    const x=rand()*WIDTH,y=rand()*HEIGHT;if(onRoad(level,{x,y},-35))continue;
    for(let j=0;j<5;j++)ellipse(x+Math.cos(j*1.256)*4,y+Math.sin(j*1.256)*4,3,3,['#efd2bb','#d2b9cc','#f4e7a9'][i%3]);
    ellipse(x,y,2,2,'#b28d4d');
  }
  // Checkpoint: a round mossy clearing and a small leaf pennant.
  const cp=level.checkpoint;
  ellipse(cp.x,cp.y,28,28,'#89a87c55');c.setLineDash([4,5]);c.strokeStyle='#668c62';c.lineWidth=2;c.beginPath();c.arc(cp.x,cp.y,31,0,Math.PI*2);c.stroke();c.setLineDash([]);
  c.fillStyle='#79684b';c.fillRect(cp.x-30,cp.y-63,3,32);c.fillStyle='#376c55';c.beginPath();c.moveTo(cp.x-27,cp.y-63);c.lineTo(cp.x-6,cp.y-58);c.lineTo(cp.x-27,cp.y-49);c.fill();
  if(stage===1){
    text(277,610,'待避所',14,'#fbf4dc');text(446,431,'待避所',14,'#fbf4dc');
    // Little shore rocks.
    for(const [x,y]of [[219,180],[490,525],[205,690]]){ellipse(x,y,22,13,'#526f61');ellipse(x-3,y-6,20,13,'#a0ad90');ellipse(x-7,y-10,10,5,'#c4ceb0');}
  }
  if(level.theme==='camp'||level.theme==='dusk'){
    const tent=(x:number,y:number,color:string)=>{if(onRoad(level,{x,y},-75))return;ellipse(x+5,y+34,62,16,'#24452d38');c.fillStyle=color;c.beginPath();c.moveTo(x-55,y+35);c.lineTo(x,y-43);c.lineTo(x+60,y+35);c.closePath();c.fill();c.fillStyle='#e8d6aa';c.beginPath();c.moveTo(x-55,y+35);c.lineTo(x,y-43);c.lineTo(x+6,y+35);c.fill();c.fillStyle='#524d39';c.beginPath();c.moveTo(x-17,y+35);c.lineTo(x-4,y-3);c.lineTo(x+6,y+35);c.fill();};
    tent(180,385,'#bb7f55');tent(485,650,'#6f8f7b');
    if(!onRoad(level,{x:475,y:530},-55)){c.fillStyle='#796445';c.fillRect(440,515,70,35);c.strokeStyle='#594e37';c.lineWidth=3;c.strokeRect(440,515,70,35);c.beginPath();c.moveTo(440,515);c.lineTo(510,550);c.moveTo(510,515);c.lineTo(440,550);c.stroke();}
  }
  if(level.hazard?.kind==='chase'){
    const tunnel=pointAlong(level.roads[0].points,level.hazard.tunnel),ahead=pointAlong(level.roads[0].points,level.hazard.tunnel+1);
    // Hollow log across the route: the small cat fits, Spike does not.
    c.save();c.translate(tunnel.x,tunnel.y);c.rotate(Math.atan2(ahead.y-tunnel.y,ahead.x-tunnel.x)+Math.PI/2);c.fillStyle='#765e40';c.fillRect(-58,-21,116,42);ellipse(0,0,37,25,'#b49869');ellipse(0,0,24,17,'#3d4d37');c.strokeStyle='#d0b481';c.lineWidth=3;c.beginPath();c.ellipse(0,0,32,21,0,0,Math.PI*2);c.stroke();c.restore();
    text(tunnel.x,tunnel.y-47,'ねこ専用',14,'#fcf1d4');
  }
  // Goal sign / final cottage.
  const goal=level.goal;
  if(stage===LEVELS.length-1){
    const x=goal.x,y=Math.max(85,goal.y-37);
    ellipse(x,y+23,63,22,'#23493644');c.fillStyle='#eadcbb';c.fillRect(x-43,y-37,86,66);c.fillStyle='#9b624c';c.beginPath();c.moveTo(x-58,y-34);c.lineTo(x,y-77);c.lineTo(x+58,y-34);c.closePath();c.fill();
    c.strokeStyle='#785844';c.lineWidth=4;c.beginPath();c.moveTo(x-58,y-34);c.lineTo(x,y-77);c.lineTo(x+58,y-34);c.stroke();c.fillStyle='#576c50';c.fillRect(x-13,y-8,26,37);
    for(const off of [-29,29]){c.fillStyle='#eebf68';c.fillRect(x+off-9,y-22,18,18);c.strokeStyle='#9d8055';c.lineWidth=2;c.strokeRect(x+off-9,y-22,18,18);}
    text(x,y+53,'栞音のコテージ',15,'#3b5740');
  } else {
    c.fillStyle='#806748';c.fillRect(goal.x-3,goal.y-72,6,37);c.fillStyle='#f0dfaf';c.beginPath();c.moveTo(goal.x-42,goal.y-81);c.lineTo(goal.x+29,goal.y-81);c.lineTo(goal.x+43,goal.y-67);c.lineTo(goal.x+29,goal.y-54);c.lineTo(goal.x-42,goal.y-54);c.closePath();c.fill();text(goal.x-3,goal.y-61,'つぎの道',14);
  }
  c.strokeStyle='#f5e6b8';c.lineWidth=3;c.setLineDash([5,6]);c.beginPath();c.arc(goal.x,goal.y,32,0,Math.PI*2);c.stroke();c.setLineDash([]);
  text(level.start.x,level.start.y+51,'START',13,'#ecedd2');
  // Map corner compass and small editorial chapter mark.
  c.save();c.translate(635,723);c.strokeStyle='#e6e8c480';c.lineWidth=1;c.beginPath();c.arc(0,0,29,0,Math.PI*2);c.moveTo(0,-37);c.lineTo(0,37);c.moveTo(-37,0);c.lineTo(37,0);c.stroke();c.fillStyle='#e9e6bb';c.beginPath();c.moveTo(0,-22);c.lineTo(6,11);c.lineTo(0,5);c.lineTo(-6,11);c.closePath();c.fill();text(0,-45,'N',11,'#eff0d3');c.restore();
  c.textAlign='left';c.font='600 11px system-ui';c.fillStyle='#e8eacbaa';c.fillText(`MARO’S FIELD NOTES   /   ${String(stage+1).padStart(2,'0')}`,32,HEIGHT-10);
  // Warm sun rays, very subtle paper grain, and quiet framing.
  const glow=c.createRadialGradient(500,70,10,500,70,600);glow.addColorStop(0,'#fff4c524');glow.addColorStop(1,'#fff4c500');c.fillStyle=glow;c.fillRect(0,0,WIDTH,HEIGHT);
  for(let i=0;i<7500;i++){c.fillStyle=i%2?'#fff4d00a':'#1d3b2707';c.fillRect(rand()*WIDTH,rand()*HEIGHT,1,1);}
  texture.refresh();return key;
}

/** Trim transparent margins at texture-frame level; original PNG files remain untouched. */
export function trimFrame(scene:Phaser.Scene,key:string,name:string,left=0,right?:number) {
  const texture=scene.textures.get(key),source=texture.getSourceImage() as HTMLImageElement;
  const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
  const c=canvas.getContext('2d',{willReadFrequently:true})!;c.drawImage(source,0,0);
  const data=c.getImageData(0,0,source.width,source.height).data;
  let minX=right??source.width,minY=source.height,maxX=left,maxY=0;
  for(let y=0;y<source.height;y++)for(let x=left;x<(right??source.width);x++)if(data[(y*source.width+x)*4+3]>100){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  texture.add(name,0,minX,minY,maxX-minX+1,maxY-minY+1);
}

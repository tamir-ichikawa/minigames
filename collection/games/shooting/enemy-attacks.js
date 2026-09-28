/* Per-hull weapons. All delays and steering are simulation ticks (60 Hz). */
(function(root) {
  const profiles = {
    u3_fighter:{label:'ツイン・バレット',interval:160,warning:24,kind:'diamond',color:'#ff7084'},
    u3_support:{label:'サポート・ファン',interval:190,warning:30,kind:'orb',color:'#58dfff'},
    u3_speed:{label:'ニードル連射',interval:170,warning:24,kind:'needle',color:'#ff7ee8'},
    u3_gunship:{label:'照準ランス',interval:210,warning:42,kind:'lance',color:'#c98cff'},
    u3_drone:{label:'6方向リング',interval:240,warning:36,kind:'ring',color:'#67ecff'},
    u3_armor:{label:'重装3連砲',interval:225,warning:42,kind:'heavy',color:'#ffba62'},
    u4_fighter:{label:'交互3連射',interval:170,warning:24,kind:'diamond',color:'#79baff'},
    u4_seeker:{label:'短時間追尾ミサイル',interval:240,warning:42,kind:'missile',color:'#ff81cb'},
    u4_cluster:{label:'分裂クラスター',interval:260,warning:42,kind:'cluster',color:'#7bbcff'},
    u4_scout:{label:'蛇行ニードル',interval:195,warning:24,kind:'needle',color:'#8dff9d'},
    u4_hunter:{label:'狙撃バースト',interval:205,warning:36,kind:'diamond',color:'#ff6c68'},
    u4_float:{label:'漂うプラズマ',interval:220,warning:30,kind:'orb',color:'#d4a2ff'},
    u4_aegis:{label:'シールド・アーク',interval:270,warning:42,kind:'heavy',color:'#ffd675'},
    u4_ring:{label:'二重リング',interval:300,warning:42,kind:'ring',color:'#67fff0'},
    u4_turret:{label:'チャージ3連砲',interval:240,warning:48,kind:'lance',color:'#ff9d4e'},
    u4_bomb:{label:'時間差ボム',interval:280,warning:42,kind:'mine',color:'#ff8add'},
    u4_spinner:{label:'回転4方向弾',interval:210,warning:30,kind:'star',color:'#db7dff'},
    u4_layer:{label:'すき間付き弾幕',interval:250,warning:36,kind:'diamond',color:'#b6a6ff'},
  };
  function plan(id,aim,round=0) {
    const p=profiles[id], shots=[];
    const add=(angle,speed=2,extra={})=>shots.push({angle,speed,kind:p.kind,color:p.color,size:10,delay:0,...extra});
    const fan=(n,angle,step,speed,extra={})=>{for(let i=0;i<n;i++)add(angle+(i-(n-1)/2)*step,speed,extra);};
    switch(id){
      case 'u3_fighter': for(const x of [-11,11])add(Math.PI/2,2.4,{x});break;
      case 'u3_support': fan(3,aim,.3,1.9);break;
      case 'u3_speed': for(let i=0;i<3;i++)add(Math.PI/2,2.9,{delay:i*10,size:8});break;
      case 'u3_gunship': add(aim,3,{size:12});break;
      case 'u3_drone': for(let i=0;i<6;i++)add(i*Math.PI/3+Math.PI/6,1.55);break;
      case 'u3_armor': fan(3,Math.PI/2,.38,1.65,{size:14});break;
      case 'u4_fighter': for(let i=0;i<3;i++)add(Math.PI/2,2.3,{x:i%2?12:-12,delay:i*12});break;
      case 'u4_seeker': add(aim,1.85,{homing:50,size:12});break;
      case 'u4_cluster': add(aim,1.6,{split:65,children:3,size:14});break;
      case 'u4_scout': for(const x of [-10,10])add(Math.PI/2,2.3,{x,wave:.022,phase:x,size:8});break;
      case 'u4_hunter': for(let i=0;i<3;i++)add(aim,2.65,{delay:i*14});break;
      case 'u4_float': for(const side of [-1,1])add(aim+side*.22,1.65,{wave:.025,phase:side*2,size:13});break;
      case 'u4_aegis': fan(5,Math.PI/2,.34,1.5,{size:12});break;
      case 'u4_ring': for(let j=0;j<2;j++)for(let i=0;i<6;i++)add(i*Math.PI/3+j*.2,1.45,{delay:j*24});break;
      case 'u4_turret': for(let i=0;i<3;i++)add(aim+(i-1)*.16,2.5,{delay:i*8,size:12});break;
      case 'u4_bomb': add(Math.PI/2,1.35,{split:110,children:6,stop:32,size:15});break;
      case 'u4_spinner': for(let i=0;i<4;i++)add(i*Math.PI/2+round*.45,1.85,{spin:true,size:12});break;
      case 'u4_layer': for(let i=0;i<5;i++)if(i!==round%5)add(Math.PI/2,1.9,{x:(i-2)*22});break;
    }
    return shots;
  }
  const bossLabels=['扇状弾・交差弾','時間差レーン砲','周回リング','双翼ランス','蛇行プラズマ','星形弾・すき間弾'];
  function bossPlan(b) {
    const shots=[], variant=b.attackPattern%2, phase=b.phase;
    const add=(angle,speed=1.8,extra={})=>shots.push({angle,speed,size:12,delay:0,kind:'diamond',color:'#ff85db',...extra});
    const fan=(n,angle,step,extra={})=>{for(let i=0;i<n;i++)add(angle+(i-(n-1)/2)*step,1.7+phase*.12,extra);};
    switch(b.skin){
      case 'nemesis':
        if(!variant)fan(5+phase,Math.PI/2,.27);
        else for(const side of [-1,1])fan(3,b.aim-side*.18,.24,{x:side*34,color:'#ff718d'});
        break;
      case 'deus':
        for(let i=0;i<5+phase;i++)add(Math.PI/2,1.9,{x:(i-(4+phase)/2)*27,delay:(i%2)*22,kind:'lance',color:'#cb98ff'});
        if(variant)fan(3,b.aim,.3,{delay:34,color:'#ff89d1'});
        break;
      case 'omega':
        for(let i=0;i<8+phase*2;i++)add(i/(8+phase*2)*Math.PI*2+variant*.22,1.5,{kind:'ring',color:'#ee95ff'});
        break;
      case 'maiden':
        for(const side of [-1,1])fan(2+phase,b.aim+side*.08,.28,{x:side*34,kind:'lance',color:'#8edfff',delay:variant?Math.max(0,side)*20:0});
        break;
      case 'behemoth':
        fan(4+phase,Math.PI/2,.38,{kind:'orb',color:'#d995ff',wave:.018,phase:variant*2});
        if(variant)fan(3,b.aim,.34,{delay:28,color:'#ff87c9'});
        break;
      case 'celestial':
        if(!variant)for(let i=0;i<9+phase;i++)add(i/(9+phase)*Math.PI*2+.15,1.6,{kind:'star',color:'#ffe09a',spin:true});
        else for(let i=0;i<7+phase;i++)if(i!==3) add(Math.PI/2+(i-(6+phase)/2)*.24,1.9,{kind:'diamond',color:'#87cfff'});
        break;
    }
    return shots;
  }
  function emit(shot,x,y) {
    const angle=shot.angle, size=shot.size||10;
    return {...shot,x:x+(shot.x||0),y:y+(shot.y||0),vx:Math.cos(angle)*shot.speed,vy:Math.sin(angle)*shot.speed,
      w:size,h:size,radius:size*.42,age:0};
  }
  function step(b,target) {
    b.age=(b.age||0)+1;
    if(b.homing&&b.age<=b.homing){
      const delta=Math.atan2(Math.sin(Math.atan2(target.y-b.y,target.x-b.x)-b.angle),Math.cos(Math.atan2(target.y-b.y,target.x-b.x)-b.angle));
      b.angle+=Math.max(-.014,Math.min(.014,delta));
    }
    if(b.wave)b.angle+=Math.cos(b.age*.12+(b.phase||0))*b.wave;
    if(b.kind){
      const speed=b.stop&&b.age>=b.stop?0:b.speed;
      b.vx=Math.cos(b.angle)*speed;b.vy=Math.sin(b.angle)*speed;
    }
    b.x+=b.vx;b.y+=b.vy;
    if(b.split&&b.age===b.split){
      const children=[];
      for(let i=0;i<b.children;i++){
        const angle=b.kind==='mine'?i/b.children*Math.PI*2:b.angle+(i-(b.children-1)/2)*.36;
        children.push(emit({angle,speed:1.8,kind:'diamond',color:b.color,size:9},b.x,b.y));
      }
      return children;
    }
    return null;
  }
  function draw(context,b) {
    const r=b.w/2;
    context.save();context.translate(b.x,b.y);
    context.rotate((b.angle??Math.PI/2)+(b.spin?(b.age||0)*.08:0));
    context.fillStyle=b.color;context.strokeStyle=b.color;context.lineWidth=1.5;
    // Glow and trails are decoration: collisions use only the small solid core.
    context.globalAlpha=.16;context.beginPath();context.arc(0,0,r*1.7,0,Math.PI*2);context.fill();context.globalAlpha=1;
    context.beginPath();
    if(['needle','lance','missile'].includes(b.kind)){
      context.moveTo(r*1.5,0);context.lineTo(-r,-r*.55);context.lineTo(-r*.6,0);context.lineTo(-r,r*.55);
    }else if(['diamond','star'].includes(b.kind)){
      const n=b.kind==='star'?8:4;
      for(let i=0;i<n;i++){const a=i/n*Math.PI*2,s=b.kind==='star'&&i%2?.45:1;context.lineTo(Math.cos(a)*r*s,Math.sin(a)*r*s);}
    }else context.arc(0,0,r,0,Math.PI*2);
    context.closePath();
    if(b.kind==='ring')context.stroke();else context.fill();
    context.fillStyle='#fff9f4';context.beginPath();context.arc(0,0,Math.max(1.4,r*.3),0,Math.PI*2);context.fill();
    if(b.kind==='mine'||b.kind==='cluster'){
      context.strokeStyle='#fff';context.globalAlpha=.5+Math.sin((b.age||0)*.25)*.4;
      context.beginPath();context.arc(0,0,r+3,0,Math.PI*2);context.stroke();
    }
    context.restore();
  }
  root.EnemyAttacks={profiles,plan,bossPlan,bossLabels,emit,step,draw};
})(typeof window==='undefined'?globalThis:window);

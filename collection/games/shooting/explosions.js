(function(root) {
  const types=['fire','plasma','ion','shrapnel','nova'];
  const names=['火炎爆発','プラズマ衝撃波','イオン閃光','装甲破片','重力ノヴァ'];
  const active=[];
  let sheets={};
  const rand=(i)=>{const n=Math.sin(i*78.233+12.9898)*43758.5453;return n-Math.floor(n);};
  function drawFrame(ctx,type,t,size=128) {
    const c=size/2, life=Math.max(0,1-t), growth=Math.sin(Math.min(1,t*1.6)*Math.PI/2);
    ctx.save();ctx.translate(c,c);
    const palette={fire:['#fffbc1','#ffae36','#ef4517'],plasma:['#ffe6ff','#cc65ff','#503aff'],ion:['#ffffff','#73efff','#278aff'],shrapnel:['#ffedb3','#f2a047','#705963'],nova:['#ffffff','#ffa9ed','#b63aff']}[type];
    const radius=(8+growth*38)*(type==='nova'&&t<.35?1-t:1);
    const glow=ctx.createRadialGradient(0,0,0,0,0,radius);
    glow.addColorStop(0,palette[0]);glow.addColorStop(.22,palette[1]);glow.addColorStop(1,'transparent');
    ctx.globalAlpha=life;ctx.fillStyle=glow;ctx.fillRect(-radius,-radius,radius*2,radius*2);
    if(type==='fire') {
      for(let i=0;i<9;i++){const a=i*2.4,r=growth*25;ctx.fillStyle=palette[i%3];ctx.globalAlpha=life*.75;
        ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r,(5+rand(i)*10)*life+.5,0,Math.PI*2);ctx.fill();}
    } else if(type==='plasma'||type==='nova') {
      ctx.strokeStyle=palette[1];ctx.lineWidth=4*life+.4;ctx.globalAlpha=life;
      ctx.beginPath();ctx.ellipse(0,0,radius*1.2,radius*(type==='nova'?.4:1),0,0,Math.PI*2);ctx.stroke();
      for(let i=0;i<12;i++){const a=i*Math.PI/6;ctx.beginPath();ctx.moveTo(Math.cos(a)*radius*.65,Math.sin(a)*radius*.65);
        ctx.lineTo(Math.cos(a+.08)*radius,Math.sin(a+.08)*radius);ctx.lineTo(Math.cos(a)*radius*1.15,Math.sin(a)*radius*1.15);ctx.stroke();}
    } else if(type==='ion') {
      ctx.strokeStyle='#bafaff';ctx.lineWidth=3*life+.3;
      for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*6,Math.sin(a)*6);
        ctx.lineTo(Math.cos(a)*radius*(i%2?.7:1.25),Math.sin(a)*radius*(i%2?.7:1.25));ctx.stroke();}
    } else {
      for(let i=0;i<12;i++){const a=i*2.4,d=(12+rand(i)*34)*growth;ctx.save();ctx.translate(Math.cos(a)*d,Math.sin(a)*d);ctx.rotate(a+t*4);
        ctx.fillStyle=i%2?'#e9c497':'#75808e';ctx.globalAlpha=life;ctx.fillRect(-3,-2,5+rand(i+3)*5,3);ctx.restore();}
      ctx.strokeStyle='#ffbc50';ctx.lineWidth=1;for(let i=0;i<8;i++){const a=i*.785;ctx.beginPath();ctx.moveTo(Math.cos(a)*radius*.8,Math.sin(a)*radius*.8);ctx.lineTo(Math.cos(a)*radius*1.2,Math.sin(a)*radius*1.2);ctx.stroke();}
    }
    ctx.restore();
  }
  function prepare(images){sheets=images;}
  function spawn(x,y,size,type,delay=0) {
    if(active.length>=70)active.shift();
    active.push({x,y,size,type:types.includes(type)?type:types[Math.floor(Math.random()*types.length)],age:-delay,duration:36});
  }
  function update(){for(let i=active.length-1;i>=0;i--)if(++active[i].age>=active[i].duration)active.splice(i,1);}
  function draw(context){for(const fx of active){const sheet=sheets['fx_'+fx.type];if(!sheet||fx.age<0)continue;const f=Math.min(7,Math.floor(fx.age/fx.duration*8));
    context.drawImage(sheet,f*128,0,128,128,fx.x-fx.size/2,fx.y-fx.size/2,fx.size,fx.size);}}
  function clear(){active.length=0;}
  root.Explosions={types,names,drawFrame,prepare,spawn,update,draw,clear};
})(typeof window === 'undefined' ? globalThis : window);

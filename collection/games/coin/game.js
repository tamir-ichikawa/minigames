
(function(){
var C=document.getElementById('c'),X=C.getContext('2d');
var W=380,H=640;C.width=W;C.height=H;
function resize(){var r=Math.min(window.innerWidth/W,GameShell.height()/H);C.style.width=Math.floor(W*r)+'px';C.style.height=Math.floor(H*r)+'px';}
resize();window.addEventListener('resize',resize);

var state='menu',basket,items,score,best,lives,frame,effects,combo;
try{best=parseInt(localStorage.getItem('cn1'))||0;}catch(e){best=0;}

var COINS=[
  {emoji:'🪙',pts:10,size:28},{emoji:'💰',pts:25,size:30},{emoji:'💎',pts:50,size:24},
  {emoji:'⭐',pts:15,size:26}
];
var BADS=[{emoji:'💣',pts:-1,size:28},{emoji:'🪨',pts:-1,size:30}];

function reset(){
  GameShell.beginRound();
  basket={x:W/2,w:70};items=[];score=0;lives=5;frame=0;effects=[];combo=0;
}

function spawn(){
  var r=Math.random();
  var isBad=r<0.15;
  var tmpl=isBad?BADS[Math.floor(Math.random()*BADS.length)]:COINS[Math.floor(Math.random()*COINS.length)];
  var spd=2+frame*0.003;if(spd>5.5)spd=5.5;
  items.push({x:20+Math.random()*(W-40),y:-30,vy:spd+Math.random(),emoji:tmpl.emoji,pts:tmpl.pts,size:tmpl.size,bad:isBad});
}

C.addEventListener('touchstart',function(e){e.preventDefault();if(state!=='play'){if(state==='menu')state='play';if(state==='over')state='menu';reset();return;}},{passive:false});
C.addEventListener('mousedown',function(e){e.preventDefault();if(state!=='play'){if(state==='menu'){state='play';reset();}else if(state==='over'){state='menu';}return;}});
C.addEventListener('touchmove',function(e){e.preventDefault();if(state!=='play')return;var rect=C.getBoundingClientRect();basket.x=(e.touches[0].clientX-rect.left)/rect.width*W;},{passive:false});
C.addEventListener('mousemove',function(e){if(state!=='play')return;var rect=C.getBoundingClientRect();basket.x=(e.clientX-rect.left)/rect.width*W;});

function drawBg(){
  var g=X.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#1565C0');g.addColorStop(0.6,'#1976D2');g.addColorStop(1,'#0D47A1');
  X.fillStyle=g;X.fillRect(0,0,W,H);
}

function drawBasket(){
  var bx=basket.x,by=H-55,bw=basket.w;
  if(bx<bw/2)bx=bw/2;if(bx>W-bw/2)bx=W-bw/2;
  basket.x=bx;
  // Basket body
  X.fillStyle='#8D6E63';
  X.beginPath();X.moveTo(bx-bw/2,by);X.lineTo(bx-bw/2+8,by+30);X.lineTo(bx+bw/2-8,by+30);X.lineTo(bx+bw/2,by);X.closePath();X.fill();
  // Rim
  X.strokeStyle='#5D4037';X.lineWidth=3;
  X.beginPath();X.moveTo(bx-bw/2-3,by);X.lineTo(bx+bw/2+3,by);X.stroke();
  // Bunny on basket
  X.font='24px serif';X.textAlign='center';X.textBaseline='bottom';
  X.fillText('🪙',bx,by-2);
}

function drawItems(){
  X.textAlign='center';X.textBaseline='middle';
  for(var i=0;i<items.length;i++){
    var it=items[i];
    X.font=it.size+'px serif';
    X.fillText(it.emoji,it.x,it.y);
  }
}

function drawEffects(){
  for(var i=effects.length-1;i>=0;i--){
    var e=effects[i];e.life--;e.y-=1.2;
    if(e.life<=0){effects.splice(i,1);continue;}
    X.globalAlpha=e.life/20;
    X.font='bold 18px sans-serif';X.textAlign='center';X.fillStyle=e.color;
    X.fillText(e.text,e.x,e.y);
    X.globalAlpha=1;
  }
}

function drawHUD(){
  X.save();X.font='bold 16px sans-serif';X.textAlign='left';X.fillStyle='#fff';
  X.fillText('スコア: '+score,12,28);
  X.textAlign='right';X.font='14px serif';
  var hp='';for(var i=0;i<lives;i++)hp+='💖';for(var i=lives;i<5;i++)hp+='🖤';
  X.fillText(hp,W-12,28);
  if(combo>2){X.textAlign='center';X.font='bold 20px sans-serif';X.fillStyle='#FFD740';X.fillText(combo+' COMBO!',W/2,55);}
  X.restore();
}

function drawMenu(){
  drawBg();
  X.save();X.textAlign='center';X.textBaseline='middle';
  X.font='bold 26px sans-serif';X.fillStyle='#FFD740';
  X.fillText('コインキャッチ',W/2,H*0.15);
  var fy=Math.sin(GameShell.now()/400)*10;
  X.font='50px serif';X.fillText('🪙🪙',W/2,H*0.32+fy);
  X.font='15px sans-serif';X.fillStyle='#aaa';
  X.fillText('左右にスワイプでバスケットを動かして',W/2,H*0.48);
  X.fillText('🪙💰💎をキャッチ！💣は避けてね！',W/2,H*0.53);
  if(best>0){X.font='14px sans-serif';X.fillStyle='#888';X.fillText('🏆 ベスト: '+best,W/2,H*0.60);}
  X.font='18px sans-serif';X.fillStyle='#FF80AB';
  X.fillText('タップで開始！',W/2,H*0.72);
  X.restore();
}

function drawOver(){
  X.fillStyle='rgba(0,0,0,0.5)';X.fillRect(0,0,W,H);
  X.save();X.textAlign='center';X.textBaseline='middle';
  X.font='bold 26px sans-serif';X.fillStyle=score>=best&&score>0?'#FFD740':'#FF5252';
  X.fillText(score>=best&&score>0?'🎉 ハイスコア！':'ゲームオーバー😢',W/2,H*0.28);
  X.font='20px sans-serif';X.fillStyle='#fff';
  X.fillText('スコア: '+score,W/2,H*0.38);
  X.fillStyle='#ccc';X.fillText('🏆 ベスト: '+best,W/2,H*0.45);
  X.font='16px sans-serif';X.fillStyle='#FF80AB';
  X.fillText('タップでタイトルへ',W/2,H*0.60);
  X.restore();
}

function update(){
  if(state!=='play')return;
  frame++;
  if(frame%Math.max(12,35-Math.floor(frame/60))===0)spawn();

  for(var i=items.length-1;i>=0;i--){
    var it=items[i];it.y+=it.vy;
    // Catch check
    var bx=basket.x,by=H-55,bw=basket.w;
    if(it.y>by-5&&it.y<by+25&&Math.abs(it.x-bx)<bw/2+5){
      if(it.bad){
        lives--;combo=0;
        effects.push({x:it.x,y:it.y,text:'💥',life:20,color:'#FF5252'});
        if(lives<=0){state='over';if(score>best){best=score;try{localStorage.setItem('cn1',best);}catch(e){}}}
      }else{
        combo++;var pts=it.pts+Math.floor(combo*2);
        score+=pts;
        effects.push({x:it.x,y:it.y,text:'+'+pts,life:20,color:'#FFD740'});
      }
      items.splice(i,1);continue;
    }
    if(it.y>H+30){
      if(!it.bad){combo=0;} // Missing a coin resets combo
      items.splice(i,1);
    }
  }
}

function loop(){
  X.clearRect(0,0,W,H);
  if(state==='menu'){drawMenu();}
  else if(state==='play'){update();drawBg();drawItems();drawBasket();drawEffects();drawHUD();}
  else{drawBg();drawBasket();drawOver();}
  requestAnimationFrame(loop);
}
loop();
})();

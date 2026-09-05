
(function(){
const {requestAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval}=GameShell.clock;
var C=document.getElementById('c');
var X=C.getContext('2d');
var W=360,H=640;
C.width=W;C.height=H;
function resize(){var r=Math.min(window.innerWidth/W,GameShell.height()/H);C.style.width=Math.floor(W*r)+'px';C.style.height=Math.floor(H*r)+'px';}
resize();window.addEventListener('resize',resize);

var state='menu';
var COLORS=['#FF6B9D','#7C4DFF','#00BCD4','#FFD740','#FF5722','#66BB6A','#FF80AB','#42A5F5'];
var perfectStreak=0,perfectUntil=0,offcuts=[];
var blocks,moving,baseY,blockH,speed,score,best,gameOver;
blockH=28;
try{best=parseInt(localStorage.getItem('tsm1'))||0;}catch(e){best=0;}

function reset(){
  GameShell.beginRound();
  blocks=[];offcuts=[];perfectStreak=0;perfectUntil=0;
  var startW=160;
  blocks.push({x:W/2-startW/2,w:startW,color:COLORS[0]});
  baseY=H-60;
  speed=2;score=0;gameOver=false;
  spawnMoving();
}

function spawnMoving(){
  var prev=blocks[blocks.length-1];
  var w=prev.w;
  var color=COLORS[blocks.length%COLORS.length];
  moving={x:-w,w:w,dir:1,color:color};
  speed=2+blocks.length*0.15;
  if(speed>6)speed=6;
}

function place(){
  if(!moving||gameOver)return;
  var prev=blocks[blocks.length-1];
  var overlapStart=Math.max(moving.x,prev.x);
  var overlapEnd=Math.min(moving.x+moving.w,prev.x+prev.w);
  var overlapW=overlapEnd-overlapStart;

  if(overlapW<=0){
    gameOver=true;
    state='over';
    if(score>best){best=score;try{localStorage.setItem('tsm1',best);}catch(e){}}
    return;
  }

  if(Math.abs(moving.x-prev.x)<=6){perfectStreak++;overlapStart=prev.x;overlapW=Math.min(180,prev.w+(perfectStreak>=3?8:0));overlapStart=Math.max(0,Math.min(W-overlapW,overlapStart));perfectUntil=GameShell.now()+800;}else perfectStreak=0;
  if(!perfectStreak){const y=baseY-blocks.length*blockH;if(moving.x<overlapStart)offcuts.push({x:moving.x,y,w:overlapStart-moving.x,vy:0,color:moving.color});if(moving.x+moving.w>overlapEnd)offcuts.push({x:overlapEnd,y,w:moving.x+moving.w-overlapEnd,vy:0,color:moving.color});}
  blocks.push({x:overlapStart,w:overlapW,color:moving.color});
  score++;
  moving=null;

  // Scroll if too high
  if(blocks.length*blockH>H*0.6){
    baseY+=blockH;
  }

  spawnMoving();
}

function onInput(e){
  if(e)e.preventDefault();
  if(state==='menu'){state='play';reset();return;}
  if(state==='over'){state='play';reset();return;}
  place();
}
C.style.touchAction='none';C.addEventListener('pointerdown',e=>{if(e.isPrimary)onInput(e);});
document.addEventListener('keydown',function(e){if(e.code==='Space'){e.preventDefault();onInput(null);}});

function drawBg(){
  var g=X.createLinearGradient(0,0,0,H);
  g.addColorStop(0,['#0D0D2B','#173856','#493d69','#795758'][Math.floor((score||0)/10)%4]);g.addColorStop(0.7,'#1A1A3E');g.addColorStop(1,'#2D1B69');
  X.fillStyle=g;X.fillRect(0,0,W,H);
}

function drawBlocks(){
  for(const p of offcuts){p.vy+=.3;p.y+=p.vy;X.fillStyle=p.color;X.fillRect(p.x,p.y,p.w,blockH-2);}offcuts=offcuts.filter(p=>p.y<H+40);
  for(var i=0;i<blocks.length;i++){
    var b=blocks[i];
    var y=baseY-i*blockH;
    if(y<-blockH||y>H+blockH)continue;
    X.fillStyle=b.color;
    X.fillRect(b.x,y,b.w,blockH-2);
    X.fillStyle='rgba(255,255,255,0.15)';
    X.fillRect(b.x,y,b.w,3);
    X.fillStyle='rgba(0,0,0,0.1)';
    X.fillRect(b.x,y+blockH-4,b.w,2);
  }
}

function drawMoving(){
  if(!moving||gameOver)return;
  var y=baseY-blocks.length*blockH;
  X.fillStyle=moving.color;
  X.fillRect(moving.x,y,moving.w,blockH-2);
  X.fillStyle='rgba(255,255,255,0.2)';
  X.fillRect(moving.x,y,moving.w,3);
}

function drawHUD(){
  if(GameShell.now()<perfectUntil){X.fillStyle='#fff29c';X.font='bold 20px sans-serif';X.textAlign='center';X.fillText('PERFECT ×'+perfectStreak,W/2,75);}
  X.save();
  X.font='bold 20px sans-serif';X.textAlign='center';X.fillStyle='#fff';
  X.fillText(score+'段 / '+['街の灯り','雲の上','星の海','夜明け'][Math.floor(score/10)%4],W/2,35);
  X.restore();
}

function drawMenu(){
  drawBg();
  X.save();X.textAlign='center';X.textBaseline='middle';
  X.font='bold 28px sans-serif';X.fillStyle='#FFD740';
  X.fillText('星灯りタワー',W/2,H*0.18);
  var fy=Math.sin(Date.now()/400)*8;
  X.font='50px serif';X.fillText('🧱',W/2,H*0.32+fy);
  X.font='50px serif';ArcadeArt.draw(X,W/2,H*0.42+fy,parseFloat(X.font.replace('bold ','')));
  X.font='16px sans-serif';X.fillStyle='#aaa';
  X.fillText('タップでブロックをおく！',W/2,H*0.55);
  X.fillText('ぴったり3回で、幅が回復！',W/2,H*0.60);
  if(best>0){X.font='14px sans-serif';X.fillStyle='#777';X.fillText('🏆 ベスト: '+best+'だん',W/2,H*0.66);}
  X.font='18px sans-serif';X.fillStyle='#FF80AB';
  X.fillText('タップで開始！',W/2,H*0.75);
  X.restore();
}

function drawGameOver(){
  X.fillStyle='rgba(0,0,0,0.6)';X.fillRect(0,0,W,H);
  X.save();X.textAlign='center';X.textBaseline='middle';
  X.font='bold 26px sans-serif';X.fillStyle='#FF5252';
  X.fillText('ゲームオーバー😢',W/2,H*0.25);
  X.font='20px sans-serif';X.fillStyle='#fff';
  X.fillText(score+'だん つめたよ！',W/2,H*0.35);
  if(score>=best&&score>0){X.fillStyle='#FFD740';X.fillText('🎉 ハイスコア！',W/2,H*0.42);}
  X.fillStyle='#ccc';X.fillText('🏆 ベスト: '+best+'だん',W/2,H*0.49);
  X.font='16px sans-serif';X.fillStyle='#FF80AB';
  X.fillText('タップでもう一回！',W/2,H*0.60);
  X.restore();
}

function update(){
  if(state!=='play'||!moving||gameOver)return;
  moving.x+=moving.dir*speed;
  if(moving.x+moving.w>W){moving.dir=-1;}
  if(moving.x<0){moving.dir=1;}
}

function loop(){
  X.clearRect(0,0,W,H);
  if(state==='menu'){drawMenu();}
  else if(state==='play'){
    drawBg();drawBlocks();drawMoving();drawHUD();
  }else{
    drawBg();drawBlocks();drawGameOver();
  }

}
GameShell.run({update,render:loop,reset});
})();

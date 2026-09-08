
(function(){
var C=document.getElementById('c'),X=C.getContext('2d');
var W=380,H=640;C.width=W;C.height=H;
function resize(){var r=Math.min(window.innerWidth/W,GameShell.height()/H);C.style.width=Math.floor(W*r)+'px';C.style.height=Math.floor(H*r)+'px';}
resize();window.addEventListener('resize',resize);

var COLORS=['#FF6B9D','#7C4DFF','#FFD740','#00BCD4','#FF5722','#66BB6A','#42A5F5','#FF80AB'];
var state='menu',paddle,ball,blocks,score,best,lives,level,effects;
try{best=parseInt(localStorage.getItem('brk1'))||0;}catch(e){best=0;}

function makeBlocks(lv){
  var b=[];
  var rows=Math.min(4+lv,8);
  var cols=7;
  var bw=Math.floor((W-20)/cols)-2;
  var bh=18;
  for(var r=0;r<rows;r++){
    for(var c=0;c<cols;c++){
      var hp=r<2?2:1;
      if(lv>=3&&Math.random()<0.2)hp=3;
      b.push({x:12+c*(bw+2),y:60+r*(bh+3),w:bw,h:bh,hp:hp,color:COLORS[r%COLORS.length]});
    }
  }
  return b;
}

function reset(){
  GameShell.beginRound();
  level=1;score=0;lives=3;effects=[];
  setupLevel();
}

function setupLevel(){
  paddle={x:W/2,w:70,h:12};
  ball={x:W/2,y:H-80,vx:3*(Math.random()>0.5?1:-1),vy:-4,r:7,active:false};
  blocks=makeBlocks(level);
}

function launch(){ball.active=true;ball.vy=-4-level*0.3;}

function tap(e){
  e.preventDefault();
  if(state==='menu'){state='play';reset();return;}
  if(state==='over'){state='menu';return;}
  if(state==='play'&&!ball.active)launch();
}
C.addEventListener('mousedown',tap);
C.addEventListener('touchstart',tap,{passive:false});
C.addEventListener('mousemove',function(e){if(state!=='play')return;var rect=C.getBoundingClientRect();paddle.x=(e.clientX-rect.left)/rect.width*W;});
C.addEventListener('touchmove',function(e){e.preventDefault();if(state!=='play')return;var rect=C.getBoundingClientRect();paddle.x=(e.touches[0].clientX-rect.left)/rect.width*W;},{passive:false});

function drawBg(){
  X.fillStyle='#0a0a2e';X.fillRect(0,0,W,H);
}

function drawPaddle(){
  var px=Math.max(paddle.w/2,Math.min(W-paddle.w/2,paddle.x));
  paddle.x=px;
  var g=X.createLinearGradient(px-paddle.w/2,0,px+paddle.w/2,0);
  g.addColorStop(0,'#FF80AB');g.addColorStop(0.5,'#FF6B9D');g.addColorStop(1,'#FF80AB');
  X.fillStyle=g;
  X.beginPath();
  X.moveTo(px-paddle.w/2+6,H-40);
  X.lineTo(px+paddle.w/2-6,H-40);
  X.arcTo(px+paddle.w/2,H-40,px+paddle.w/2,H-40+paddle.h,6);
  X.arcTo(px+paddle.w/2,H-40+paddle.h,px-paddle.w/2,H-40+paddle.h,6);
  X.arcTo(px-paddle.w/2,H-40+paddle.h,px-paddle.w/2,H-40,6);
  X.arcTo(px-paddle.w/2,H-40,px+paddle.w/2,H-40,6);
  X.fill();
}

function drawBall(){
  X.fillStyle='#fff';
  X.beginPath();X.arc(ball.x,ball.y,ball.r,0,Math.PI*2);X.fill();
  X.fillStyle='rgba(255,255,255,0.3)';
  X.beginPath();X.arc(ball.x-2,ball.y-2,ball.r*0.4,0,Math.PI*2);X.fill();
}

function drawBlocks(){
  for(var i=0;i<blocks.length;i++){
    var b=blocks[i];
    var alpha=b.hp>=3?1:b.hp>=2?0.8:0.6;
    X.globalAlpha=alpha;
    X.fillStyle=b.color;
    X.fillRect(b.x,b.y,b.w,b.h);
    X.fillStyle='rgba(255,255,255,0.2)';
    X.fillRect(b.x,b.y,b.w,3);
    X.globalAlpha=1;
    if(b.hp>=2){X.fillStyle='rgba(255,255,255,0.5)';X.font='10px sans-serif';X.textAlign='center';X.fillText(b.hp,b.x+b.w/2,b.y+b.h/2+4);}
  }
}

function drawEffects(){
  for(var i=effects.length-1;i>=0;i--){
    var e=effects[i];e.x+=e.vx;e.y+=e.vy;e.life--;
    if(e.life<=0){effects.splice(i,1);continue;}
    X.globalAlpha=e.life/15;X.fillStyle=e.color;
    X.beginPath();X.arc(e.x,e.y,e.r,0,Math.PI*2);X.fill();
    X.globalAlpha=1;
  }
}

function drawHUD(){
  X.save();X.font='bold 14px sans-serif';X.textAlign='left';X.fillStyle='#fff';
  X.fillText('スコア: '+score+' | Lv'+level,10,25);
  X.textAlign='right';X.font='14px serif';
  var hp='';for(var i=0;i<lives;i++)hp+='💖';
  X.fillText(hp,W-10,25);
  X.restore();
}

function drawMenu(){
  drawBg();
  X.save();X.textAlign='center';X.textBaseline='middle';
  X.font='bold 26px sans-serif';X.fillStyle='#FF80AB';
  X.fillText('ブロック崩し',W/2,H*0.15);
  var fy=Math.sin(GameShell.now()/400)*10;
  X.font='50px serif';X.fillText('🧱🧱',W/2,H*0.32+fy);
  X.font='15px sans-serif';X.fillStyle='#aaa';
  X.fillText('パドルを左右に動かして',W/2,H*0.48);
  X.fillText('ボールでブロックを壊そう！',W/2,H*0.53);
  if(best>0){X.font='14px sans-serif';X.fillStyle='#777';X.fillText('🏆 ベスト: '+best,W/2,H*0.60);}
  X.font='18px sans-serif';X.fillStyle='#FF80AB';
  X.fillText('タップで開始！',W/2,H*0.72);
  X.restore();
}

function drawOver(){
  X.fillStyle='rgba(0,0,0,0.6)';X.fillRect(0,0,W,H);
  X.save();X.textAlign='center';X.textBaseline='middle';
  X.font='bold 26px sans-serif';X.fillStyle=score>=best&&score>0?'#FFD740':'#FF5252';
  X.fillText(score>=best&&score>0?'🎉 ハイスコア！':'ゲームオーバー😢',W/2,H*0.28);
  X.font='20px sans-serif';X.fillStyle='#fff';
  X.fillText('スコア: '+score+' | レベル'+level,W/2,H*0.38);
  X.fillStyle='#ccc';X.fillText('🏆 ベスト: '+best,W/2,H*0.45);
  X.font='16px sans-serif';X.fillStyle='#FF80AB';
  X.fillText('タップでタイトルへ',W/2,H*0.60);
  X.restore();
}

function update(){
  if(state!=='play')return;
  if(!ball.active){ball.x=paddle.x;ball.y=H-55;return;}

  ball.x+=ball.vx;ball.y+=ball.vy;

  // Walls
  if(ball.x<ball.r){ball.x=ball.r;ball.vx*=-1;}
  if(ball.x>W-ball.r){ball.x=W-ball.r;ball.vx*=-1;}
  if(ball.y<ball.r){ball.y=ball.r;ball.vy*=-1;}

  // Bottom - lose
  if(ball.y>H+20){
    lives--;
    if(lives<=0){state='over';if(score>best){best=score;try{localStorage.setItem('brk1',best);}catch(e){}}}
    else{ball.active=false;}
    return;
  }

  // Paddle
  var px=paddle.x,pw=paddle.w,py=H-40;
  if(ball.vy>0&&ball.y+ball.r>py&&ball.y+ball.r<py+paddle.h+5&&ball.x>px-pw/2-5&&ball.x<px+pw/2+5){
    ball.vy=-Math.abs(ball.vy);
    ball.vx+=(ball.x-px)*0.1;
    if(ball.vx>5)ball.vx=5;if(ball.vx<-5)ball.vx=-5;
  }

  // Blocks
  for(var i=blocks.length-1;i>=0;i--){
    var b=blocks[i];
    if(ball.x+ball.r>b.x&&ball.x-ball.r<b.x+b.w&&ball.y+ball.r>b.y&&ball.y-ball.r<b.y+b.h){
      b.hp--;
      if(b.hp<=0){
        score+=10*level;
        for(var k=0;k<5;k++){var a=Math.random()*Math.PI*2;effects.push({x:b.x+b.w/2,y:b.y+b.h/2,vx:Math.cos(a)*2,vy:Math.sin(a)*2,life:15,r:2+Math.random()*2,color:b.color});}
        blocks.splice(i,1);
      }else{score+=5;}
      // Reflect
      var fromLeft=ball.x<b.x,fromRight=ball.x>b.x+b.w;
      var fromTop=ball.y<b.y,fromBottom=ball.y>b.y+b.h;
      if(fromLeft||fromRight)ball.vx*=-1;
      else ball.vy*=-1;
      break;
    }
  }

  // Level complete
  if(blocks.length===0){
    level++;
    setupLevel();
  }
}

function loop(){
  X.clearRect(0,0,W,H);
  if(state==='menu'){drawMenu();}
  else if(state==='play'){update();drawBg();drawBlocks();drawPaddle();drawBall();drawEffects();drawHUD();
    if(!ball.active){X.font='14px sans-serif';X.textAlign='center';X.fillStyle='#aaa';X.fillText('タップでボール発射！',W/2,H*0.85);}
  }else{drawBg();drawBlocks();drawPaddle();drawOver();}
  requestAnimationFrame(loop);
}
loop();
})();

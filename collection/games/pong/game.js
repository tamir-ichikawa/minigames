
(function(){
var C=document.getElementById('c'),X=C.getContext('2d');
var W=380,H=600;C.width=W;C.height=H;
function resize(){var r=Math.min(window.innerWidth/W,GameShell.height()/H);C.style.width=Math.floor(W*r)+'px';C.style.height=Math.floor(H*r)+'px';}
resize();window.addEventListener('resize',resize);

var state='menu';
var player,ai,ball,pScore,aScore,maxScore,rally,maxRally,effects;

function reset(){
  GameShell.beginRound();
  pScore=0;aScore=0;maxScore=5;rally=0;maxRally=0;effects=[];
  resetBall(1);
  player={x:W/2,w:70,y:H-30};
  ai={x:W/2,w:70,y:20};
}

function resetBall(dir){
  ball={x:W/2,y:H/2,vx:(2+Math.random()*2)*(Math.random()>0.5?1:-1),vy:(3+Math.random())*dir,r:8};
}

function tap(e){
  e.preventDefault();
  if(state==='menu'){state='play';reset();return;}
  if(state==='over'){state='menu';return;}
}
C.addEventListener('mousedown',tap);
C.addEventListener('touchstart',tap,{passive:false});
C.addEventListener('mousemove',function(e){if(state!=='play')return;var rect=C.getBoundingClientRect();player.x=(e.clientX-rect.left)/rect.width*W;});
C.addEventListener('touchmove',function(e){e.preventDefault();if(state!=='play')return;var rect=C.getBoundingClientRect();player.x=(e.touches[0].clientX-rect.left)/rect.width*W;},{passive:false});

function drawBg(){
  X.fillStyle='#1a237e';X.fillRect(0,0,W,H);
  // Center line
  X.setLineDash([8,8]);X.strokeStyle='rgba(255,255,255,0.15)';X.lineWidth=2;
  X.beginPath();X.moveTo(0,H/2);X.lineTo(W,H/2);X.stroke();
  X.setLineDash([]);
  // Center circle
  X.strokeStyle='rgba(255,255,255,0.08)';X.lineWidth=2;
  X.beginPath();X.arc(W/2,H/2,50,0,Math.PI*2);X.stroke();
}

function drawPaddle(p,color,label){
  var px=Math.max(p.w/2,Math.min(W-p.w/2,p.x));
  p.x=px;
  X.fillStyle=color;
  X.beginPath();
  X.moveTo(px-p.w/2+6,p.y-6);X.arcTo(px+p.w/2,p.y-6,px+p.w/2,p.y+6,6);
  X.arcTo(px+p.w/2,p.y+6,px-p.w/2,p.y+6,6);X.arcTo(px-p.w/2,p.y+6,px-p.w/2,p.y-6,6);
  X.arcTo(px-p.w/2,p.y-6,px+p.w/2,p.y-6,6);X.fill();
  X.font='12px serif';X.textAlign='center';X.fillText(label,px,p.y===20?p.y+20:p.y-12);
}

function drawBall(){
  // Trail
  X.fillStyle='rgba(255,255,255,0.15)';
  X.beginPath();X.arc(ball.x-ball.vx,ball.y-ball.vy,ball.r*0.7,0,Math.PI*2);X.fill();
  // Ball
  X.fillStyle='#fff';
  X.beginPath();X.arc(ball.x,ball.y,ball.r,0,Math.PI*2);X.fill();
  X.fillStyle='rgba(255,255,255,0.4)';
  X.beginPath();X.arc(ball.x-2,ball.y-2,ball.r*0.35,0,Math.PI*2);X.fill();
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
  X.save();
  X.font='bold 28px sans-serif';X.textAlign='center';X.fillStyle='rgba(255,255,255,0.15)';
  X.fillText(aScore+' - '+pScore,W/2,H/2+10);
  // Rally
  if(rally>3){
    X.font='bold 16px sans-serif';X.fillStyle='#FFD740';
    X.fillText('🔥 '+rally+' ラリー！',W/2,H/2+35);
  }
  X.restore();
}

function drawMenu(){
  drawBg();
  X.save();X.textAlign='center';X.textBaseline='middle';
  X.font='bold 26px sans-serif';X.fillStyle='#4FC3F7';
  X.fillText('ピンポン',W/2,H*0.15);
  var fy=Math.sin(GameShell.now()/400)*10;
  X.font='50px serif';X.fillText('🏓🏓',W/2,H*0.32+fy);
  X.font='15px sans-serif';X.fillStyle='#aaa';
  X.fillText('左右スワイプでパドルを動かして',W/2,H*0.48);
  X.fillText('とピンポン対決！',W/2,H*0.53);
  X.fillText('先に5点取った方の勝ち！',W/2,H*0.58);
  X.font='18px sans-serif';X.fillStyle='#FF80AB';
  X.fillText('タップで開始！',W/2,H*0.72);
  X.restore();
}

function drawOver(){
  X.fillStyle='rgba(0,0,0,0.6)';X.fillRect(0,0,W,H);
  X.save();X.textAlign='center';X.textBaseline='middle';
  var won=pScore>=maxScore;
  X.font='bold 28px sans-serif';X.fillStyle=won?'#FFD740':'#FF5252';
  X.fillText(won?'🎉 あなたの勝ち！':'🏓 の勝ち！',W/2,H*0.28);
  X.font='24px sans-serif';X.fillStyle='#fff';
  X.fillText(aScore+' - '+pScore,W/2,H*0.38);
  X.font='16px sans-serif';X.fillStyle='#ccc';
  X.fillText('最長ラリー: '+maxRally,W/2,H*0.46);
  if(won){X.fillStyle='#aaa';X.fillText('「くやしい〜！🏓💦」',W/2,H*0.54);}
  else{X.fillStyle='#aaa';X.fillText('「えへへ〜勝っちゃった！🏓✨」',W/2,H*0.54);}
  X.font='16px sans-serif';X.fillStyle='#FF80AB';
  X.fillText('タップでタイトルへ',W/2,H*0.66);
  X.restore();
}

function update(){
  if(state!=='play')return;

  ball.x+=ball.vx;ball.y+=ball.vy;

  // Walls
  if(ball.x<ball.r){ball.x=ball.r;ball.vx*=-1;}
  if(ball.x>W-ball.r){ball.x=W-ball.r;ball.vx*=-1;}

  // AI movement
  var aiTarget=ball.x+(ball.vy<0?ball.vx*3:0);
  var aiSpeed=2.5+aScore*0.3;
  if(ai.x<aiTarget-5)ai.x+=aiSpeed;
  else if(ai.x>aiTarget+5)ai.x-=aiSpeed;

  // Player paddle collision
  if(ball.vy>0&&ball.y+ball.r>player.y-6&&ball.y+ball.r<player.y+12){
    if(ball.x>player.x-player.w/2-5&&ball.x<player.x+player.w/2+5){
      ball.vy=-Math.abs(ball.vy)-0.2;
      ball.vx+=(ball.x-player.x)*0.08;
      rally++;if(rally>maxRally)maxRally=rally;
      addSpark(ball.x,player.y,'#FF80AB');
    }
  }

  // AI paddle collision
  if(ball.vy<0&&ball.y-ball.r<ai.y+6&&ball.y-ball.r>ai.y-12){
    if(ball.x>ai.x-ai.w/2-5&&ball.x<ai.x+ai.w/2+5){
      ball.vy=Math.abs(ball.vy)+0.2;
      ball.vx+=(ball.x-ai.x)*0.08;
      rally++;if(rally>maxRally)maxRally=rally;
      addSpark(ball.x,ai.y,'#4FC3F7');
    }
  }

  // Speed limit
  if(ball.vx>6)ball.vx=6;if(ball.vx<-6)ball.vx=-6;

  // Scoring
  if(ball.y>H+20){aScore++;rally=0;resetBall(-1);if(aScore>=maxScore)state='over';}
  if(ball.y<-20){pScore++;rally=0;resetBall(1);if(pScore>=maxScore)state='over';}
}

function addSpark(x,y,color){
  for(var i=0;i<6;i++){
    var a=Math.random()*Math.PI*2;
    effects.push({x:x,y:y,vx:Math.cos(a)*2.5,vy:Math.sin(a)*2.5,life:12,r:2+Math.random()*2,color:color});
  }
}

function loop(){
  X.clearRect(0,0,W,H);
  if(state==='menu'){drawMenu();}
  else if(state==='play'){
    update();drawBg();drawPaddle(ai,'#4FC3F7','🏓');
    drawPaddle(player,'#FF80AB','あなた');drawBall();drawEffects();drawHUD();
  }else{drawBg();drawOver();}
  requestAnimationFrame(loop);
}
loop();
})();

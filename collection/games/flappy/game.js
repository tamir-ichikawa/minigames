
(function(){
const {requestAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval}=GameShell.clock;
var C=document.getElementById('c');
var X=C.getContext('2d');
var W=400,H=650;
C.width=W;C.height=H;

function resize(){
  var r=Math.min(window.innerWidth/W,GameShell.height()/H);
  C.style.width=Math.floor(W*r)+'px';
  C.style.height=Math.floor(H*r)+'px';
}
resize();
window.addEventListener('resize',resize);

var state='menu';
var bird={x:90,y:H/2,vy:0,r:16};
var pipes=[];
var score=0;
var niceFlights=0,niceUntil=0;
var best=0;
try{best=parseInt(localStorage.getItem('luna-flight-v4'))||0}catch(e){}
var frame=0,gateNumber=0,milestoneUntil=0;
var pipeTimer=0;
var gravity=0.38;
var flapPow=-7;
var pipeSpd=2.2;
var pipeGap=185;
var particles=[];
var clouds=[];

for(var i=0;i<6;i++){
  clouds.push({x:Math.random()*W,y:20+Math.random()*120,w:30+Math.random()*50,spd:0.2+Math.random()*0.3});
}

function reset(){
  GameShell.beginRound();
  bird={x:90,y:H/2,vy:0,r:16};
  pipes=[];score=0;gateNumber=0;milestoneUntil=0;niceFlights=0;niceUntil=0;frame=0;pipeTimer=0;
  pipeSpd=2.2;pipeGap=185;particles=[];
}

function addPipe(){
  var mn=70;
  gateNumber++;
  var mx=H-120-pipeGap;
  var previous=pipes[pipes.length-1];
  var t=previous?Math.max(mn,Math.min(mx,previous.top+(Math.random()-.5)*140)):H/2-pipeGap/2;
  if(gateNumber<=3){t=[205,220,205][gateNumber-1];}
  pipes.push({x:W+5,top:t,gap:gateNumber<=3?230:pipeGap,scored:false});
}

function flap(){
  if(state==='menu'){state='play';reset();bird.vy=flapPow;return;}
  if(state==='over'){return;}
  bird.vy=flapPow;
  for(var i=0;i<3;i++){
    particles.push({
      x:bird.x-5,y:bird.y+5,
      vx:-1-Math.random()*2,vy:Math.random()*2-1,
      life:15,r:2+Math.random()*2,
      color:'#FFB6C1'
    });
  }
}

function onInput(e){
  if(e)e.preventDefault();
  if(state==='over'){state='play';reset();bird.vy=flapPow;return;}
  flap();
}

C.style.touchAction='none';C.addEventListener('pointerdown',e=>{if(e.isPrimary)onInput(e);});
document.addEventListener('keydown',function(e){
  if(e.code==='Space'||e.keyCode===32){e.preventDefault();onInput(null);}
});

// Simple rounded rect using arcs (no roundRect API needed)
function roundedRect(x,y,w,h,r){
  if(r>w/2)r=w/2;
  if(r>h/2)r=h/2;
  X.beginPath();
  X.moveTo(x+r,y);
  X.arcTo(x+w,y,x+w,y+h,r);
  X.arcTo(x+w,y+h,x,y+h,r);
  X.arcTo(x,y+h,x,y,r);
  X.arcTo(x,y,x+w,y,r);
  X.closePath();
}

function drawCloud(cx,cy,w){
  X.beginPath();
  X.arc(cx,cy,w*0.35,0,Math.PI*2);
  X.arc(cx+w*0.3,cy-w*0.1,w*0.25,0,Math.PI*2);
  X.arc(cx-w*0.25,cy+w*0.05,w*0.2,0,Math.PI*2);
  X.fill();
}

function drawBg(){
  // Sky gradient
  var g=X.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#252c53');
  g.addColorStop(0.5,'#575a87');
  g.addColorStop(0.85,'#8283a0');
  g.addColorStop(1,'#5b7780');
  X.fillStyle=g;
  X.fillRect(0,0,W,H);

  X.fillStyle='#fff0b8';X.beginPath();X.arc(320,85,30,0,Math.PI*2);X.fill();X.fillStyle='#343b65';X.beginPath();X.arc(333,75,28,0,Math.PI*2);X.fill();
  // Clouds
  X.fillStyle='rgba(255,255,255,0.6)';
  for(var i=0;i<clouds.length;i++){
    var c=clouds[i];
    drawCloud(c.x,c.y,c.w);
    c.x-=c.spd;
    if(c.x<-c.w)c.x=W+c.w;
  }
}

function drawGround(){
  X.fillStyle='#66BB6A';
  X.fillRect(0,H-45,W,45);
  X.fillStyle='#558B2F';
  X.fillRect(0,H-45,W,4);
  X.fillStyle='#7CB342';
  var offset=(frame*pipeSpd)%16;
  for(var i=-1;i<W/16+2;i++){
    X.fillRect(i*16-offset,H-42,2,6);
  }
}

function drawPipe(p){
  var pw=50;
  var topH=p.top;
  var botY=topH+p.gap;

  // Top pipe body
  var g1=X.createLinearGradient(p.x,0,p.x+pw,0);
  g1.addColorStop(0,'#536276');g1.addColorStop(0.4,'#8490a4');g1.addColorStop(1,'#434f65');
  X.fillStyle=g1;
  X.fillRect(p.x,0,pw,topH);
  // Top pipe cap
  X.fillStyle='#2E7D32';
  X.fillRect(p.x-4,topH-20,pw+8,20);
  // Highlight
  X.fillStyle='rgba(255,255,255,0.12)';
  X.fillRect(p.x+6,2,5,topH-22);

  // Bottom pipe body
  X.fillStyle=g1;
  X.fillRect(p.x,botY,pw,H-45-botY);
  // Bottom pipe cap
  X.fillStyle='#2E7D32';
  X.fillRect(p.x-4,botY,pw+8,20);
  // Highlight
  X.fillStyle='rgba(255,255,255,0.12)';
  X.fillRect(p.x+6,botY+22,5,H-45-botY-24);
}

function drawBird(){
  X.save();
  X.translate(bird.x,bird.y);
  var angle=bird.vy*4;
  if(angle<-30)angle=-30;
  if(angle>60)angle=60;
  X.rotate(angle*Math.PI/180);
  X.font='32px serif';
  X.textAlign='center';
  X.textBaseline='middle';
  ArcadeArt.draw(X,0,-2,parseFloat(X.font.replace('bold ','')));
  X.restore();
}

function drawParticles(){
  for(var i=particles.length-1;i>=0;i--){
    var p=particles[i];
    p.x+=p.vx;p.y+=p.vy;p.life--;
    if(p.life<=0){particles.splice(i,1);continue;}
    X.globalAlpha=p.life/15;
    if(p.emoji){
      X.font=p.r+'px serif';
      X.textAlign='center';
      X.textBaseline='middle';
      X.fillText(p.emoji,p.x,p.y);
    }else{
      X.fillStyle=p.color;
      X.beginPath();
      X.arc(p.x,p.y,p.r,0,Math.PI*2);
      X.fill();
    }
    X.globalAlpha=1;
  }
}

function scoreFx(){
  var emojis=['⭐','✨','🌟','💖','🎵'];
  for(var i=0;i<6;i++){
    var a=Math.random()*Math.PI*2;
    particles.push({
      x:bird.x+20,y:bird.y,
      vx:Math.cos(a)*2.5,vy:Math.sin(a)*2.5,
      life:22,r:16,emoji:emojis[i%emojis.length],
      color:''
    });
  }
}

function drawScore(){
  if(GameShell.now()<milestoneUntil){X.fillStyle='#fff0b7';X.font='bold 18px sans-serif';X.textAlign='center';X.fillText(score>=20?'20門達成！ 夜空の達人':'10門達成！ 後半へ',W/2,135);}
  X.save();
  if(GameShell.now()<niceUntil){X.font='bold 16px sans-serif';X.textAlign='center';X.fillStyle='#fff0b7';X.fillText('NICE FLIGHT!',W/2,98);}
  X.font='bold 44px sans-serif';
  X.textAlign='center';
  X.textBaseline='top';
  X.strokeStyle='rgba(0,0,0,0.3)';
  X.lineWidth=5;
  X.strokeText(score,W/2,30);
  X.fillStyle='#fff';
  X.fillText(score,W/2,30);
  X.restore();
}

function drawMenu(){
  drawBg();
  drawGround();

  var fy=Math.sin(Date.now()/400)*10;

  // Title
  X.save();
  X.font='bold 30px sans-serif';
  X.textAlign='center';
  X.textBaseline='middle';
  // Shadow
  X.fillStyle='rgba(0,0,0,0.15)';
  X.fillText('ルナの夜間飛行',W/2+2,H*0.20+2);
  // Stroke
  X.strokeStyle='#fff';
  X.lineWidth=4;
  X.strokeText('ルナの夜間飛行',W/2,H*0.20);
  // Fill
  X.fillStyle='#ffe0a2';
  X.fillText('ルナの夜間飛行',W/2,H*0.20);

  // Bunny
  X.font='56px serif';
  ArcadeArt.draw(X,W/2,H*0.38+fy,parseFloat(X.font.replace('bold ','')));

  // Instruction
  X.font='22px sans-serif';
  X.fillStyle='#fff1d7';
  X.strokeStyle='#fff';
  X.lineWidth=2;
  X.strokeText('タップで開始！',W/2,H*0.54);
  X.fillText('タップで開始！',W/2,H*0.54);

  X.font='14px sans-serif';X.fillStyle='#fff1d7';X.fillText('はじめの3門は練習コース',W/2,H*.69);X.fillText('10門・20門を目指そう / 中央はおまけ評価',W/2,H*.74);
  // Best score
  if(best>0){
    X.font='16px sans-serif';
    X.fillStyle='#777';
    X.fillText('🏆 ベスト: '+best,W/2,H*0.60);
  }
  X.restore();
}

function drawGameOver(){
  X.fillStyle='rgba(0,0,0,0.45)';
  X.fillRect(0,0,W,H);

  // Panel background
  var px=W/2-120,py=H/2-125,pw=240,ph=250;
  X.fillStyle='#FFF0F5';
  roundedRect(px,py,pw,ph,16);
  X.fill();
  X.strokeStyle='#FF80AB';
  X.lineWidth=3;
  roundedRect(px,py,pw,ph,16);
  X.stroke();

  X.save();
  X.textAlign='center';
  X.textBaseline='middle';

  X.font='bold 24px sans-serif';
  X.fillStyle='#E91E63';
  X.fillText('ゲームオーバー😢',W/2,py+40);

  X.font='16px sans-serif';
  X.fillStyle='#999';
  X.fillText('通過 '+score+' / 中央飛行 '+niceFlights,W/2,py+75);

  X.font='bold 48px sans-serif';
  X.fillStyle='#E91E63';
  X.fillText(score,W/2,py+115);

  X.font='16px sans-serif';
  X.fillStyle='#aaa';
  X.fillText('🏆 ベスト: '+best,W/2,py+150);

  if(score>=best&&score>0){
    X.font='16px sans-serif';
    X.fillStyle='#FFD700';
    X.fillText('🎉 ハイスコア更新！',W/2,py+175);
  }

  // Button
  X.fillStyle='#FF80AB';
  roundedRect(W/2-60,py+195,120,38,12);
  X.fill();
  X.font='bold 16px sans-serif';
  X.fillStyle='#fff';
  X.fillText('もう一回！',W/2,py+214);

  X.restore();
}

function update(){
  if(state!=='play')return;

  bird.vy+=gravity;
  bird.y+=bird.vy;

  pipeTimer++;
  if(pipeTimer>95){pipeTimer=0;addPipe();}

  for(var i=pipes.length-1;i>=0;i--){
    var p=pipes[i];
    p.x-=pipeSpd;
    if(p.x<-60){pipes.splice(i,1);continue;}

    // Score
    if(!p.scored&&p.x+50<bird.x){
      p.scored=true;
      GameShell.feedback(true);score++;if(score===10||score===20){milestoneUntil=GameShell.now()+2200;GameShell.feedback?.(true);}
      scoreFx();
      if(Math.abs(bird.y-(p.top+p.gap/2))<22){niceFlights++;niceUntil=GameShell.now()+850;}
      if(score%5===0){
        pipeSpd=Math.min(pipeSpd+0.12,4);
        pipeGap=Math.max(pipeGap-3,115);
      }
    }

    // Collision
    var pw=50;
    if(bird.x+bird.r>p.x-4&&bird.x-bird.r<p.x+pw+4){
      if(bird.y-bird.r<p.top||bird.y+bird.r>p.top+p.gap){
        die();
      }
    }
  }

  // Ground/ceiling
  if(bird.y+bird.r>H-45||bird.y-bird.r<0){die();}
}

function die(){
  state='over';GameShell.feedback(false);
  if(score>best){
    best=score;
    try{localStorage.setItem('luna-flight-v4',best);}catch(e){}
  }
}

function loop(){
  try{
    X.clearRect(0,0,W,H);
    if(state==='menu'){
      drawMenu();
    }else if(state==='play'){
      
      frame++;
      drawBg();
      for(var i=0;i<pipes.length;i++){drawPipe(pipes[i]);}
      drawGround();
      drawBird();
      drawParticles();
      drawScore();
    }else{
      drawBg();
      for(var i=0;i<pipes.length;i++){drawPipe(pipes[i]);}
      drawGround();
      drawBird();
      drawParticles();
      drawGameOver();
    }
  }catch(err){
    X.fillStyle='#fff';
    X.font='14px sans-serif';
    X.fillText('Error: '+err.message,10,30);
  }

}

GameShell.run({update,render:loop,reset});
})();


(function(){
const {requestAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval}=GameShell.clock;
var C=document.getElementById('c');
var X=C.getContext('2d');
var W=380,H=640;
C.width=W;C.height=H;
function resize(){var r=Math.min(window.innerWidth/W,GameShell.height()/H);C.style.width=Math.floor(W*r)+'px';C.style.height=Math.floor(H*r)+'px';}
resize();window.addEventListener('resize',resize);

var state='menu'; // menu, play, over
var player={x:W/2,y:H-70,w:28,h:28};
var bullets=[];
var enemies=[];
var particles=[];
var stars=[];
var score=0,best=0,lives=3,wave=1,spawnTimer=0,shootTimer=0;
var invincible=0,killChain=0,powerTimer=0;
var missionFrame=0,boss=null,stageText='',formationIndex=0;
var moveTarget=null; // touch target x

try{best=parseInt(localStorage.getItem('astra-patrol-v4'))||0;}catch(e){}

// Stars background
for(var i=0;i<60;i++){
  stars.push({x:Math.random()*W,y:Math.random()*H,s:0.5+Math.random()*1.5,b:Math.random()});
}

var ENEMY_TYPES=[
  {emoji:'👾',hp:1,pts:10,spd:1.5,w:24},
  {emoji:'👻',hp:2,pts:20,spd:1.2,w:26},
  {emoji:'😈',hp:3,pts:30,spd:1,w:28},
  {emoji:'🐲',hp:5,pts:50,spd:0.8,w:32}
];

function reset(){
  GameShell.beginRound();
  missionFrame=0;boss=null;formationIndex=0;player.x=W/2;bullets=[];enemies=[];particles=[];
  score=0;lives=3;wave=1;spawnTimer=0;shootTimer=0;moveTarget=null;invincible=0;killChain=0;powerTimer=0;
}

function spawnEnemy(){const layouts=[[65,145,225,305],[95,190,285],[60,125,255,320]];const xs=layouts[formationIndex++%layouts.length];for(let i=0;i<xs.length;i++)enemies.push({x:xs[i],y:-30-i*28,vx:0,vy:1.5,hp:wave>2?2:1,pts:10,w:24});}
function updateMission(){missionFrame++;const cycle=missionFrame%4500;wave=Math.floor(missionFrame/4500)+1;
 if(!boss&&cycle<3600){stageText=cycle%720<540?'編隊を迎撃':'休憩 / 次の編隊へ';if(cycle%180===1&&cycle%720<540)spawnEnemy();}
 else if(!boss){enemies=[];boss={hp:80,maxHP:80,age:0,x:W/2,y:130,safe:2};}
 if(!boss)return;boss.age++;const phase=boss.age%300;if(phase===1)boss.safe=(boss.safe+1)%3;stageText=phase<110?'予告：光る安全レーンへ':phase<180?'回避！': '反撃！ 中央で攻撃';
 if(phase>=110&&phase<180){const left=boss.safe*W/3+20,right=(boss.safe+1)*W/3-20;if((player.x<left||player.x>right)&&invincible===0)damagePlayer();}
 if(phase>=180){for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];if(Math.abs(b.x-boss.x)<52&&Math.abs(b.y-boss.y)<40){boss.hp--;bullets.splice(i,1);}}}
 if(boss.hp<=0){score+=300;boss=null;missionFrame=Math.ceil(missionFrame/4500)*4500;GameShell.feedback?.(true);}
}
function damagePlayer(){lives--;invincible=90;killChain=0;powerTimer=0;addExplosion(player.x,player.y,'#FF5252');if(lives<=0){state='over';if(score>best){best=score;try{localStorage.setItem('astra-patrol-v4',best);}catch{}}}}
function drawMission(){X.save();X.textAlign='center';X.font='14px sans-serif';X.fillStyle='#c6ecff';X.fillText(stageText,W/2,98);if(boss){const phase=boss.age%300;X.fillStyle=phase<180?'rgba(100,255,170,.20)':'rgba(160,170,255,.1)';if(phase<180){X.fillRect(boss.safe*W/3+20,150,W/3-40,H-150);X.fillStyle='#adffdc';X.fillText('安全',boss.safe*W/3+W/6,H-110);for(let l=0;l<3;l++)if(l!==boss.safe){X.fillStyle=phase<110?'rgba(255,150,70,.16)':'rgba(255,60,90,.45)';X.fillRect(l*W/3,180,W/3,H-180);}}
 ArcadeArt.drone(X,boss.x,boss.y,80,phase<180?5:1);X.fillStyle='#59395a';X.fillRect(90,110,200,6);X.fillStyle='#ffe38a';X.fillRect(90,110,200*boss.hp/boss.maxHP,6);}X.restore();}

function shoot(){
  if(powerTimer>0){bullets.push({x:player.x-10,y:player.y-10,vy:-8},{x:player.x+10,y:player.y-10,vy:-8});}
  bullets.push({x:player.x,y:player.y-14,vy:-8});
}

function addExplosion(x,y,color){
  for(var i=0;i<8;i++){
    var a=Math.random()*Math.PI*2;
    particles.push({x:x,y:y,vx:Math.cos(a)*2.5,vy:Math.sin(a)*2.5,life:18,r:2+Math.random()*3,color:color});
  }
}

function drawStars(){
  for(var i=0;i<stars.length;i++){
    var s=stars[i];
    s.y+=s.s*0.5;
    if(s.y>H){s.y=0;s.x=Math.random()*W;}
    s.b+=0.02;
    var alpha=0.3+Math.sin(s.b)*0.3;
    X.fillStyle='rgba(255,255,255,'+alpha+')';
    X.beginPath();X.arc(s.x,s.y,s.s,0,Math.PI*2);X.fill();
  }
}

function drawBg(){
  var g=X.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#0a0a2e');g.addColorStop(0.5,'#0d1b3e');g.addColorStop(1,'#1a0a3e');
  X.fillStyle=g;X.fillRect(0,0,W,H);
  drawStars();
}

function drawPlayer(){
  X.font='28px serif';X.textAlign='center';X.textBaseline='middle';
  if(invincible===0||Math.floor(invincible/6)%2===0)ArcadeArt.draw(X,player.x,player.y,parseFloat(X.font.replace('bold ','')));
}

function drawBullets(){
  X.fillStyle='#FFD740';
  for(var i=0;i<bullets.length;i++){
    var b=bullets[i];
    X.beginPath();
    X.arc(b.x,b.y,3,0,Math.PI*2);
    X.fill();
    // Trail
    X.fillStyle='rgba(255,215,64,0.3)';
    X.beginPath();X.arc(b.x,b.y+4,2,0,Math.PI*2);X.fill();
    X.fillStyle='#FFD740';
  }
}

function drawEnemies(){
  X.textAlign='center';X.textBaseline='middle';
  for(var i=0;i<enemies.length;i++){
    var e=enemies[i];
    X.font=e.w+'px serif';
    ArcadeArt.drone(X,e.x,e.y,e.w,e.hp);
  }
}

function drawParticles(){
  for(var i=particles.length-1;i>=0;i--){
    var p=particles[i];
    p.x+=p.vx;p.y+=p.vy;p.life--;
    if(p.life<=0){particles.splice(i,1);continue;}
    X.globalAlpha=p.life/18;
    if(p.emoji){
      X.font=p.r+'px serif';X.textAlign='center';X.textBaseline='middle';
      X.fillText(p.emoji,p.x,p.y);
    }else{
      X.fillStyle=p.color;
      X.beginPath();X.arc(p.x,p.y,p.r,0,Math.PI*2);X.fill();
    }
    X.globalAlpha=1;
  }
}

function drawHUD(){
  X.save();
  X.font='bold 16px sans-serif';X.textAlign='left';X.fillStyle='#fff';
  X.fillText('スコア: '+score,10,28);
  X.textAlign='right';
  X.fillText('Wave '+wave,W-10,28);
  // Lives
  X.textAlign='left';X.font='18px serif';
  var lifeStr='';for(var i=0;i<lives;i++)lifeStr+='💖';
  X.fillText(lifeStr,10,52);X.font='12px sans-serif';X.fillStyle='#9ce8df';X.fillText(powerTimer>0?'TRIPLE SHOT '+Math.ceil(powerTimer/60)+'秒':'強化まで '+(8-killChain%8)+'機',10,74);
  X.restore();
}

function drawMenu(){
  drawBg();
  X.save();X.textAlign='center';X.textBaseline='middle';
  X.font='bold 26px sans-serif';X.fillStyle='#FF80AB';
  X.fillText('アストラ・パトロール',W/2,H*0.2);
  var fy=Math.sin(Date.now()/400)*8;
  X.font='56px serif';ArcadeArt.draw(X,W/2,H*0.38+fy,parseFloat(X.font.replace('bold ','')));
  X.font='18px sans-serif';X.fillStyle='#aaa';
  X.fillText('タップで開始！',W/2,H*0.55);
  X.fillText('左右移動・自動発射',W/2,H*0.60);X.font='14px sans-serif';X.fillText('8機撃破で強化 / 60秒で中ボス',W/2,H*0.72);X.fillText('予告された安全レーンへ → 中央で反撃',W/2,H*.77);
  if(best>0){X.font='14px sans-serif';X.fillStyle='#777';X.fillText('🏆 ベスト: '+best,W/2,H*0.66);}
  X.restore();
}

function drawGameOver(){
  X.fillStyle='rgba(0,0,0,0.6)';X.fillRect(0,0,W,H);
  X.save();X.textAlign='center';X.textBaseline='middle';
  X.font='bold 28px sans-serif';X.fillStyle='#FF5252';
  X.fillText('ゲームオーバー',W/2,H*0.3);
  X.font='16px sans-serif';X.fillStyle='#ccc';
  X.fillText('スコア: '+score,W/2,H*0.4);
  X.fillText('Wave: '+wave,W/2,H*0.45);
  if(score>=best&&score>0){
    X.fillStyle='#FFD740';X.fillText('🎉 ハイスコア！',W/2,H*0.51);
  }
  X.fillText('🏆 ベスト: '+best,W/2,H*0.57);
  X.font='18px sans-serif';X.fillStyle='#FF80AB';
  X.fillText('タップでもう一回！',W/2,H*0.67);
  X.restore();
}

function update(){
  if(state!=='play')return;

  if(invincible>0)invincible--;if(powerTimer>0)powerTimer--;
  const direction=Number(GameShell.isDown('ArrowRight'))-Number(GameShell.isDown('ArrowLeft'));
  if(direction){player.x+=direction*4.5;moveTarget=null;}
  // Auto shoot
  shootTimer++;
  if(shootTimer>=8){shootTimer=0;shoot();}

  // Move toward touch target
  if(moveTarget!==null){
    var dx=moveTarget-player.x;
    if(Math.abs(dx)>3)player.x+=dx*0.15;
    else player.x=moveTarget;
  }
  if(player.x<15)player.x=15;
  if(player.x>W-15)player.x=W-15;

  // Bullets
  for(var i=bullets.length-1;i>=0;i--){
    bullets[i].y+=bullets[i].vy;
    if(bullets[i].y<-10){bullets.splice(i,1);}
  }

  // Enemies
  updateMission();

  for(var i=enemies.length-1;i>=0;i--){
    var e=enemies[i];
    e.x+=e.vx;e.y+=e.vy;
    if(e.x<10||e.x>W-10)e.vx*=-1;

    // Hit by bullet?
    for(var j=bullets.length-1;j>=0;j--){
      var b=bullets[j];
      if(Math.abs(b.x-e.x)<e.w/2&&Math.abs(b.y-e.y)<e.w/2){
        e.hp--;bullets.splice(j,1);
        if(e.hp<=0){
          score+=e.pts;killChain++;if(killChain%8===0)powerTimer=360;
          addExplosion(e.x,e.y,'#FFD740');
          // Score emoji
          particles.push({x:e.x,y:e.y-10,vx:0,vy:-1.5,life:20,r:14,emoji:'💥',color:''});
          enemies.splice(i,1);
          // Wave check
          // Mission phase, not score, controls the wave.
          break;
        }else{
          addExplosion(e.x,e.y,'#FF9800');
        }
      }
    }

    if(e.hp<=0)continue;
    // Hit player?
    if(e.y>H+20){enemies.splice(i,1);continue;}
    if(invincible===0&&Math.abs(e.x-player.x)<20&&Math.abs(e.y-player.y)<20){
      lives--;invincible=90;killChain=0;powerTimer=0;
      addExplosion(player.x,player.y,'#FF5252');
      enemies.splice(i,1);
      if(lives<=0){
        state='over';
        if(score>best){best=score;try{localStorage.setItem('astra-patrol-v4',best);}catch(ex){}}
      }
    }
  }
}

// Input
function onInput(e){
  e.preventDefault();
  if(state==='menu'){state='play';reset();return;}
  if(state==='over'){state='play';reset();return;}
}
GameShell.drag(C,{start:e=>onInput(e),move:dx=>{if(state==='play')moveTarget=Math.max(15,Math.min(W-15,(moveTarget??player.x)+dx/C.getBoundingClientRect().width*W));},end:()=>{moveTarget=null;}});
document.addEventListener('keydown',function(e){
  if(e.code==='Space'&&state!=='play'){onInput(e);return;}
  if(state!=='play')return;
  if(e.key==='ArrowLeft'){e.preventDefault();moveTarget=null;}
  else if(e.key==='ArrowRight'){e.preventDefault();moveTarget=null;}
});

function loop(){
  X.clearRect(0,0,W,H);
  if(state==='menu'){drawMenu();}
  else if(state==='play'){
    drawBg();drawBullets();drawEnemies();drawPlayer();drawParticles();drawHUD();drawMission();
  }else{
    drawBg();drawBullets();drawEnemies();drawParticles();drawGameOver();
  }

}
GameShell.run({update,render:loop,reset});
})();

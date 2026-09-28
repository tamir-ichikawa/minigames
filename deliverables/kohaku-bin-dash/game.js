
(function(){
const {requestAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval}=GameShell.clock;
var C=document.getElementById('c');
var X=C.getContext('2d');
var W=400,H=600;
C.width=W;C.height=H;
function resize(){var r=Math.min(window.innerWidth/W,GameShell.height()/H);C.style.width=Math.floor(W*r)+'px';C.style.height=Math.floor(H*r)+'px';}
resize();window.addEventListener('resize',resize);

var state='menu',patternRow=0,patternName='中央の安全便';
var LANES=[W*0.2,W*0.5,W*0.8];
var safeLane=1,deliveryCombo=0,maxDeliveryCombo=0;
var player,obstacles,coins,score,best,speed,frame,particles,lane;
try{best=parseInt(localStorage.getItem('kohaku-dash-v4'))||0;}catch(e){best=0;}

function reset(){
  GameShell.beginRound();
  safeLane=1;deliveryCombo=0;maxDeliveryCombo=0;lane=1;player={x:LANES[1],y:H-100,targetX:LANES[1]};
  obstacles=[];coins=[];patternRow=0;score=0;speed=3;frame=0;particles=[];
}

// Six rows per authored section; each row is 80 frames apart at the maximum speed.
const ROUTES=[{name:'中央の安全便 / 左の金星は寄り道',safe:[1,1,1,1,1,1],bonus:[0,-1,0,-1,0,-1]}, {name:'左へ配達 / 中央へ戻る',safe:[1,0,0,1,1,1],bonus:[2,-1,1,-1,2,-1]}, {name:'右へ配達 / 金星を選ぼう',safe:[1,2,2,1,1,1],bonus:[0,-1,1,-1,0,-1]}];
function spawnObstacle(){const p=ROUTES[Math.floor(patternRow/6)%ROUTES.length],i=patternRow%6;patternName=p.name;safeLane=p.safe[i];const bonus=p.bonus[i];
 coins.push({x:LANES[safeLane],y:-40,row:patternRow});if(bonus>=0)coins.push({x:LANES[bonus],y:-40,bonus:true,row:patternRow});
 for(let l=0;l<3;l++)if(l!==safeLane&&l!==bonus)obstacles.push({x:LANES[l],y:-40,w:28});patternRow++;
}

function switchLane(dir){
  if(state!=='play')return;
  lane=Math.max(0,Math.min(2,lane+dir));
  player.targetX=LANES[lane];
}

function onInput(e){
  if(e)e.preventDefault();
  if(state==='menu'){state='play';reset();return;}
  if(state==='over'){state='play';reset();return;}
}

C.style.touchAction='none';C.addEventListener('pointerdown',e=>{if(!e.isPrimary)return;e.preventDefault();if(state!=='play'){onInput(e);return;}const r=C.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*W;if(x<W/3)switchLane(-1);else if(x>W*2/3)switchLane(1);});
document.addEventListener('keydown',function(e){
  if(e.key==='ArrowLeft'){e.preventDefault();switchLane(-1);}
  if(e.key==='ArrowRight'){e.preventDefault();switchLane(1);}
  if(e.key===' '){e.preventDefault();onInput(null);}
});

function drawBg(){
  // Road
  var g=X.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#4b5647');g.addColorStop(1,'#263c39');
  X.fillStyle=g;X.fillRect(0,0,W,H);
  // Lane dividers
  X.strokeStyle='rgba(255,255,255,0.15)';
  X.lineWidth=2;
  X.setLineDash([20,20]);
  var offset=((frame||0)*(speed||3))%40;
  for(var i=1;i<3;i++){
    X.beginPath();
    for(var y=-40+offset;y<H;y+=40){
      X.moveTo(W*i/3,y);X.lineTo(W*i/3,y+20);
    }
    X.stroke();
  }
  X.setLineDash([]);
  // Side lines
  X.strokeStyle='#FFD740';X.lineWidth=3;
  X.beginPath();X.moveTo(W*0.07,0);X.lineTo(W*0.07,H);X.stroke();
  X.beginPath();X.moveTo(W*0.93,0);X.lineTo(W*0.93,H);X.stroke();
}

function drawPlayer(){
  // Smooth movement

  X.font='32px serif';X.textAlign='center';X.textBaseline='middle';
  ArcadeArt.draw(X,player.x,player.y,parseFloat(X.font.replace('bold ','')));
}

function drawObstacles(){
  X.textAlign='center';X.textBaseline='middle';
  for(var i=0;i<obstacles.length;i++){
    var o=obstacles[i];
    X.font='32px serif';
    ArcadeArt.barrier(X,o.x,o.y);
  }
}

function drawCoins(){
  X.textAlign='center';X.textBaseline='middle';X.font='24px serif';
  for(var i=0;i<coins.length;i++){
    ArcadeArt.star(X,coins[i].x,coins[i].y,coins[i].bonus?32:24);if(coins[i].bonus){X.font='12px sans-serif';X.fillStyle='#ffe29b';X.fillText('+25',coins[i].x,coins[i].y-23);}
  }
}

function drawParticles(){
  for(var i=particles.length-1;i>=0;i--){
    var p=particles[i];
    p.x+=p.vx;p.y+=p.vy;p.life--;
    if(p.life<=0){particles.splice(i,1);continue;}
    X.globalAlpha=p.life/15;
    if(p.emoji){X.font=p.r+'px serif';X.textAlign='center';X.fillText(p.emoji,p.x,p.y);}
    else{X.fillStyle=p.color;X.beginPath();X.arc(p.x,p.y,p.r,0,Math.PI*2);X.fill();}
    X.globalAlpha=1;
  }
}

function drawHUD(){
  X.save();
  X.font='bold 18px sans-serif';X.textAlign='left';X.fillStyle='#fff';
  X.fillText('スコア: '+score,12,30);X.font='13px sans-serif';X.fillStyle='#ffe2a9';X.fillText('配達コンボ '+deliveryCombo+' / 5個ごとに報酬UP',12,54);
  X.fillText(patternName,12,76);X.textAlign='right';
  X.font='14px sans-serif';X.fillStyle='#FFD740';
  X.fillText('スピード: '+speed.toFixed(1),W-12,30);
  X.restore();
}

function drawMenu(){
  drawBg();
  X.save();X.textAlign='center';X.textBaseline='middle';
  X.font='bold 28px sans-serif';X.fillStyle='#FFD740';
  X.fillText('コハク便ダッシュ',W/2,H*0.18);
  var fy=Math.sin(Date.now()/300)*8;
  X.font='56px serif';ArcadeArt.draw(X,W/2,H*0.35+fy,parseFloat(X.font.replace('bold ','')));
  X.font='16px sans-serif';X.fillStyle='#aaa';
  X.fillText('タップで開始！',W/2,H*0.52);
  X.fillText('左右タップでレーン移動',W/2,H*0.57);
  X.fillText('星を5個つなぐと、配達報酬UP！',W/2,H*0.62);
  if(best>0){X.font='14px sans-serif';X.fillStyle='#777';X.fillText('🏆 ベスト: '+best,W/2,H*0.68);}
  X.restore();
}

function drawGameOver(){
  X.fillStyle='rgba(0,0,0,0.6)';X.fillRect(0,0,W,H);
  X.save();X.textAlign='center';X.textBaseline='middle';
  X.font='bold 28px sans-serif';X.fillStyle='#FF5252';
  X.fillText('ゲームオーバー😢',W/2,H*0.28);
  X.font='20px sans-serif';X.fillStyle='#fff';
  X.fillText('スコア: '+score,W/2,H*0.38);
  if(score>=best&&score>0){X.fillStyle='#FFD740';X.fillText('🎉 ハイスコア！',W/2,H*0.44);}
  X.fillStyle='#ccc';X.fillText('🏆 ベスト: '+best,W/2,H*0.50);
  X.font='16px sans-serif';X.fillStyle='#FF80AB';
  X.fillText('タップでもう一回！',W/2,H*0.60);X.font='14px sans-serif';X.fillText('最長配達コンボ '+maxDeliveryCombo,W/2,H*0.68);
  X.restore();
}

function update(){
  if(state!=='play')return;
  frame++;player.x+=(player.targetX-player.x)*0.25;

  // Spawn
  if(frame>90&&frame%80===0)spawnObstacle();

  // Speed increase
  speed=3+score*0.006;if(speed>6)speed=6;

  // Move obstacles
  for(var i=obstacles.length-1;i>=0;i--){
    obstacles[i].y+=speed;
    if(obstacles[i].y>H+40){obstacles.splice(i,1);continue;}
    // Collision
    if(Math.abs(obstacles[i].x-player.x)<30&&Math.abs(obstacles[i].y-player.y)<30){
      state='over';GameShell.feedback(false);
      for(var k=0;k<10;k++){
        var a=Math.random()*Math.PI*2;
        particles.push({x:player.x,y:player.y,vx:Math.cos(a)*3,vy:Math.sin(a)*3,life:20,r:3+Math.random()*3,color:'#FF5252'});
      }
      if(score>best){best=score;try{localStorage.setItem('kohaku-dash-v4',best);}catch(e){}}
      return;
    }
  }

  // Move coins
  for(var i=coins.length-1;i>=0;i--){
    if(coins[i].resolved){coins.splice(i,1);continue;}coins[i].y+=speed;
    if(coins[i].y>H+40){if(!coins[i].bonus)deliveryCombo=0;coins.splice(i,1);continue;}
    if(Math.abs(coins[i].x-player.x)<30&&Math.abs(coins[i].y-player.y)<30){
      GameShell.feedback(true);if(coins[i].row!==undefined)for(const c of coins)if(c!==coins[i]&&c.row===coins[i].row)c.resolved=true;
      if(coins[i].bonus)score+=25;deliveryCombo++;maxDeliveryCombo=Math.max(maxDeliveryCombo,deliveryCombo);score+=10+Math.min(20,Math.floor(deliveryCombo/5)*5);
      for(var k=0;k<5;k++){
        particles.push({x:coins[i].x,y:coins[i].y,vx:(Math.random()-0.5)*3,vy:-Math.random()*3,life:15,r:14,emoji:'✨',color:''});
      }
      coins.splice(i,1);
    }
  }

  // Distance score
  if(frame%10===0)score++;
}

function loop(){
  X.clearRect(0,0,W,H);
  if(state==='menu'){drawMenu();}
  else if(state==='play'){drawBg();drawCoins();drawObstacles();drawPlayer();drawParticles();drawHUD();}
  else{drawBg();drawCoins();drawObstacles();drawParticles();drawGameOver();}

}
GameShell.run({update,render:loop,reset});
})();


(function(){
const {requestAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval}=GameShell.clock;
var C=document.getElementById('c');
var X=C.getContext('2d');
var W=400,H=600;
C.width=W;C.height=H;
function resize(){var r=Math.min(window.innerWidth/W,GameShell.height()/H);C.style.width=Math.floor(W*r)+'px';C.style.height=Math.floor(H*r)+'px';}
resize();window.addEventListener('resize',resize);

var state='menu',platformIndex=0,lesson='左右移動';
var player,platforms,score,best,scrollY,particles,gameSpeed;
try{best=parseInt(localStorage.getItem('kero-jump-v4'))||0;}catch(e){best=0;}

function reset(){
  GameShell.beginRound();
  player={x:W/2,y:H-80,vy:0,w:24,h:24,onGround:false};
  platforms=[];platformIndex=0;scrollY=0;score=0;particles=[];gameSpeed=1;
  // Initial platforms
  platforms.push({x:W/2-40,y:H-40,w:80,type:'normal'});
  for(var i=1;i<12;i++){
    addPlatform(H-40-i*55);
  }
  player.vy=-8;
}

function addPlatform(y){
  const i=platformIndex++,phase=Math.floor(i/6)%3,slot=i%6;
  const centers=[[200,140,200,260,200,140],[140,140,210,210,260,210],[210,150,210,270,210,150]];
  const center=centers[phase][slot],type=phase===1&&slot%3===2?'moving':phase===2&&slot%3!==0?'breakable':'normal';
  platforms.push({x:center-40,baseX:center-40,y,w:80,type,dir:1,broken:false,phase});
}

function jump(){
  player.vy=-8.5-Math.min(score/800,2);
  for(var i=0;i<4;i++){
    particles.push({x:player.x,y:player.y+12,vx:(Math.random()-0.5)*3,vy:Math.random()*2,life:12,r:2+Math.random()*2,color:'#FFB6C1'});
  }
}

function onInput(e){
  if(e)e.preventDefault();
  if(state==='menu'){state='play';reset();return;}
  if(state==='over'){state='play';reset();return;}
}
var moveDir=0,touchX=null,dragDelta=0;
GameShell.drag(C,{start:e=>{onInput(e);dragDelta=0;},move:dx=>{if(state==='play')dragDelta+=dx/C.getBoundingClientRect().width*W;},end:()=>{dragDelta=0;touchX=null;}});
document.addEventListener('keydown',function(e){
  if(e.code==='Space'){e.preventDefault();onInput(null);}
  if(e.key==='ArrowLeft')moveDir=-1;
  if(e.key==='ArrowRight')moveDir=1;
});
document.addEventListener('keyup',function(e){
  if(e.key==='ArrowLeft'&&moveDir===-1)moveDir=0;
  if(e.key==='ArrowRight'&&moveDir===1)moveDir=0;
});

function drawBg(){
  var g=X.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#6EC6FF');g.addColorStop(0.7,'#B3E5FC');g.addColorStop(1,'#C8E6C9');
  X.fillStyle=g;X.fillRect(0,0,W,H);
  X.save();X.fillStyle='rgba(67,113,123,.14)';
  for(var i=0;i<7;i++){var y=((i*113-(scrollY||0)*.15)%750+750)%750-100;X.fillRect(i%2?330:22,y,30,120);X.fillRect(i%2?320:12,y,50,12);}
  X.restore();
}

function drawPlatform(p){
  var y=p.y-scrollY;
  if(y<-20||y>H+20)return;
  if(p.type==='normal'){X.fillStyle='#66BB6A';}
  else if(p.type==='moving'){X.fillStyle='#42A5F5';}
  else if(p.type==='breakable'){X.fillStyle=p.broken?'rgba(180,180,180,0.5)':'#FFB74D';}
  X.beginPath();
  X.arc(p.x,y,4,Math.PI,0);
  X.arc(p.x+p.w,y,4,Math.PI,0);
  X.fillRect(p.x,y-4,p.w,8);
  X.fill();
  // Top highlight
  X.fillStyle='rgba(255,255,255,0.3)';
  X.fillRect(p.x+2,y-4,p.w-4,3);
}

function drawPlayer(){
  var y=player.y-scrollY;
  X.font='28px serif';X.textAlign='center';X.textBaseline='middle';
  ArcadeArt.draw(X,player.x,y,parseFloat(X.font.replace('bold ','')));
}

function drawParticles(){
  for(var i=particles.length-1;i>=0;i--){
    var p=particles[i];
    p.x+=p.vx;p.y+=p.vy;p.life--;
    if(p.life<=0){particles.splice(i,1);continue;}
    X.globalAlpha=p.life/12;
    X.fillStyle=p.color;
    X.beginPath();X.arc(p.x,p.y-scrollY,p.r,0,Math.PI*2);X.fill();
    X.globalAlpha=1;
  }
}

function drawHUD(){
  X.save();
  X.font='bold 18px sans-serif';X.textAlign='left';X.fillStyle='#fff';
  X.strokeStyle='rgba(0,0,0,0.2)';X.lineWidth=3;
  X.strokeText('スコア: '+score,12,30);
  X.fillText('スコア: '+score,12,30);X.font='14px sans-serif';X.fillText(lesson,12,54);
  X.restore();
}

function drawMenu(){
  drawBg();
  X.save();X.textAlign='center';X.textBaseline='middle';
  X.font='bold 28px sans-serif';X.fillStyle='#4CAF50';
  X.strokeStyle='#fff';X.lineWidth=3;
  X.strokeText('ケロの空中遺跡',W/2,H*0.2);
  X.fillText('ケロの空中遺跡',W/2,H*0.2);
  var fy=Math.sin(Date.now()/300)*12;
  X.font='56px serif';ArcadeArt.draw(X,W/2,H*0.38+fy,parseFloat(X.font.replace('bold ','')));
  X.font='18px sans-serif';X.fillStyle='#666';
  X.fillText('タップで開始！',W/2,H*0.55);
  X.fillText('左右キー / 下のボタンで移動',W/2,H*0.60);
  X.font='13px sans-serif';X.fillText('青は動く足場・橙は一度だけ',W/2,H*0.72);
  if(best>0){X.font='14px sans-serif';X.fillStyle='#888';X.fillText('🏆 ベスト: '+best,W/2,H*0.66);}
  X.restore();
}

function drawGameOver(){
  X.fillStyle='rgba(0,0,0,0.5)';X.fillRect(0,0,W,H);
  X.save();X.textAlign='center';X.textBaseline='middle';
  X.font='bold 28px sans-serif';X.fillStyle='#FF5252';
  X.fillText('ゲームオーバー😢',W/2,H*0.3);
  X.font='18px sans-serif';X.fillStyle='#fff';
  X.fillText('スコア: '+score,W/2,H*0.4);
  if(score>=best&&score>0){X.fillStyle='#FFD740';X.fillText('🎉 ハイスコア！',W/2,H*0.46);}
  X.fillStyle='#ccc';X.fillText('🏆 ベスト: '+best,W/2,H*0.52);
  X.font='16px sans-serif';X.fillStyle='#FF80AB';
  X.fillText('タップでもう一回！',W/2,H*0.62);
  X.restore();
}

function update(){
  if(state!=='play')return;

  // Continuous held input is independent of the operating system key-repeat delay.
  const heldDirection=Number(GameShell.isDown('ArrowRight'))-Number(GameShell.isDown('ArrowLeft'));
  if(heldDirection){player.x+=heldDirection*5;dragDelta=0;}else{const step=Math.max(-5,Math.min(5,dragDelta));player.x+=step;dragDelta-=step;}

  // Wrap
  if(player.x<-10)player.x=W+10;
  if(player.x>W+10)player.x=-10;

  // Gravity
  player.vy+=0.25;
  player.y+=player.vy;

  // Scroll up when player goes above middle
  var screenY=player.y-scrollY;
  if(screenY<H*0.4){
    var diff=H*0.4-screenY;
    scrollY-=diff;
    score=Math.max(score,Math.floor(-scrollY/10));
  }

  // Moving platforms
  for(var i=0;i<platforms.length;i++){
    var p=platforms[i];
    if(p.type==='moving'){
      p.x+=p.dir*1.5;
      if(p.x<p.baseX-25||p.x>p.baseX+25)p.dir*=-1;
    }
  }

  // Collision with platforms (only when falling)
  if(player.vy>0){
    for(var i=0;i<platforms.length;i++){
      var p=platforms[i];
      if(p.broken)continue;
      var py=player.y+12;
      var prevPy=py-player.vy;
      if(py>=p.y-4&&prevPy<p.y-4&&player.x>p.x-10&&player.x<p.x+p.w+10){
        lesson=['左右移動を学ぼう','青い足場を待とう','橙は一度だけ。次へ！'][p.phase||0];
        if(p.type==='breakable'){
          p.broken=true;jump();
          for(var k=0;k<6;k++){particles.push({x:p.x+p.w/2,y:p.y,vx:(Math.random()-0.5)*4,vy:Math.random()*3,life:15,r:3,color:'#FFB74D'});}
        }else{
          jump();
        }
        break;
      }
    }
  }

  // Remove off-screen platforms and add new ones
  var topY=scrollY-50;
  for(var i=platforms.length-1;i>=0;i--){
    if(platforms[i].y-scrollY>H+50){platforms.splice(i,1);}
  }
  // Find highest platform
  var highest=Infinity;
  for(var i=0;i<platforms.length;i++){if(platforms[i].y<highest)highest=platforms[i].y;}
  while(highest>scrollY-H*0.5){
    highest-=55;
    addPlatform(highest);
  }

  // Fall off screen = game over
  if(player.y-scrollY>H+50){
    state='over';
    if(score>best){best=score;try{localStorage.setItem('kero-jump-v4',best);}catch(e){}}
  }
}

function loop(){
  X.clearRect(0,0,W,H);
  if(state==='menu'){drawMenu();}
  else if(state==='play'){
    
    drawBg();
    for(var i=0;i<platforms.length;i++)drawPlatform(platforms[i]);
    drawPlayer();drawParticles();drawHUD();
  }else{
    drawBg();
    for(var i=0;i<platforms.length;i++)drawPlatform(platforms[i]);
    drawParticles();drawGameOver();
  }

}
GameShell.run({update,render:loop,reset});
})();

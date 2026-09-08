
(function(){
var C=document.getElementById('c');
var X=C.getContext('2d');
var W=380,H=640;
C.width=W;C.height=H;
function resize(){var r=Math.min(window.innerWidth/W,GameShell.height()/H);C.style.width=Math.floor(W*r)+'px';C.style.height=Math.floor(H*r)+'px';}
resize();window.addEventListener('resize',resize);

var FRUITS=['🍎','🍊','🍇','🍉','🍓','🍑','🍌','🥝','🍍','🥭'];
var BOMB='💣';
var state='menu';
var items,score,best,lives,combo,maxCombo,frame,effects,slashTrail;
try{best=parseInt(localStorage.getItem('frc1'))||0;}catch(e){best=0;}

document.addEventListener("gamepause",function(){dragging=false;slashTrail=[];});
window.addEventListener("pointerup",function(){dragging=false;slashTrail=[];});
C.addEventListener("touchcancel",function(){dragging=false;slashTrail=[];});
function reset(){
  GameShell.beginRound();
  items=[];score=0;lives=3;combo=0;maxCombo=0;frame=0;effects=[];slashTrail=[];
}

function spawnItem(){
  var isBomb=Math.random()<0.15;
  var emoji=isBomb?BOMB:FRUITS[Math.floor(Math.random()*FRUITS.length)];
  var x=40+Math.random()*(W-80);
  var vy=-12-Math.random()*5;
  var vx=(Math.random()-0.5)*4;
  items.push({
    x:x,y:H+30,vx:vx,vy:vy,
    emoji:emoji,isBomb:isBomb,
    size:36,cut:false,rotation:0,rotSpd:(Math.random()-0.5)*0.1
  });
}

function onTap(e){
  e.preventDefault();
  if(state==='menu'){state='play';reset();return;}
  if(state==='over'){state='menu';return;}
}

function getXY(e){
  var rect=C.getBoundingClientRect();
  if(e.touches){return{x:(e.touches[0].clientX-rect.left)/rect.width*W,y:(e.touches[0].clientY-rect.top)/rect.height*H};}
  return{x:(e.clientX-rect.left)/rect.width*W,y:(e.clientY-rect.top)/rect.height*H};
}

var dragging=false;
C.addEventListener('mousedown',function(e){
  e.preventDefault();
  if(state!=='play'){onTap(e);return;}
  dragging=true;var p=getXY(e);slashTrail=[p];checkHit(p);
});
C.addEventListener('mousemove',function(e){
  if(!dragging||state!=='play')return;
  var p=getXY(e);slashTrail.push(p);if(slashTrail.length>15)slashTrail.shift();checkHit(p);
});
C.addEventListener('mouseup',function(){dragging=false;slashTrail=[];});

C.addEventListener('touchstart',function(e){
  e.preventDefault();
  if(state!=='play'){onTap(e);return;}
  var p=getXY(e);slashTrail=[p];checkHit(p);
},{passive:false});
C.addEventListener('touchmove',function(e){
  e.preventDefault();
  if(state!=='play')return;
  var p=getXY(e);slashTrail.push(p);if(slashTrail.length>15)slashTrail.shift();checkHit(p);
},{passive:false});
C.addEventListener('touchend',function(e){e.preventDefault();slashTrail=[];},{passive:false});

function checkHit(pos){
  for(var i=items.length-1;i>=0;i--){
    var it=items[i];
    if(it.cut)continue;
    var dx=pos.x-it.x,dy=pos.y-it.y;
    if(dx*dx+dy*dy<it.size*it.size){
      it.cut=true;
      if(it.isBomb){
        // Hit bomb!
        lives--;combo=0;
        effects.push({x:it.x,y:it.y,text:'💥',life:25,color:'#FF5252',big:true});
        for(var k=0;k<8;k++){
          var a=Math.random()*Math.PI*2;
          effects.push({x:it.x,y:it.y,vx:Math.cos(a)*4,vy:Math.sin(a)*4,life:18,r:3+Math.random()*3,color:'#FF5252'});
        }
        if(lives<=0){
          state='over';
          if(score>best){best=score;try{localStorage.setItem('frc1',best);}catch(e){}}
        }
      }else{
        // Cut fruit!
        combo++;if(combo>maxCombo)maxCombo=combo;
        var pts=10+combo*3;
        score+=pts;
        effects.push({x:it.x,y:it.y-20,text:'+'+pts,life:22,color:'#FFD740',vx:0,vy:-1});
        // Juice particles
        var colors=['#FF5252','#FF9800','#4CAF50','#9C27B0','#FFD740'];
        for(var k=0;k<5;k++){
          var a=Math.random()*Math.PI*2;
          effects.push({x:it.x,y:it.y,vx:Math.cos(a)*3,vy:Math.sin(a)*3,life:15,r:2+Math.random()*3,color:colors[Math.floor(Math.random()*colors.length)]});
        }
      }
    }
  }
}

function drawBg(){
  var g=X.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#1a237e');g.addColorStop(0.5,'#283593');g.addColorStop(1,'#1565C0');
  X.fillStyle=g;X.fillRect(0,0,W,H);
}

function drawSlashTrail(){
  if(slashTrail.length<2)return;
  X.strokeStyle='rgba(255,255,255,0.6)';X.lineWidth=3;X.lineCap='round';
  X.beginPath();
  X.moveTo(slashTrail[0].x,slashTrail[0].y);
  for(var i=1;i<slashTrail.length;i++){
    X.lineTo(slashTrail[i].x,slashTrail[i].y);
  }
  X.stroke();
  // Glow
  X.strokeStyle='rgba(255,215,64,0.3)';X.lineWidth=8;
  X.beginPath();
  X.moveTo(slashTrail[0].x,slashTrail[0].y);
  for(var i=1;i<slashTrail.length;i++){
    X.lineTo(slashTrail[i].x,slashTrail[i].y);
  }
  X.stroke();
}

function drawItems(){
  X.textAlign='center';X.textBaseline='middle';
  for(var i=0;i<items.length;i++){
    var it=items[i];
    if(it.cut)continue;
    X.save();
    X.translate(it.x,it.y);
    X.rotate(it.rotation);
    X.font=it.size+'px serif';
    X.fillText(it.emoji,0,0);
    X.restore();
  }
}

function drawEffects(){
  for(var i=effects.length-1;i>=0;i--){
    var e=effects[i];
    if(e.vx!==undefined){e.x+=e.vx;e.y+=e.vy;}
    e.life--;
    if(e.life<=0){effects.splice(i,1);continue;}
    X.globalAlpha=e.life/22;
    if(e.text){
      X.font=e.big?'40px serif':'bold 18px sans-serif';
      X.textAlign='center';X.fillStyle=e.color;
      X.fillText(e.text,e.x,e.y);
    }else{
      X.fillStyle=e.color;
      X.beginPath();X.arc(e.x,e.y,e.r,0,Math.PI*2);X.fill();
    }
    X.globalAlpha=1;
  }
}

function drawHUD(){
  X.save();
  X.font='bold 18px sans-serif';X.textAlign='left';X.fillStyle='#fff';
  X.fillText('スコア: '+score,12,30);
  X.textAlign='right';
  var hp='';for(var i=0;i<lives;i++)hp+='💖';
  X.fillText(hp,W-12,30);
  if(combo>2){
    X.textAlign='center';X.font='bold 20px sans-serif';X.fillStyle='#FFD740';
    X.fillText(combo+' COMBO!',W/2,60);
  }
  X.restore();
}

function drawMenu(){
  drawBg();
  X.save();X.textAlign='center';X.textBaseline='middle';
  X.font='bold 26px sans-serif';X.fillStyle='#FF9800';
  X.fillText('フルーツカット',W/2,H*0.15);
  var fy=Math.sin(GameShell.now()/400)*8;
  X.font='55px serif';X.fillText('🍎🍎',W/2,H*0.32+fy);
  X.font='15px sans-serif';X.fillStyle='#aaa';
  X.fillText('フルーツをスワイプで切ろう！',W/2,H*0.48);
  X.fillText('💣ボムに触れたらライフが減るよ！',W/2,H*0.53);
  if(best>0){X.font='14px sans-serif';X.fillStyle='#777';X.fillText('🏆 ベスト: '+best,W/2,H*0.59);}
  X.font='18px sans-serif';X.fillStyle='#FF80AB';
  X.fillText('タップで開始！',W/2,H*0.70);
  X.restore();
}

function drawGameOver(){
  X.fillStyle='rgba(0,0,0,0.6)';X.fillRect(0,0,W,H);
  X.save();X.textAlign='center';X.textBaseline='middle';
  X.font='bold 28px sans-serif';X.fillStyle='#FF5252';
  X.fillText('ゲームオーバー😢',W/2,H*0.25);
  X.font='20px sans-serif';X.fillStyle='#fff';
  X.fillText('スコア: '+score,W/2,H*0.35);
  X.fillText('最大コンボ: '+maxCombo,W/2,H*0.41);
  if(score>=best&&score>0){X.fillStyle='#FFD740';X.fillText('🎉 ハイスコア！',W/2,H*0.48);}
  X.fillStyle='#ccc';X.fillText('🏆 ベスト: '+best,W/2,H*0.55);
  X.font='16px sans-serif';X.fillStyle='#FF80AB';
  X.fillText('タップでタイトルへ',W/2,H*0.67);
  X.restore();
}

function update(){
  if(state!=='play')return;
  frame++;

  // Spawn
  var rate=Math.max(15,40-Math.floor(score/30));
  if(frame%rate===0){
    var count=1;
    if(score>100)count=1+Math.floor(Math.random()*2);
    if(score>300)count=2+Math.floor(Math.random()*2);
    for(var i=0;i<count;i++)spawnItem();
  }

  // Move items
  for(var i=items.length-1;i>=0;i--){
    var it=items[i];
    it.x+=it.vx;
    it.vy+=0.3; // gravity
    it.y+=it.vy;
    it.rotation+=it.rotSpd;

    // Off screen
    if(it.y>H+50){
      if(!it.cut&&!it.isBomb){
        // Missed fruit
        combo=0;
      }
      items.splice(i,1);
    }
  }
}

function loop(){
  X.clearRect(0,0,W,H);
  if(state==='menu'){drawMenu();}
  else if(state==='play'){update();drawBg();drawItems();drawSlashTrail();drawEffects();drawHUD();}
  else{drawBg();drawEffects();drawGameOver();}
  requestAnimationFrame(loop);
}
loop();
})();

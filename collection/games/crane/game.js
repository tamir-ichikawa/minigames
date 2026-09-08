
(function(){
var C=document.getElementById('c'),X=C.getContext('2d');
var W=380,H=640;C.width=W;C.height=H;
function resize(){var r=Math.min(window.innerWidth/W,GameShell.height()/H);C.style.width=Math.floor(W*r)+'px';C.style.height=Math.floor(H*r)+'px';}
resize();window.addEventListener('resize',resize);

var PRIZES=['🏗️','🧸','🎀','⭐','🌸','🍰','💎','🎵','🦊','🐱','🍎','🎃','🦋','🌻','🐧'];
var state='menu'; // menu, swing, drop, grab, result
var crane,prizes,caught,round,totalRounds,score,speed;

function reset(){
  GameShell.beginRound();
  round=0;totalRounds=5;score=0;caught=[];
  setupRound();
}

function setupRound(){
  // Place prizes
  prizes=[];
  var count=4+Math.min(round,4);
  var pw=W-40;
  for(var i=0;i<count;i++){
    var emoji=PRIZES[Math.floor(Math.random()*PRIZES.length)];
    var x=30+Math.random()*pw;
    var y=H-120+Math.random()*40;
    var pts=[10,15,20,25,30,50][Math.floor(Math.random()*6)];
    prizes.push({x:x,y:y,emoji:emoji,pts:pts,caught:false});
  }
  speed=2+round*0.5;if(speed>5)speed=5;
  crane={x:W/2,y:60,dir:1,armY:60,dropping:false,grabbing:false,grabbed:null,returning:false};
  state='swing';
}

function tap(){
  if(state==='menu'){reset();state='swing';return;}
  if(state==='result'){state='menu';return;}
  if(state==='swing'){
    // Stop and drop
    crane.dropping=true;state='drop';
  }
}

C.addEventListener('mousedown',function(e){e.preventDefault();tap();});
C.addEventListener('touchstart',function(e){e.preventDefault();tap();},{passive:false});

function drawBg(){
  // Machine background
  X.fillStyle='#BBDEFB';X.fillRect(0,0,W,H);
  // Glass
  X.fillStyle='rgba(255,255,255,0.3)';X.fillRect(15,45,W-30,H-140);
  X.strokeStyle='#90CAF9';X.lineWidth=4;
  X.strokeRect(15,45,W-30,H-140);
  // Base
  X.fillStyle='#78909C';X.fillRect(0,H-90,W,90);
  X.fillStyle='#546E7A';X.fillRect(0,H-90,W,6);
  // Title on machine
  X.font='bold 14px sans-serif';X.textAlign='center';X.fillStyle='#1565C0';
  X.fillText('🏗️ クレーンゲーム 🏗️',W/2,35);
}

function drawPrizes(){
  X.textAlign='center';X.textBaseline='middle';
  for(var i=0;i<prizes.length;i++){
    var p=prizes[i];
    if(p.caught)continue;
    X.font='32px serif';
    X.fillText(p.emoji,p.x,p.y);
    // Price tag
    X.font='10px sans-serif';X.fillStyle='#FF6F00';
    X.fillText(p.pts+'pt',p.x,p.y+22);
  }
}

function drawCrane(){
  // Rail
  X.fillStyle='#455A64';X.fillRect(20,50,W-40,6);
  // Vertical line
  X.strokeStyle='#78909C';X.lineWidth=2;
  X.beginPath();X.moveTo(crane.x,56);X.lineTo(crane.x,crane.armY);X.stroke();
  // Crane head
  X.fillStyle='#FF9800';
  X.fillRect(crane.x-15,50,30,12);
  // Claw
  var clawY=crane.armY;
  X.strokeStyle='#FF9800';X.lineWidth=3;
  // Left claw
  X.beginPath();X.moveTo(crane.x-2,clawY);X.lineTo(crane.x-12,clawY+15);X.stroke();
  // Right claw
  X.beginPath();X.moveTo(crane.x+2,clawY);X.lineTo(crane.x+12,clawY+15);X.stroke();

  // Grabbed prize
  if(crane.grabbed){
    X.font='28px serif';X.textAlign='center';X.textBaseline='middle';
    X.fillText(crane.grabbed.emoji,crane.x,clawY+25);
  }
}

function drawHUD(){
  X.save();
  X.font='bold 14px sans-serif';X.textAlign='left';X.fillStyle='#fff';
  X.fillText('ラウンド: '+(round+1)+'/'+totalRounds,15,H-70);
  X.textAlign='right';
  X.fillText('スコア: '+score,W-15,H-70);
  // Caught prizes
  X.textAlign='center';X.font='22px serif';
  for(var i=0;i<caught.length;i++){
    X.fillText(caught[i].emoji,30+i*35,H-35);
  }
  X.restore();
}

function drawMenu(){
  drawBg();
  X.save();X.textAlign='center';X.textBaseline='middle';
  X.font='bold 24px sans-serif';X.fillStyle='#FF6F00';
  X.fillText('クレーンゲーム',W/2,H*0.15);
  var fy=Math.sin(GameShell.now()/400)*8;
  X.font='50px serif';X.fillText('🏗️🏗️',W/2,H*0.30+fy);
  X.font='15px sans-serif';X.fillStyle='#555';
  X.fillText('タップでクレーンを止めて',W/2,H*0.46);
  X.fillText('景品をキャッチ！',W/2,H*0.51);
  X.font='18px sans-serif';X.fillStyle='#FF80AB';
  X.fillText('タップで開始！',W/2,H*0.65);
  X.restore();
}

function drawResult(){
  X.fillStyle='rgba(0,0,0,0.5)';X.fillRect(0,0,W,H);
  X.save();X.textAlign='center';X.textBaseline='middle';
  X.font='bold 26px sans-serif';X.fillStyle='#FFD740';
  X.fillText('けっか🏗️',W/2,H*0.18);
  X.font='20px sans-serif';X.fillStyle='#fff';
  X.fillText('スコア: '+score+'てん',W/2,H*0.28);
  X.fillText('ゲットした景品:',W/2,H*0.36);
  X.font='36px serif';
  for(var i=0;i<caught.length;i++){
    X.fillText(caught[i].emoji,W/2-caught.length*20+i*40+20,H*0.45);
  }
  if(caught.length===0){X.font='16px sans-serif';X.fillStyle='#aaa';X.fillText('ゲットできなかった〜💦',W/2,H*0.45);}
  X.font='16px sans-serif';X.fillStyle='#FF80AB';
  X.fillText('タップでタイトルへ',W/2,H*0.62);
  X.restore();
}

function update(){
  if(state==='swing'){
    crane.x+=crane.dir*speed;
    if(crane.x>W-35){crane.dir=-1;}
    if(crane.x<35){crane.dir=1;}
  }else if(state==='drop'){
    crane.armY+=3;
    // Check if hit a prize
    for(var i=0;i<prizes.length;i++){
      var p=prizes[i];
      if(p.caught)continue;
      if(Math.abs(crane.x-p.x)<18&&crane.armY+15>p.y-10){
        // Grab!
        crane.grabbed=p;p.caught=true;
        state='grab';
        break;
      }
    }
    // Hit bottom
    if(crane.armY>H-130){
      state='grab';
    }
  }else if(state==='grab'){
    // Return up
    crane.armY-=2;
    if(crane.armY<=60){
      // Round complete
      if(crane.grabbed){
        score+=crane.grabbed.pts;
        caught.push(crane.grabbed);
      }
      round++;
      if(round>=totalRounds){state='result';}
      else{setupRound();}
    }
  }
}

function loop(){
  X.clearRect(0,0,W,H);
  if(state==='menu'){drawMenu();}
  else if(state==='result'){drawBg();drawResult();}
  else{update();drawBg();drawPrizes();drawCrane();drawHUD();}
  requestAnimationFrame(loop);
}
loop();
})();


(function(){
var C=document.getElementById('c');
var X=C.getContext('2d');
var W=380,H=640;
C.width=W;C.height=H;
function resize(){var r=Math.min(window.innerWidth/W,GameShell.height()/H);C.style.width=Math.floor(W*r)+'px';C.style.height=Math.floor(H*r)+'px';}
resize();window.addEventListener('resize',resize);

var AC;
try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(e){AC=null;}
function sfx(freq,dur){
  if(!AC)return;try{if(AC.state==='suspended')AC.resume();
  var o=AC.createOscillator(),g=AC.createGain();
  o.connect(g);g.connect(GameShell.audioOutput(AC));o.frequency.value=freq;o.type='sine';
  g.gain.setValueAtTime(0.08,AC.currentTime);g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+dur);
  o.start();o.stop(AC.currentTime+dur);}catch(e){}
}

var state='menu';
// 6 color groups with matching emoji
var GROUPS=[
  {color:'#FF80AB',emoji:'🌸',name:'ピンク'},
  {color:'#7C4DFF',emoji:'🔮',name:'むらさき'},
  {color:'#FFD740',emoji:'⭐',name:'きいろ'},
  {color:'#00BCD4',emoji:'💎',name:'みずいろ'},
  {color:'#FF5722',emoji:'🍎',name:'あか'},
  {color:'#66BB6A',emoji:'🍀',name:'みどり'}
];
var state='menu';
var bubbles,score,best,popped,effects,combo,maxCombo,colorStreak,lastColor,lives;
var spawnTimer,baseSpeed,elapsed,startTime,duration;
try{best=parseInt(localStorage.getItem('bub2'))||0;}catch(e){best=0;}

function reset(){
  GameShell.beginRound();
  bubbles=[];score=0;popped=0;effects=[];combo=0;maxCombo=0;
  colorStreak=0;lastColor=-1;lives=5;
  spawnTimer=0;baseSpeed=1;elapsed=0;
  startTime=GameShell.now();duration=60;
}

function spawnBubble(){
  var r=18+Math.random()*20;
  var x=r+Math.random()*(W-r*2);
  var roll=Math.random();
  var type='normal';
  if(roll<0.08)type='bomb';        // 💣 bomb - don't tap!
  else if(roll<0.14)type='blast';  // 💥 blast - clears nearby
  else if(roll<0.20)type='golden'; // 🌟 golden - high score

  var groupIdx=Math.floor(Math.random()*GROUPS.length);
  var spd=baseSpeed+Math.random()*0.8;

  bubbles.push({
    x:x,y:H+r+Math.random()*30,r:r,
    vy:-spd,vx:(Math.random()-0.5)*0.6,
    groupIdx:groupIdx,type:type,
    wobble:Math.random()*Math.PI*2,alpha:1
  });
}

function onTap(e){
  e.preventDefault();
  if(state==='menu'){state='play';reset();if(AC&&AC.state==='suspended')AC.resume();return;}
  if(state==='over'){state='menu';return;}
  if(state!=='play')return;

  var rect=C.getBoundingClientRect();
  var tx,ty;
  if(e.touches){tx=(e.touches[0].clientX-rect.left)/rect.width*W;ty=(e.touches[0].clientY-rect.top)/rect.height*H;}
  else{tx=(e.clientX-rect.left)/rect.width*W;ty=(e.clientY-rect.top)/rect.height*H;}

  var hit=false;
  // Check from top (newest) to bottom
  for(var i=bubbles.length-1;i>=0;i--){
    var b=bubbles[i];
    var dx=tx-b.x,dy=ty-b.y;
    if(dx*dx+dy*dy<(b.r+5)*(b.r+5)){
      hit=true;

      if(b.type==='bomb'){
        // BOMB! Lose a life, reset combos
        lives--;combo=0;colorStreak=0;lastColor=-1;
        sfx(150,0.3);
        addExplosion(b.x,b.y,'#FF5252',10);
        effects.push({x:b.x,y:b.y,text:'💥BOOM!',life:30,color:'#FF5252',vx:0,vy:-1,big:true});
        bubbles.splice(i,1);
        if(lives<=0){endGame();}
        break;
      }

      if(b.type==='blast'){
        // BLAST! Clear nearby bubbles
        sfx(600,0.15);
        var blastR=100;
        var cleared=0;
        for(var j=bubbles.length-1;j>=0;j--){
          if(j===i)continue;
          var bj=bubbles[j];
          var d=Math.sqrt((bj.x-b.x)*(bj.x-b.x)+(bj.y-b.y)*(bj.y-b.y));
          if(d<blastR&&bj.type!=='bomb'){
            addExplosion(bj.x,bj.y,GROUPS[bj.groupIdx].color,4);
            bubbles.splice(j,1);
            if(j<i)i--;
            cleared++;popped++;
          }
        }
        score+=cleared*15;
        addExplosion(b.x,b.y,'#FFD740',12);
        effects.push({x:b.x,y:b.y,text:'💥×'+(cleared+1),life:28,color:'#FFD740',vx:0,vy:-1.5});
        // Draw blast ring
        effects.push({x:b.x,y:b.y,ring:true,life:20,color:'#FFD740',maxR:blastR});
        bubbles.splice(i,1);popped++;
        score+=20;combo++;
        break;
      }

      // Normal or golden bubble
      var pts=b.type==='golden'?50:10;
      combo++;

      // Color streak bonus
      if(b.groupIdx===lastColor){
        colorStreak++;
        pts+=colorStreak*5; // +5, +10, +15... for each same-color in a row
        if(colorStreak>=3){
          effects.push({x:b.x,y:b.y-b.r-15,text:'🔥'+GROUPS[b.groupIdx].name+'×'+colorStreak,life:30,color:GROUPS[b.groupIdx].color,vx:0,vy:-1});
        }
      }else{
        colorStreak=1;
      }
      lastColor=b.groupIdx;

      if(combo>maxCombo)maxCombo=combo;
      pts+=Math.floor(combo*1.5);
      score+=pts;popped++;

      sfx(400+b.groupIdx*80,0.08);
      addExplosion(b.x,b.y,GROUPS[b.groupIdx].color,5);
      effects.push({x:b.x,y:b.y-b.r,text:'+'+pts,life:22,color:b.type==='golden'?'#FFD740':'#fff',vx:0,vy:-1.2});

      bubbles.splice(i,1);
      break;
    }
  }
  if(!hit){combo=0;colorStreak=0;lastColor=-1;}
}

C.addEventListener('mousedown',onTap);
C.addEventListener('touchstart',onTap,{passive:false});

function addExplosion(x,y,color,count){
  for(var k=0;k<count;k++){
    var a=Math.random()*Math.PI*2;
    effects.push({x:x,y:y,vx:Math.cos(a)*3,vy:Math.sin(a)*3,life:16,r:2+Math.random()*3,color:color});
  }
}

function drawBg(){
  var g=X.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#E3F2FD');g.addColorStop(0.4,'#BBDEFB');g.addColorStop(0.8,'#90CAF9');g.addColorStop(1,'#64B5F6');
  X.fillStyle=g;X.fillRect(0,0,W,H);
  // Light rays
  X.globalAlpha=0.03;X.fillStyle='#fff';
  for(var i=0;i<5;i++){var rx=40+i*75;X.beginPath();X.moveTo(rx,0);X.lineTo(rx+40,H);X.lineTo(rx+60,H);X.lineTo(rx+20,0);X.fill();}
  X.globalAlpha=1;
}

function drawBubble(b){
  X.save();
  b.wobble+=0.03;
  var wx=Math.sin(b.wobble)*2;
  var bx=b.x+wx;

  // Bubble body
  var grp=GROUPS[b.groupIdx];
  var col=b.type==='bomb'?'#555':b.type==='blast'?'#FF6E40':b.type==='golden'?'#FFD740':grp.color;

  X.beginPath();X.arc(bx,b.y,b.r,0,Math.PI*2);
  var g=X.createRadialGradient(bx-b.r*0.3,b.y-b.r*0.3,b.r*0.1,bx,b.y,b.r);
  g.addColorStop(0,'rgba(255,255,255,0.5)');g.addColorStop(0.5,col);g.addColorStop(1,col);
  X.fillStyle=g;X.fill();

  // Shine
  X.fillStyle='rgba(255,255,255,0.4)';
  X.beginPath();X.arc(bx-b.r*0.25,b.y-b.r*0.25,b.r*0.18,0,Math.PI*2);X.fill();

  // Emoji
  var em=b.type==='bomb'?'💣':b.type==='blast'?'💥':b.type==='golden'?'🌟':grp.emoji;
  X.font=Math.floor(b.r*0.85)+'px serif';
  X.textAlign='center';X.textBaseline='middle';
  X.fillText(em,bx,b.y+1);

  // Color indicator ring for normal bubbles
  if(b.type==='normal'){
    X.strokeStyle=col;X.lineWidth=2;X.globalAlpha=0.4;
    X.beginPath();X.arc(bx,b.y,b.r+3,0,Math.PI*2);X.stroke();
    X.globalAlpha=1;
  }

  X.restore();
}

function drawEffects(){
  for(var i=effects.length-1;i>=0;i--){
    var e=effects[i];
    if(e.vx!==undefined){e.x+=e.vx;e.y+=e.vy;}
    e.life--;
    if(e.life<=0){effects.splice(i,1);continue;}
    X.globalAlpha=e.life/(e.ring?20:22);
    if(e.ring){
      var r=e.maxR*(1-e.life/20);
      X.strokeStyle=e.color;X.lineWidth=3;
      X.beginPath();X.arc(e.x,e.y,r,0,Math.PI*2);X.stroke();
    }else if(e.text){
      X.font=(e.big?'bold 24':'bold 16')+'px sans-serif';X.textAlign='center';X.fillStyle=e.color;
      X.fillText(e.text,e.x,e.y);
    }else{
      X.fillStyle=e.color;X.beginPath();X.arc(e.x,e.y,e.r,0,Math.PI*2);X.fill();
    }
    X.globalAlpha=1;
  }
}

function drawHUD(){
  X.save();
  X.font='bold 16px sans-serif';X.textAlign='left';X.fillStyle='#333';
  X.fillText('スコア: '+score,12,28);
  X.textAlign='right';
  var left=Math.max(0,duration-elapsed);
  X.fillText('残り: '+Math.ceil(left)+'秒',W-12,28);
  // Lives
  X.textAlign='left';X.font='14px serif';
  var hp='';for(var j=0;j<lives;j++)hp+='💖';for(var j=lives;j<5;j++)hp+='🖤';
  X.fillText(hp,12,50);
  // Speed indicator
  X.textAlign='right';X.font='12px sans-serif';X.fillStyle='#888';
  X.fillText('Speed: ×'+baseSpeed.toFixed(1),W-12,50);
  // Combo
  if(combo>2){
    X.textAlign='center';X.font='bold 20px sans-serif';X.fillStyle='#FF6F00';
    X.fillText(combo+' COMBO!',W/2,70);
  }
  // Color streak
  if(colorStreak>=3&&lastColor>=0){
    X.textAlign='center';X.font='bold 16px sans-serif';X.fillStyle=GROUPS[lastColor].color;
    X.fillText('🔥 '+GROUPS[lastColor].name+'ストリーク ×'+colorStreak,W/2,90);
  }
  X.restore();
}

function drawMenu(){
  drawBg();
  var t=GameShell.now()/1000;
  for(var i=0;i<8;i++){
    var bx=30+i*48;var by=H*0.55+Math.sin(t+i)*25;
    X.globalAlpha=0.25;X.fillStyle=GROUPS[i%GROUPS.length].color;
    X.beginPath();X.arc(bx,by,12+i*2,0,Math.PI*2);X.fill();X.globalAlpha=1;
  }
  X.save();X.textAlign='center';X.textBaseline='middle';
  X.font='bold 24px sans-serif';X.fillStyle='#1565C0';
  X.fillText('バブルポップ',W/2,H*0.12);
  var fy=Math.sin(t*1.5)*10;
  X.font='50px serif';X.fillText('🫧🫧',W/2,H*0.26+fy);
  X.font='14px sans-serif';X.fillStyle='#555';
  X.fillText('バブルをタップしてわろう！',W/2,H*0.40);
  X.fillText('🌟 金色バブル = 高得点！',W/2,H*0.45);
  X.fillText('💥 ブラスト = 周りをまとめて消す！',W/2,H*0.50);
  X.fillText('💣 ボム = さわっちゃダメ！',W/2,H*0.55);
  X.fillText('🔥 同じ色を続けるとボーナス！',W/2,H*0.60);
  if(best>0){X.font='13px sans-serif';X.fillStyle='#888';X.fillText('🏆 ベスト: '+best,W/2,H*0.66);}
  X.font='18px sans-serif';X.fillStyle='#FF80AB';
  X.fillText('タップで開始！',W/2,H*0.76);
  X.restore();
}

function drawGameOver(){
  X.fillStyle='rgba(0,0,0,0.45)';X.fillRect(0,0,W,H);
  X.save();X.textAlign='center';X.textBaseline='middle';
  if(score>=best&&score>0){
    X.font='bold 26px sans-serif';X.fillStyle='#FFD740';X.fillText('🎉 ハイスコア！',W/2,H*0.20);
  }else{
    X.font='bold 26px sans-serif';X.fillStyle='#1565C0';X.fillText('おしまい！🫧',W/2,H*0.20);
  }
  X.font='18px sans-serif';X.fillStyle='#fff';
  X.fillText('スコア: '+score,W/2,H*0.30);
  X.fillText(popped+'こ わったよ！',W/2,H*0.36);
  X.fillText('最大コンボ: '+maxCombo,W/2,H*0.42);
  X.fillStyle='#ccc';X.fillText('🏆 ベスト: '+best,W/2,H*0.49);
  X.font='16px sans-serif';X.fillStyle='#FF80AB';
  X.fillText('タップでタイトルへ',W/2,H*0.62);
  X.restore();
}

function endGame(){
  state='over';
  if(score>best){best=score;try{localStorage.setItem('bub2',best);}catch(e){}}
}

function update(){
  if(state!=='play')return;
  elapsed=(GameShell.now()-startTime)/1000;

  // Gradually increase speed
  baseSpeed=1+elapsed*0.03;if(baseSpeed>3.5)baseSpeed=3.5;

  // Spawn rate increases
  spawnTimer++;
  var rate=Math.max(8,35-Math.floor(elapsed/3));
  if(spawnTimer>=rate){spawnTimer=0;spawnBubble();}

  // Move
  for(var i=bubbles.length-1;i>=0;i--){
    var b=bubbles[i];
    b.y+=b.vy*(baseSpeed*0.7);
    b.x+=b.vx;
    if(b.x<b.r||b.x>W-b.r)b.vx*=-1;
    if(b.y<-b.r*2){
      if(b.type!=='bomb'){lives--;combo=0;colorStreak=0;lastColor=-1;}
      bubbles.splice(i,1);
      if(lives<=0){endGame();return;}
    }
  }

  if(elapsed>=duration){endGame();}
}

function loop(){
  X.clearRect(0,0,W,H);
  if(state==='menu'){drawMenu();}
  else if(state==='play'){update();drawBg();for(var i=0;i<bubbles.length;i++)drawBubble(bubbles[i]);drawEffects();drawHUD();}
  else{drawBg();drawEffects();drawGameOver();}
  requestAnimationFrame(loop);
}
loop();
})();


(function(){
var C=document.getElementById('c');
var X=C.getContext('2d');
var W=380,H=640;
C.width=W;C.height=H;
function resize(){var r=Math.min(window.innerWidth/W,GameShell.height()/H);C.style.width=Math.floor(W*r)+'px';C.style.height=Math.floor(H*r)+'px';}
resize();window.addEventListener('resize',resize);

var AC;
try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(e){AC=null;}
function beep(freq,dur){
  if(!AC)return;try{if(AC.state==='suspended')AC.resume();
  var o=AC.createOscillator(),g=AC.createGain();
  o.connect(g);g.connect(GameShell.audioOutput(AC));o.frequency.value=freq;o.type='triangle';
  g.gain.setValueAtTime(0.12,AC.currentTime);g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+dur);
  o.start();o.stop(AC.currentTime+dur);}catch(e){}
}
function tick(){beep(300,0.03);}

var state='menu';
var bpm,interval,score,combo,maxCombo,beatNum,totalBeats;
var lastBeatTime,nextBeatTime,startTime,effects,ringPulse,judge,metronomeTimer;
var SPEEDS=[{name:'ゆっくり 🐢',bpm:72,beats:24},{name:'ふつう 🎵',bpm:100,beats:32},{name:'はやい 🔥',bpm:130,beats:40},{name:'鬼速 💀',bpm:160,beats:48}];
var speedIdx=1;

function reset(){
  GameShell.beginRound();
  var sp=SPEEDS[speedIdx];
  bpm=sp.bpm;totalBeats=sp.beats;
  interval=60000/bpm;
  score=0;combo=0;maxCombo=0;
  beatNum=0;effects=[];ringPulse=0;
  judge={perfect:0,great:0,good:0,miss:0};
  startTime=GameShell.now();
  nextBeatTime=startTime+2000;
  // Metronome guide (plays tick on each beat)
  clearInterval(metronomeTimer);
  var firstBeat=nextBeatTime;
  metronomeTimer=setInterval(function(){
    if(state!=='play')return;
    var now=GameShell.now();
    if(now>=firstBeat){tick();firstBeat+=interval;}
  },10);
}

function tap(){
  if(state==='menu'){state='play';reset();if(AC&&AC.state==='suspended')AC.resume();return;}
  if(state==='over'){state='menu';return;}
  if(state!=='play')return;

  var now=GameShell.now();
  // Only the pending beat can score; consumed beats cannot be farmed.
  var d=Math.abs(now-nextBeatTime);
  if(d<180){
    var j,pts,col,freq;
    if(d<30){j='Perfect!';pts=100;col='#FFD740';freq=880;judge.perfect++;}
    else if(d<70){j='Great!';pts=70;col='#7C4DFF';freq=660;judge.great++;}
    else{j='Good';pts=40;col='#4CAF50';freq=440;judge.good++;}
    combo++;if(combo>maxCombo)maxCombo=combo;
    var mult=1+combo*0.08;
    score+=Math.floor(pts*mult);
    beep(freq,0.08);
    ringPulse=1;
    effects.push({text:j+(combo>=5?' 🔥':''),life:28,color:col,y:0});
    beatNum++;nextBeatTime+=interval;
  }else{
    combo=0;
    effects.push({text:'Miss💦',life:25,color:'#FF5252',y:0});
  }
}

function handleInput(e){
  e.preventDefault();
  if(state==='menu'){
    var rect=C.getBoundingClientRect();
    var y=e.touches?(e.touches[0].clientY-rect.top)/rect.height*H:(e.clientY-rect.top)/rect.height*H;
    // Check speed options first
    for(var i=0;i<SPEEDS.length;i++){
      var sy=H*0.54+i*34;
      if(Math.abs(y-sy)<22){speedIdx=i;return;}
    }
    // Only start if tapping the "start" area (bottom 20% of screen)
    if(y>H*0.80){tap();return;}
    return; // Ignore taps elsewhere on menu
  }
  tap();
}
C.addEventListener('mousedown',handleInput);
C.addEventListener('touchstart',handleInput,{passive:false});
document.addEventListener('keydown',function(e){if(e.code==='Space'){e.preventDefault();tap();}});

function update(){
  if(state!=='play')return;
  var now=GameShell.now();

  if(now>nextBeatTime+200){
    judge.miss++;combo=0;
    effects.push({text:'Miss💦',life:25,color:'#FF5252',y:0});
    beatNum++;nextBeatTime+=interval;
  }

  if(ringPulse>0)ringPulse-=0.035;
  if(beatNum>=totalBeats){clearInterval(metronomeTimer);state='over';}
}

function drawBg(){
  var g=X.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#0D0D2B');g.addColorStop(0.5,'#1A1A3E');g.addColorStop(1,'#2D1B69');
  X.fillStyle=g;X.fillRect(0,0,W,H);
}

function drawPlay(){
  drawBg();
  var now=GameShell.now();
  var cx=W/2,cy=H*0.42;
  var baseR=85;

  // Beat timing indicator
  var timeToBeat=nextBeatTime-now;
  var beatPct=Math.max(0,Math.min(1,1-timeToBeat/interval));

  // Outer ring guide
  X.strokeStyle='rgba(255,255,255,0.06)';X.lineWidth=8;
  X.beginPath();X.arc(cx,cy,baseR,0,Math.PI*2);X.stroke();

  // Progress arc
  var col=beatPct>0.85?'rgba(255,80,80,0.5)':'rgba(255,215,64,0.3)';
  X.strokeStyle=col;X.lineWidth=8;
  X.beginPath();X.arc(cx,cy,baseR,-Math.PI/2,-Math.PI/2+beatPct*Math.PI*2);X.stroke();

  // Beat indicator dots
  X.fillStyle='rgba(255,255,255,0.1)';
  for(var i=0;i<8;i++){
    var a=-Math.PI/2+i*Math.PI/4;
    X.beginPath();X.arc(cx+Math.cos(a)*baseR,cy+Math.sin(a)*baseR,4,0,Math.PI*2);X.fill();
  }

  // Center - pulses on beat
  var cr=45+ringPulse*25;
  var alpha=0.25+ringPulse*0.5;
  X.fillStyle='rgba(255,128,171,'+alpha+')';
  X.beginPath();X.arc(cx,cy,cr,0,Math.PI*2);X.fill();

  // Inner glow ring
  if(ringPulse>0.3){
    X.strokeStyle='rgba(255,215,64,'+(ringPulse*0.4)+')';X.lineWidth=3;
    X.beginPath();X.arc(cx,cy,cr+10,0,Math.PI*2);X.stroke();
  }

  // Tap emoji
  X.font=(36+ringPulse*12)+'px serif';X.textAlign='center';X.textBaseline='middle';
  X.fillText('🥁',cx,cy);

  // Effects
  for(var i=effects.length-1;i>=0;i--){
    var e=effects[i];e.life--;e.y-=1.2;
    if(e.life<=0){effects.splice(i,1);continue;}
    X.globalAlpha=e.life/28;
    X.font='bold 20px sans-serif';X.textAlign='center';X.fillStyle=e.color;
    X.fillText(e.text,cx,cy-baseR-25+e.y);
    X.globalAlpha=1;
  }

  // HUD
  X.save();
  X.font='bold 16px sans-serif';X.textAlign='left';X.fillStyle='#fff';
  X.fillText('スコア: '+score,15,30);
  X.textAlign='right';
  X.fillText(beatNum+'/'+totalBeats,W-15,30);
  // Progress bar
  X.fillStyle='rgba(255,255,255,0.1)';X.fillRect(15,40,W-30,6);
  X.fillStyle='#FF80AB';X.fillRect(15,40,(W-30)*beatNum/totalBeats,6);

  if(combo>2){
    X.textAlign='center';X.font='bold 22px sans-serif';X.fillStyle='#FFD740';
    X.fillText(combo+' COMBO!',W/2,H*0.75);
  }
  X.font='12px sans-serif';X.textAlign='center';X.fillStyle='#666';
  X.fillText('♩ '+bpm+' BPM',W/2,H*0.82);
  // Hint
  X.fillStyle='rgba(255,255,255,0.15)';X.font='13px sans-serif';
  X.fillText('リングが一周したらタップ！',W/2,H*0.88);
  X.restore();
}

function drawMenu(){
  drawBg();
  X.save();X.textAlign='center';X.textBaseline='middle';
  X.font='bold 26px sans-serif';X.fillStyle='#FFD740';
  X.fillText('ビートタップ',W/2,H*0.13);
  var fy=Math.sin(GameShell.now()/300)*10;
  X.font='50px serif';X.fillText('🥁🥁',W/2,H*0.27+fy);
  X.font='14px sans-serif';X.fillStyle='#aaa';
  X.fillText('リングに合わせてタップ！',W/2,H*0.42);
  X.fillText('メトロノーム音で拍子がわかるよ🎵',W/2,H*0.47);

  for(var i=0;i<SPEEDS.length;i++){
    var y=H*0.54+i*34;
    if(i===speedIdx){
      X.fillStyle='rgba(255,215,64,0.12)';
      X.beginPath();X.arc(W/2,y,55,0,Math.PI*2);X.fill();
      X.fillStyle='#FFD740';
    }else{X.fillStyle='#666';}
    X.font='15px sans-serif';X.fillText(SPEEDS[i].name+' ('+SPEEDS[i].bpm+'BPM)',W/2,y);
  }

  X.font='16px sans-serif';X.fillStyle='#FF80AB';
  // Start button
  X.fillStyle='rgba(255,128,171,0.15)';
  X.beginPath();X.arc(W/2,H*0.88,45,0,Math.PI*2);X.fill();
  X.fillStyle='#FF80AB';X.font='bold 18px sans-serif';
  X.fillText('▶ スタート！',W/2,H*0.88);
  X.restore();
}

function drawResult(){
  drawBg();
  X.save();X.textAlign='center';X.textBaseline='middle';
  X.font='bold 24px sans-serif';X.fillStyle='#FFD740';
  X.fillText('リザルト🥁',W/2,H*0.10);
  X.font='bold 40px sans-serif';X.fillStyle='#FF80AB';
  X.fillText(score,W/2,H*0.20);
  X.font='15px sans-serif';
  var items=[
    {t:'Perfect: '+judge.perfect,c:'#FFD740',y:H*0.30},
    {t:'Great: '+judge.great,c:'#7C4DFF',y:H*0.35},
    {t:'Good: '+judge.good,c:'#4CAF50',y:H*0.40},
    {t:'Miss: '+judge.miss,c:'#FF5252',y:H*0.45},
    {t:'最大コンボ: '+maxCombo,c:'#fff',y:H*0.52}
  ];
  for(var i=0;i<items.length;i++){X.fillStyle=items[i].c;X.fillText(items[i].t,W/2,items[i].y);}

  var total=judge.perfect+judge.great+judge.good+judge.miss;
  var pct=total>0?(judge.perfect+judge.great)/total:0;
  var rank='C';
  if(pct>0.95)rank='S';else if(pct>0.85)rank='A';else if(pct>0.7)rank='B';
  X.font='bold 50px sans-serif';X.fillStyle=rank==='S'?'#FFD740':rank==='A'?'#7C4DFF':'#aaa';
  X.fillText(rank,W/2,H*0.66);
  X.font='14px sans-serif';X.fillStyle='#888';
  X.fillText('タップでタイトルへ',W/2,H*0.78);
  X.restore();
}

// Speed select (keyboard)
document.addEventListener('keydown',function(e){
  if(state==='menu'){
    if(e.key==='ArrowUp'){speedIdx=(speedIdx-1+SPEEDS.length)%SPEEDS.length;}
    if(e.key==='ArrowDown'){speedIdx=(speedIdx+1)%SPEEDS.length;}
  }
});

function loop(){
  X.clearRect(0,0,W,H);
  if(state==='menu'){drawMenu();}
  else if(state==='play'){update();drawPlay();}
  else{drawResult();}
  requestAnimationFrame(loop);
}
loop();
})();


/* GameShell fallback: if shell.js fails to load, provide minimal stubs */
if(typeof GameShell==='undefined'){var GameShell={beginRound:function(){},now:function(){return Date.now();}};}

(function(){

/* ============ Sound Effects (Web Audio API) ============ */
var sfxCtx=null;
var sfxEnabled=true;
var sfxVolume=0.25;

function initAudio(){
  if(sfxCtx) return;
  try{ sfxCtx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){}
}

function playTone(freq,dur,type,vol,decay){
  if(!sfxEnabled||!sfxCtx) return;
  try{
    sfxCtx.resume();
    var osc=sfxCtx.createOscillator();
    var gain=sfxCtx.createGain();
    osc.type=type||'sine';
    osc.frequency.value=freq;
    gain.gain.setValueAtTime((vol||sfxVolume),sfxCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,sfxCtx.currentTime+(decay||dur));
    osc.connect(gain);gain.connect(sfxCtx.destination);
    osc.start(sfxCtx.currentTime);
    osc.stop(sfxCtx.currentTime+(decay||dur));
  }catch(e){}
}

function sfxTap(){
  /* cheerful pop */
  playTone(880,0.08,'sine',0.15,0.08);
  playTone(1320,0.06,'sine',0.1,0.06);
}
function sfxBonus(){
  /* sparkle arpeggio */
  playTone(1047,0.08,'sine',0.18,0.1);
  setTimeout(function(){playTone(1319,0.08,'sine',0.15,0.1);},40);
  setTimeout(function(){playTone(1568,0.1,'sine',0.12,0.12);},80);
}
function sfxBomb(){
  /* low rumble */
  playTone(120,0.2,'sawtooth',0.2,0.25);
  playTone(80,0.15,'square',0.1,0.2);
}
function sfxCombo(){
  /* rising chime */
  playTone(660,0.06,'sine',0.12,0.08);
  setTimeout(function(){playTone(880,0.06,'sine',0.12,0.08);},50);
  setTimeout(function(){playTone(1100,0.08,'sine',0.15,0.1);},100);
}
function sfxMiss(){
  /* soft thud */
  playTone(200,0.1,'triangle',0.08,0.12);
}
function sfxCountdown(){
  /* short beep */
  playTone(600,0.08,'square',0.08,0.1);
}
function sfxCountdownGo(){
  /* higher beep */
  playTone(900,0.1,'square',0.12,0.12);
  setTimeout(function(){playTone(1200,0.12,'sine',0.1,0.15);},60);
}
function sfxGameOver(){
  /* descending melody */
  playTone(880,0.15,'sine',0.15,0.2);
  setTimeout(function(){playTone(660,0.15,'sine',0.12,0.2);},150);
  setTimeout(function(){playTone(440,0.2,'sine',0.1,0.3);},300);
}
function sfxHighScore(){
  /* triumphant fanfare */
  playTone(784,0.12,'sine',0.18,0.15);
  setTimeout(function(){playTone(988,0.12,'sine',0.15,0.15);},120);
  setTimeout(function(){playTone(1175,0.12,'sine',0.15,0.15);},240);
  setTimeout(function(){playTone(1568,0.2,'sine',0.2,0.3);},360);
}
/* ============ End Sound Effects ============ */

var TARGETS=[
  {emoji:'🎯',pts:10,size:65,color:'#FF80AB'},
  {emoji:'⭐',pts:25,size:55,color:'#FFD740'},
  {emoji:'🌸',pts:10,size:60,color:'#F8BBD0'},
  {emoji:'🍎',pts:15,size:55,color:'#EF5350'},
  {emoji:'💖',pts:10,size:58,color:'#FF80AB'},
  {emoji:'🎵',pts:10,size:55,color:'#7C4DFF'},
  {emoji:'🌈',pts:20,size:52,color:'#00BCD4'},
  {emoji:'🍰',pts:15,size:58,color:'#FFB74D'},
  {emoji:'🦋',pts:10,size:55,color:'#CE93D8'},
  {emoji:'🐱',pts:10,size:60,color:'#FFAB91'},
  {emoji:'🍩',pts:15,size:55,color:'#A1887F'},
  {emoji:'🎈',pts:10,size:58,color:'#EF5350'},
  {emoji:'🌻',pts:10,size:60,color:'#FDD835'},
  {emoji:'🍭',pts:15,size:52,color:'#F06292'},
  {emoji:'🐰',pts:20,size:55,color:'#E0E0E0'},
  {emoji:'🎀',pts:10,size:55,color:'#F48FB1'},
  {emoji:'🍓',pts:15,size:52,color:'#E53935'},
  {emoji:'🦊',pts:10,size:58,color:'#FF8A65'},
  {emoji:'🌙',pts:20,size:50,color:'#FFF176'},
  {emoji:'🐧',pts:10,size:55,color:'#90A4AE'},
  {emoji:'🍡',pts:15,size:55,color:'#F8BBD0'},
  {emoji:'🎃',pts:10,size:60,color:'#FFB74D'},
  {emoji:'🐸',pts:10,size:55,color:'#A5D6A7'},
  {emoji:'🎪',pts:20,size:52,color:'#E040FB'}
];
var BOMB={emoji:'💣',pts:-20,size:55,color:'#555'};

var duration=10,score=0,taps=0,combo=0,maxCombo=0,timer,startTime,best,fever=false;
try{best=parseInt(localStorage.getItem('spt2'))||0;}catch(e){best=0;}

/* --- Speed & Size settings --- */
var speedMode='normal';
var sizeMode='normal';
var oniFlashTimer=null;

function getSpeedMult(){
  if(speedMode==='slow') return 1.5;
  if(speedMode==='fast') return 0.55;
  if(speedMode==='oni') return 0.45;
  return 1;
}
function getSizeMult(){
  if(sizeMode==='large') return 1.3;
  if(sizeMode==='small') return 0.65;
  return 1;
}
function getScoreBonus(){
  var b=1;
  if(speedMode==='fast') b*=1.3;
  else if(speedMode==='oni') b*=1.5;
  else if(speedMode==='slow') b*=0.85;
  if(speedMode!=='oni'){
    if(sizeMode==='small') b*=1.2;
    else if(sizeMode==='large') b*=0.9;
  }
  return b;
}

/* --- Anti-overlap placement --- */
function getExistingTargets(zone){
  var rects=[];
  var targets=zone.querySelectorAll('.target');
  for(var i=0;i<targets.length;i++){
    var t=targets[i];
    rects.push({
      x:parseFloat(t.style.left)||0,
      y:parseFloat(t.style.top)||0,
      w:parseFloat(t.style.width)||50,
      h:parseFloat(t.style.height)||50
    });
  }
  return rects;
}

function overlaps(x,y,sz,existing){
  var pad=8;
  for(var i=0;i<existing.length;i++){
    var r=existing[i];
    if(x<r.x+r.w+pad && x+sz+pad>r.x && y<r.y+r.h+pad && y+sz+pad>r.y){
      return true;
    }
  }
  return false;
}

function findPosition(zone,sz){
  var zw=zone.offsetWidth||300,zh=zone.offsetHeight||380;
  var existing=getExistingTargets(zone);
  var margin=10;
  var maxW=zw-sz-margin;
  var maxH=zh-sz-margin;
  if(maxW<margin) maxW=margin+1;
  if(maxH<margin) maxH=margin+1;
  for(var attempt=0;attempt<30;attempt++){
    var x=margin+Math.random()*(maxW-margin);
    var y=margin+Math.random()*(maxH-margin);
    if(!overlaps(x,y,sz,existing)){
      return {x:x,y:y};
    }
  }
  return {x:margin+Math.random()*(maxW-margin), y:margin+Math.random()*(maxH-margin)};
}
/* --- end anti-overlap --- */

function getEl(id){return document.getElementById(id);}
function showScreen(id){var s=document.querySelectorAll('.screen');for(var i=0;i<s.length;i++)s[i].classList.remove('active');getEl(id).classList.add('active');}

function spawnTarget(){
  var zone=getEl('zone');
  if(!zone) return;
  var roll=Math.random();
  var t;
  var isBonus=false,isBomb=false;

  var bombRate=(speedMode==='oni')? 0.25 : 0.12;
  if(roll<bombRate){t={emoji:BOMB.emoji,pts:BOMB.pts,size:BOMB.size,color:BOMB.color};isBomb=true;}
  else if(roll<bombRate+0.13){t={emoji:'⭐',pts:30,size:50,color:'#FFD740'};isBonus=true;}
  else{var base=TARGETS[Math.floor(Math.random()*TARGETS.length)];t={emoji:base.emoji,pts:base.pts,size:base.size,color:base.color};}

  var sz;
  if(speedMode==='oni'){
    sz=Math.round(t.size*(0.3+Math.random()*0.9));
  }else{
    sz=Math.round(t.size*getSizeMult());
  }
  if(sz<24) sz=24;

  var pos=findPosition(zone,sz);
  var x=pos.x;
  var y=pos.y;

  var el=document.createElement('div');
  el.className='target';
  el.style.left=x+'px';
  el.style.top=y+'px';
  el.style.width=sz+'px';
  el.style.height=sz+'px';
  el.style.background=t.color;
  el.style.fontSize=Math.floor(sz*0.55)+'px';
  el.textContent=t.emoji;

  var adjustedPts=t.pts<0 ? t.pts : Math.round(t.pts*getScoreBonus());
  el.setAttribute('data-pts',adjustedPts);
  el.setAttribute('data-bomb',isBomb?'1':'0');
  el.setAttribute('data-bonus',isBonus?'1':'0');

  el.addEventListener('click',function(e){
    e.stopPropagation();
    var pts=parseInt(this.getAttribute('data-pts'));
    var wasBomb=this.getAttribute('data-bomb')==='1';
    var wasBonus=this.getAttribute('data-bonus')==='1';
    taps++;

    if(pts<0){
      combo=0;fever=false;
      score+=pts;if(score<0)score=0;
      sfxBomb();
      var eff=document.createElement('div');
      eff.className='effect';eff.textContent='💥-'+Math.abs(pts);
      eff.style.left=x+'px';eff.style.top=y+'px';eff.style.color='#FF5252';eff.style.fontSize='20px';
      zone.appendChild(eff);
      setTimeout(function(){if(eff.parentNode)eff.remove();},600);
    }else{
      combo++;if(combo>maxCombo)maxCombo=combo;
      var mult=1+Math.floor(combo/5)*0.5;
      if(combo>=10){fever=true;mult+=1;}
      var gained=Math.floor(pts*mult);
      score+=gained;

      /* Play sound based on type */
      if(wasBonus) sfxBonus();
      else if(combo>0 && combo%5===0) sfxCombo();
      else sfxTap();

      var eff=document.createElement('div');
      eff.className='effect';
      eff.textContent='+'+gained+(combo>=5?' 🔥':'');
      eff.style.left=x+'px';eff.style.top=y+'px';
      eff.style.color=t.color==='#FFD740'?'#FF6F00':t.color;
      eff.style.fontSize='18px';
      zone.appendChild(eff);
      setTimeout(function(){if(eff.parentNode)eff.remove();},600);
    }

    getEl('score').textContent=score;
    if(combo>=5)getEl('comboDisplay').textContent='🔥 '+combo+' COMBO!'+(fever?' FEVER!🔥🔥':'');
    else getEl('comboDisplay').textContent='';

    el.remove();
    spawnTarget();
    if(Math.random()<0.2)spawnTarget();
  });

  zone.appendChild(el);

  var baseTime=2500-Math.min(1500,score*2);
  var autoRemoveTime=Math.round(baseTime*getSpeedMult());
  if(autoRemoveTime<350) autoRemoveTime=350;
  setTimeout(function(){
    if(el.parentNode){el.remove();combo=0;getEl('comboDisplay').textContent='';spawnTarget();}
  },autoRemoveTime);
}

function startOniEffects(){
  var overlay=getEl('oniOverlay');
  if(!overlay) return;
  overlay.classList.add('active');
  var flash=true;
  oniFlashTimer=setInterval(function(){
    overlay.style.opacity=flash?'0.12':'0.04';
    flash=!flash;
  },400);
}

function stopOniEffects(){
  var overlay=getEl('oniOverlay');
  if(overlay){
    overlay.classList.remove('active');
    overlay.style.opacity='0';
  }
  if(oniFlashTimer){clearInterval(oniFlashTimer);oniFlashTimer=null;}
}

function startGame(){
  initAudio();
  GameShell.beginRound();
  score=0;taps=0;combo=0;maxCombo=0;fever=false;
  getEl('score').textContent='0';
  getEl('timeLeft').textContent=duration;
  getEl('comboDisplay').textContent='';
  showScreen('playScreen');
  var zone=getEl('zone');zone.innerHTML='';
  stopOniEffects();

  // Countdown with beeps
  var cd=document.createElement('div');
  cd.style.cssText='font-size:60px;text-align:center;padding-top:40%';
  cd.textContent='3';
  zone.appendChild(cd);
  sfxCountdown();
  var c=3;
  var cdt=setInterval(function(){
    c--;
    if(c>0){cd.textContent=c;sfxCountdown();}
    else{clearInterval(cdt);cd.remove();sfxCountdownGo();actualStart();}
  },700);
}

function actualStart(){
  if(speedMode==='oni') startOniEffects();
  startTime=GameShell.now();
  spawnTarget();spawnTarget();
  timer=setInterval(function(){
    var el=Math.floor((GameShell.now()-startTime)/1000);
    var left=duration-el;if(left<0)left=0;
    getEl('timeLeft').textContent=left;
    if(left<=0){clearInterval(timer);endGame();}
  },200);
}

function endGame(){
  stopOniEffects();
  var zone=getEl('zone');
  while(zone.firstChild)zone.removeChild(zone.firstChild);
  var isNewBest=(score>best);
  if(isNewBest){best=score;try{localStorage.setItem('spt2',best);}catch(e){}}
  var tps=(taps/duration).toFixed(1);

  /* Play end sound */
  if(isNewBest) sfxHighScore();
  else sfxGameOver();

  showScreen('resultScreen');
  if(score>=duration*20){
    getEl('rTitle').textContent='🔥 すご〜い！';getEl('rTitle').style.color='#FF6F00';
    getEl('rEmoji').textContent='🎯🔥';
  }else if(score>=duration*10){
    getEl('rTitle').textContent='✨ いいかんじ！';getEl('rTitle').style.color='#FF9800';
    getEl('rEmoji').textContent='🎯✨';
  }else{
    getEl('rTitle').textContent='💪 がんばろ〜！';getEl('rTitle').style.color='#999';
    getEl('rEmoji').textContent='🎯💪';
  }
  getEl('rScore').textContent=score+'てん！';
  getEl('rTaps').textContent=taps+'タップ ('+tps+'/秒) ｜ 最大コンボ: '+maxCombo;
  getEl('rBest').textContent='🏆 ベスト: '+best+'てん';
}

// Miss tap on zone background
getEl('zone').addEventListener('click',function(){combo=0;fever=false;getEl('comboDisplay').textContent='';sfxMiss();});

// Duration buttons
var mBtns=[getEl('m10'),getEl('m20'),getEl('m30')];
var durs=[10,20,30];
for(var i=0;i<3;i++){(function(idx){
  mBtns[idx].addEventListener('click',function(){
    for(var j=0;j<3;j++)mBtns[j].classList.remove('active');
    mBtns[idx].classList.add('active');duration=durs[idx];
  });
})(i);}

// Speed buttons (including oni)
var spdBtns=document.querySelectorAll('.opt-spd');
for(var i=0;i<spdBtns.length;i++){(function(btn){
  btn.addEventListener('click',function(){
    for(var j=0;j<spdBtns.length;j++)spdBtns[j].classList.remove('active');
    btn.classList.add('active');
    speedMode=btn.getAttribute('data-val');
    var sizeLabel=getEl('sizeLabelRow');
    var sizeRow=getEl('sizeBtnRow');
    if(sizeLabel && sizeRow){
      if(speedMode==='oni'){
        sizeLabel.style.display='none';
        sizeRow.style.display='none';
      }else{
        sizeLabel.style.display='';
        sizeRow.style.display='';
      }
    }
  });
})(spdBtns[i]);}

// Size buttons
var szBtns=document.querySelectorAll('.opt-sz');
for(var i=0;i<szBtns.length;i++){(function(btn){
  btn.addEventListener('click',function(){
    for(var j=0;j<szBtns.length;j++)szBtns[j].classList.remove('active');
    btn.classList.add('active');
    sizeMode=btn.getAttribute('data-val');
  });
})(szBtns[i]);}

getEl('startBtn').addEventListener('click',startGame);
getEl('retryBtn').addEventListener('click',startGame);
getEl('backBtn').addEventListener('click',function(){showScreen('titleScreen');});
})();

(function(){function decorate(){document.querySelectorAll(".num,.pad,.cbtn,.box,.big-btn,.target").forEach(el=>{if(el.hasAttribute("tabindex")||el.tagName==="BUTTON")return;el.tabIndex=0;el.setAttribute("role","button");el.addEventListener("keydown",e=>{if((e.code==="Enter"||e.code==="Space")&&!e.repeat){e.preventDefault();el.click();}});});}decorate();new MutationObserver(decorate).observe(document.getElementById("g"),{subtree:true,childList:true});})();

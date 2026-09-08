
(function(){
var COLORS=[
  {name:'あか',color:'#EF5350'},{name:'あお',color:'#42A5F5'},
  {name:'みどり',color:'#66BB6A'},{name:'きいろ',color:'#FFD740'},
  {name:'むらさき',color:'#AB47BC'},{name:'オレンジ',color:'#FF9800'},
  {name:'ピンク',color:'#FF80AB'},{name:'みずいろ',color:'#26C6DA'},
  {name:'ちゃいろ',color:'#8D6E63'}
];

var totalRounds=20,roundIdx,score,combo,maxCombo,correct,wrong,timer,timeLeft,maxTime,best,busy;
try{best=parseInt(localStorage.getItem('cm1'))||0;}catch(e){best=0;}

function getEl(id){return document.getElementById(id);}
function showScreen(id){var s=document.querySelectorAll('.screen');for(var i=0;i<s.length;i++)s[i].classList.remove('active');getEl(id).classList.add('active');}
function shuffle(a){var b=a.slice();for(var i=b.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=b[i];b[i]=b[j];b[j]=t;}return b;}

function startGame(){
  GameShell.beginRound();
  roundIdx=0;score=0;combo=0;maxCombo=0;correct=0;wrong=0;busy=false;
  getEl('sc').textContent='0';
  showScreen('playScreen');
  nextRound();
}

function nextRound(){
  if(roundIdx>=totalRounds){showResult();return;}
  roundIdx++;busy=false;
  getEl('rnd').textContent=roundIdx;
  getEl('feedback').textContent='';

  // Pick target color
  var targetIdx=Math.floor(Math.random()*COLORS.length);
  var target=COLORS[targetIdx];

  // Show target
  var tc=getEl('targetColor');
  tc.style.background=target.color;

  // Stroop trick: sometimes show a DIFFERENT color name as text
  if(Math.random()<0.4&&roundIdx>3){
    var fakeIdx;
    do{fakeIdx=Math.floor(Math.random()*COLORS.length);}while(fakeIdx===targetIdx);
    tc.textContent=COLORS[fakeIdx].name;
  }else{
    tc.textContent='この色！';
  }

  // Pick 4-6 color buttons (always include correct one)
  var btnCount=roundIdx<=5?4:roundIdx<=12?5:6;
  var options=[target];
  var pool=shuffle(COLORS.filter(function(c){return c!==target;}));
  for(var i=0;i<btnCount-1&&i<pool.length;i++)options.push(pool[i]);
  options=shuffle(options);

  var html='';
  for(var i=0;i<options.length;i++){
    html+='<button class="cbtn" data-i="'+COLORS.indexOf(options[i])+'" style="background:'+options[i].color+'">'+options[i].name+'</button>';
  }
  getEl('colorBtns').innerHTML=html;

  var btns=document.querySelectorAll('.cbtn');
  for(var i=0;i<btns.length;i++){
    btns[i].addEventListener('click',function(){
      if(busy)return;
      onTap(this,targetIdx);
    });
  }

  // Timer
  maxTime=Math.max(2000,5000-roundIdx*100);
  timeLeft=maxTime;
  clearInterval(timer);
  getEl('timerFill').style.width='100%';
  timer=setInterval(function(){
    timeLeft-=50;
    getEl('timerFill').style.width=Math.max(0,timeLeft/maxTime*100)+'%';
    if(timeLeft<=0){
      clearInterval(timer);busy=true;wrong++;combo=0;
      getEl('feedback').textContent='⏰ じかんぎれ〜！';
      getEl('feedback').style.color='#FF5252';
      getEl('streak').textContent='';
      var btns=document.querySelectorAll('.cbtn');
      for(var i=0;i<btns.length;i++){
        if(parseInt(btns[i].getAttribute('data-i'))===targetIdx)btns[i].classList.add('correct');
      }
      setTimeout(nextRound,1200);
    }
  },50);
}

function onTap(el,targetIdx){
  busy=true;
  clearInterval(timer);
  var tapped=parseInt(el.getAttribute('data-i'));

  if(tapped===targetIdx){
    el.classList.add('correct');
    correct++;combo++;if(combo>maxCombo)maxCombo=combo;
    var pts=10+Math.floor(timeLeft/maxTime*40)+combo*3;
    score+=pts;
    getEl('sc').textContent=score;
    getEl('feedback').textContent='⭕ +'+pts;
    getEl('feedback').style.color='#4CAF50';
    if(combo>=3)getEl('streak').textContent='🔥 '+combo+'連続正解！';
  }else{
    el.classList.add('wrong');
    wrong++;combo=0;
    getEl('feedback').textContent='❌ ちがう〜！';
    getEl('feedback').style.color='#FF5252';
    getEl('streak').textContent='';
    var btns=document.querySelectorAll('.cbtn');
    for(var i=0;i<btns.length;i++){
      if(parseInt(btns[i].getAttribute('data-i'))===targetIdx)btns[i].classList.add('correct');
    }
  }
  setTimeout(nextRound,1000);
}

function showResult(){
  clearInterval(timer);
  if(score>best){best=score;try{localStorage.setItem('cm1',best);}catch(e){}}
  showScreen('resultScreen');
  var pct=correct/totalRounds;
  if(pct>=0.9){getEl('rTitle').textContent='🎉 すご〜い！';getEl('rTitle').style.color='#FFD740';getEl('rEmoji').textContent='🎨✨';}
  else if(pct>=0.7){getEl('rTitle').textContent='✨ いいかんじ！';getEl('rTitle').style.color='#7B1FA2';getEl('rEmoji').textContent='🎨💕';}
  else{getEl('rTitle').textContent='💪 がんばろ〜！';getEl('rTitle').style.color='#999';getEl('rEmoji').textContent='🎨💪';}
  getEl('rScore').textContent=score+'てん！';
  getEl('rStats').textContent='正解: '+correct+' / まちがい: '+wrong+' / 最大連続: '+maxCombo;
  getEl('rBest').textContent='🏆 ベスト: '+best+'てん';
}

getEl('startBtn').addEventListener('click',startGame);
getEl('retryBtn').addEventListener('click',startGame);
})();

(function(){function decorate(){document.querySelectorAll(".num,.pad,.cbtn,.box,.big-btn,.target").forEach(el=>{if(el.hasAttribute("tabindex")||el.tagName==="BUTTON")return;el.tabIndex=0;el.setAttribute("role","button");el.addEventListener("keydown",e=>{if((e.code==="Enter"||e.code==="Space")&&!e.repeat){e.preventDefault();el.click();}});});}decorate();new MutationObserver(decorate).observe(document.getElementById("g"),{subtree:true,childList:true});})();

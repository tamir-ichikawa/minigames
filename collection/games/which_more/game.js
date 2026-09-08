
(function(){
var EMOJIS=['🤔','⭐','🌸','🍎','💖','🎵','🌈','🍰','🐱','🦊','🍊','🐶'];
var totalRounds=15,roundIdx,score,combo,maxCombo,correct,wrong,timer,timeLeft,maxTime,busy;

function getEl(id){return document.getElementById(id);}
function showScreen(id){var s=document.querySelectorAll('.screen');for(var i=0;i<s.length;i++)s[i].classList.remove('active');getEl(id).classList.add('active');}

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

  var emoji=EMOJIS[Math.floor(Math.random()*EMOJIS.length)];
  var difficulty=Math.min(Math.floor(roundIdx/3),4);
  var base=3+difficulty*2;
  var countL=base+Math.floor(Math.random()*(3+difficulty));
  var countR=base+Math.floor(Math.random()*(3+difficulty));
  // Sometimes make them equal
  if(Math.random()<0.2)countR=countL;

  var answer=countL>countR?'left':countR>countL?'right':'both';

  // Render boxes
  var htmlL='',htmlR='';
  for(var i=0;i<countL;i++)htmlL+='<span class="emoji">'+emoji+'</span>';
  for(var i=0;i<countR;i++)htmlR+='<span class="emoji">'+emoji+'</span>';
  getEl('boxL').innerHTML=htmlL;
  getEl('boxR').innerHTML=htmlR;
  getEl('boxL').className='box';
  getEl('boxR').className='box';

  getEl('boxL').onclick=function(){if(busy)return;checkAnswer('left',answer);};
  getEl('boxR').onclick=function(){if(busy)return;checkAnswer('right',answer);};

  // Timer
  maxTime=Math.max(2000,5000-roundIdx*150);
  timeLeft=maxTime;
  clearInterval(timer);
  getEl('timerFill').style.width='100%';
  timer=setInterval(function(){
    timeLeft-=50;
    getEl('timerFill').style.width=Math.max(0,timeLeft/maxTime*100)+'%';
    if(timeLeft<=0){
      clearInterval(timer);busy=true;wrong++;combo=0;
      getEl('feedback').textContent='⏰ じかんぎれ〜！';getEl('feedback').style.color='#FF5252';
      getEl('streak').textContent='';
      if(answer==='left')getEl('boxL').classList.add('correct');
      else if(answer==='right')getEl('boxR').classList.add('correct');
      else{getEl('boxL').classList.add('correct');getEl('boxR').classList.add('correct');}
      setTimeout(nextRound,1200);
    }
  },50);
}

function checkAnswer(choice,answer){
  busy=true;
  clearInterval(timer);

  var isCorrect=(choice===answer)||(answer==='both');
  // For "both" answer, either box is correct
  if(answer==='both'){isCorrect=true;}

  if(isCorrect){
    correct++;combo++;if(combo>maxCombo)maxCombo=combo;
    var pts=10+Math.floor(timeLeft/1000)*5+combo*2;
    score+=pts;
    getEl('sc').textContent=score;
    getEl('feedback').textContent='⭕ せいかい！+'+pts;
    getEl('feedback').style.color='#4CAF50';
    if(choice==='left')getEl('boxL').classList.add('correct');
    else getEl('boxR').classList.add('correct');
    if(combo>=3)getEl('streak').textContent='🔥 '+combo+'連続正解！';
  }else{
    wrong++;combo=0;
    getEl('feedback').textContent='❌ ざんねん〜！';
    getEl('feedback').style.color='#FF5252';
    getEl('streak').textContent='';
    if(choice==='left')getEl('boxL').classList.add('wrong');
    else getEl('boxR').classList.add('wrong');
    if(answer==='left')getEl('boxL').classList.add('correct');
    else if(answer==='right')getEl('boxR').classList.add('correct');
  }
  setTimeout(nextRound,1200);
}

function showResult(){
  clearInterval(timer);
  showScreen('resultScreen');
  var pct=correct/totalRounds;
  if(pct>=0.9){getEl('rTitle').textContent='🎉 すご〜い！';getEl('rTitle').style.color='#FFD740';getEl('rEmoji').textContent='🤔✨';}
  else if(pct>=0.6){getEl('rTitle').textContent='✨ いいかんじ！';getEl('rTitle').style.color='#FF6F00';getEl('rEmoji').textContent='🤔💕';}
  else{getEl('rTitle').textContent='💪 がんばろ〜！';getEl('rTitle').style.color='#999';getEl('rEmoji').textContent='🤔💪';}
  getEl('rScore').textContent=score+'てん！';
  getEl('rStats').textContent='正解: '+correct+' / まちがい: '+wrong+' / 最大連続: '+maxCombo;
}

getEl('startBtn').addEventListener('click',startGame);
getEl('retryBtn').addEventListener('click',startGame);
})();

(function(){function decorate(){document.querySelectorAll(".num,.pad,.cbtn,.box,.big-btn,.target").forEach(el=>{if(el.hasAttribute("tabindex")||el.tagName==="BUTTON")return;el.tabIndex=0;el.setAttribute("role","button");el.addEventListener("keydown",e=>{if((e.code==="Enter"||e.code==="Space")&&!e.repeat){e.preventDefault();el.click();}});});}decorate();new MutationObserver(decorate).observe(document.getElementById("g"),{subtree:true,childList:true});})();

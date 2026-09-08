
(function(){
var duration=5,count=0,timer,startTime,best;
try{best=parseInt(localStorage.getItem('ren1'))||0;}catch(e){best=0;}

function getEl(id){return document.getElementById(id);}
function showScreen(id){var s=document.querySelectorAll('.screen');for(var i=0;i<s.length;i++)s[i].classList.remove('active');getEl(id).classList.add('active');}

function startGame(){
  GameShell.beginRound();
  count=0;
  getEl('count').textContent='0';
  getEl('gauge').textContent='0 タップ/秒';
  getEl('barFill').style.width='100%';
  getEl('timer').textContent=duration+'.0';
  showScreen('playScreen');

  // Countdown 3-2-1
  var cd=3;
  getEl('bigBtn').textContent=cd;
  getEl('bigBtn').style.pointerEvents='none';
  var cdTimer=setInterval(function(){
    cd--;
    if(cd>0){getEl('bigBtn').textContent=cd;}
    else{
      clearInterval(cdTimer);
      getEl('bigBtn').textContent='💥';
      getEl('bigBtn').style.pointerEvents='auto';
      actualStart();
    }
  },700);
}

function actualStart(){
  startTime=GameShell.now();
  timer=setInterval(function(){
    var elapsed=(GameShell.now()-startTime)/1000;
    var left=Math.max(0,duration-elapsed);
    getEl('timer').textContent=left.toFixed(1);
    getEl('barFill').style.width=(left/duration*100)+'%';
    if(elapsed>0)getEl('gauge').textContent=(count/elapsed).toFixed(1)+' タップ/秒';
    if(left<=0){
      clearInterval(timer);
      endGame();
    }
  },50);
}

function onTap(){
  count++;
  getEl('count').textContent=count;
  // Pop effect
  var zone=getEl('tapZone');
  var eff=document.createElement('div');
  eff.className='effect';
  eff.textContent='💥';
  eff.style.left=(Math.random()*200+60)+'px';
  eff.style.top=(Math.random()*100+20)+'px';
  zone.appendChild(eff);
  setTimeout(function(){if(eff.parentNode)eff.remove();},400);
}

function endGame(){
  getEl('bigBtn').style.pointerEvents='none';
  if(count>best){best=count;try{localStorage.setItem('ren1',best);}catch(e){}}
  var tps=(count/duration).toFixed(1);

  showScreen('resultScreen');
  if(count>=duration*8){
    getEl('rTitle').textContent='🔥 すご〜い！';getEl('rTitle').style.color='#FF6F00';
    getEl('rEmoji').textContent='💥🔥';
  }else if(count>=duration*5){
    getEl('rTitle').textContent='✨ いいかんじ！';getEl('rTitle').style.color='#FF9800';
    getEl('rEmoji').textContent='💥✨';
  }else{
    getEl('rTitle').textContent='💪 がんばろ〜！';getEl('rTitle').style.color='#999';
    getEl('rEmoji').textContent='💥';
  }
  getEl('rCount').textContent=count+'回！';
  getEl('rTps').textContent=tps+' タップ/秒';
  getEl('rBest').textContent='🏆 ベスト: '+best+'回';
}

getEl('bigBtn').addEventListener('click',onTap);
getEl('bigBtn').addEventListener('touchstart',function(e){e.preventDefault();onTap();},{passive:false});

var mBtns=[getEl('m5'),getEl('m10'),getEl('m15')];
var durs=[5,10,15];
for(var i=0;i<3;i++){(function(idx){
  mBtns[idx].addEventListener('click',function(){
    for(var j=0;j<3;j++)mBtns[j].classList.remove('active');
    mBtns[idx].classList.add('active');duration=durs[idx];
  });
})(i);}

getEl('startBtn').addEventListener('click',startGame);
getEl('retryBtn').addEventListener('click',startGame);
getEl('backBtn').addEventListener('click',function(){showScreen('titleScreen');});
})();

(function(){function decorate(){document.querySelectorAll(".num,.pad,.cbtn,.box,.big-btn,.target").forEach(el=>{if(el.hasAttribute("tabindex")||el.tagName==="BUTTON")return;el.tabIndex=0;el.setAttribute("role","button");el.addEventListener("keydown",e=>{if((e.code==="Enter"||e.code==="Space")&&!e.repeat){e.preventDefault();el.click();}});});}decorate();new MutationObserver(decorate).observe(document.getElementById("g"),{subtree:true,childList:true});})();

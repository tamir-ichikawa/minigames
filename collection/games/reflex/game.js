
(function(){
var ROUNDS=5;
var roundIdx,results,greenTime,waitTimer,state,allTimeBest;
// state: 'wait','ready','go','tapped','early'
try{allTimeBest=parseInt(localStorage.getItem('rfx1'))||9999;}catch(e){allTimeBest=9999;}

function getEl(id){return document.getElementById(id);}
function showScreen(id){var s=document.querySelectorAll('.screen');for(var i=0;i<s.length;i++)s[i].classList.remove('active');getEl(id).classList.add('active');}

function startGame(){
  GameShell.beginRound();
  roundIdx=0;results=[];
  showScreen('playScreen');
  startRound();
}

function startRound(){
  state='wait';
  var play=getEl('playScreen');
  play.className='screen active play-bg';
  getEl('roundInfo').textContent=(roundIdx+1)+' / '+ROUNDS;
  getEl('msg').textContent='まってね…';
  getEl('msgSub').textContent='緑になったらタップ！';
  getEl('timeDisplay').textContent='';
  renderHistory('history');

  // Random wait 1.5-4 seconds
  var waitMs=1500+Math.random()*2500;
  waitTimer=setTimeout(function(){
    state='go';
    greenTime=GameShell.now();
    play.className='screen active play-bg go';
    getEl('msg').textContent='タップ！！！';
    getEl('msgSub').textContent='今すぐ！！';
  },waitMs);
}

function onTap(){
  if(state==='wait'){
    // Too early!
    clearTimeout(waitTimer);
    state='early';
    var play=getEl('playScreen');
    play.className='screen active play-bg early';
    getEl('msg').textContent='はやすぎ〜！💦';
    getEl('msgSub').textContent='まだ緑になってないよ！';
    getEl('timeDisplay').textContent='❌';
    results.push({ms:-1,early:true});
    setTimeout(function(){
      roundIdx++;
      if(roundIdx>=ROUNDS){showResult();}
      else{startRound();}
    },1500);
  }else if(state==='go'){
    state='tapped';
    var ms=Math.max(0,Math.round(GameShell.now()-greenTime));
    results.push({ms:ms,early:false});
    getEl('msg').textContent='⚡ '+ms+' ms';
    if(ms<200)getEl('msgSub').textContent='はや〜い！⚡🔥';
    else if(ms<350)getEl('msgSub').textContent='いいかんじ！✨';
    else getEl('msgSub').textContent='もうちょっと！💪';
    getEl('timeDisplay').textContent=ms+'ms';
    renderHistory('history');
    setTimeout(function(){
      roundIdx++;
      if(roundIdx>=ROUNDS){showResult();}
      else{startRound();}
    },1500);
  }
  // If already tapped or early, ignore
}

getEl('playScreen').addEventListener('click',function(e){e.preventDefault();onTap();});
getEl('playScreen').addEventListener('touchstart',function(e){e.preventDefault();onTap();},{passive:false});

function renderHistory(targetId){
  var html='';
  for(var i=0;i<results.length;i++){
    var r=results[i];
    if(r.early){html+='<span class="history-item early">❌</span>';}
    else if(r.ms<250){html+='<span class="history-item good">'+r.ms+'ms</span>';}
    else{html+='<span class="history-item slow">'+r.ms+'ms</span>';}
  }
  getEl(targetId).innerHTML=html;
}

function showResult(){
  showScreen('resultScreen');
  renderHistory('historyResult');

  var valid=[];
  for(var i=0;i<results.length;i++){if(!results[i].early)valid.push(results[i].ms);}

  if(valid.length===0){
    getEl('rTitle').textContent='😢 ぜんぶフライング！';getEl('rTitle').style.color='#FF5252';
    getEl('rEmoji').textContent='⚡💦';
    getEl('rAvg').textContent='結果なし';
    getEl('rBest').textContent='';
    getEl('rWorst').textContent='';
  }else{
    var sum=0,mn=9999,mx=0;
    for(var i=0;i<valid.length;i++){sum+=valid[i];if(valid[i]<mn)mn=valid[i];if(valid[i]>mx)mx=valid[i];}
    var avg=Math.round(sum/valid.length);

    if(mn<allTimeBest){allTimeBest=mn;try{localStorage.setItem('rfx1',mn);}catch(e){}}

    getEl('rAvg').textContent='平均: '+avg+'ms';
    getEl('rBest').textContent='🏆 最速: '+mn+'ms';
    getEl('rWorst').textContent='最遅: '+mx+'ms';

    if(avg<200){
      getEl('rTitle').textContent='🔥 超人級！';getEl('rTitle').style.color='#FFD740';
      getEl('rEmoji').textContent='⚡⚡';
    }else if(avg<300){
      getEl('rTitle').textContent='✨ はやい！';getEl('rTitle').style.color='#4CAF50';
      getEl('rEmoji').textContent='⚡✨';
    }else if(avg<400){
      getEl('rTitle').textContent='😊 ふつう！';getEl('rTitle').style.color='#FF9800';
      getEl('rEmoji').textContent='⚡';
    }else{
      getEl('rTitle').textContent='💪 がんばろ〜！';getEl('rTitle').style.color='#999';
      getEl('rEmoji').textContent='⚡💪';
    }
  }
  getEl('rRecord').textContent='歴代最速: '+allTimeBest+'ms';
}

getEl('startBtn').addEventListener('click',startGame);
getEl('retryBtn').addEventListener('click',startGame);
})();

(function(){function decorate(){document.querySelectorAll(".num,.pad,.cbtn,.box,.big-btn,.target").forEach(el=>{if(el.hasAttribute("tabindex")||el.tagName==="BUTTON")return;el.tabIndex=0;el.setAttribute("role","button");el.addEventListener("keydown",e=>{if((e.code==="Enter"||e.code==="Space")&&!e.repeat){e.preventDefault();el.click();}});});}decorate();new MutationObserver(decorate).observe(document.getElementById("g"),{subtree:true,childList:true});})();


(function(){
var SYMBOLS=['🎰','💎','⭐','🌸','🍎','🎵'];
var PAYOUTS={'🎰🎰🎰':100,'💎💎💎':50,'⭐⭐⭐':30,'🌸🌸🌸':20,'🍎🍎🍎':15,'🎵🎵🎵':15};
var coins,spinning,reelValues,reelTimers,stopped,spins,bigWins;

function getEl(id){return document.getElementById(id);}
function showScreen(id){var s=document.querySelectorAll('.screen');for(var i=0;i<s.length;i++)s[i].classList.remove('active');getEl(id).classList.add('active');}

function startGame(){
  GameShell.beginRound();
  coins=100;spins=0;bigWins=0;spinning=false;stopped=[false,false,false];
  reelValues=['🎰','⭐','🌸'];
  getEl('coins').textContent=coins;
  getEl('msg').textContent='スピンしてね〜！🎰';
  getEl('spinBtn').disabled=false;
  for(var i=0;i<3;i++){getEl('s'+i).disabled=true;getEl('r'+i).textContent=reelValues[i];getEl('r'+i).classList.remove('spinning','win-flash');}
  showScreen('playScreen');
}

function spin(){
  if(spinning)return;
  if(coins<10){
    getEl('msg').textContent='コインがたりないよ〜💦';
    setTimeout(function(){showResult();},1500);
    return;
  }
  coins-=10;spins++;
  getEl('coins').textContent=coins;
  spinning=true;stopped=[false,false,false];
  getEl('spinBtn').disabled=true;
  getEl('msg').textContent='回ってるよ〜！🎰';
  getEl('machine').classList.remove('win-flash');

  for(var i=0;i<3;i++){
    getEl('r'+i).classList.add('spinning');
    getEl('r'+i).classList.remove('win-flash');
    getEl('s'+i).disabled=false;
  }

  // Randomly change reel display
  for(var i=0;i<3;i++){
    (function(idx){
      reelTimers[idx]=setInterval(function(){
        if(stopped[idx])return;
        getEl('r'+idx).textContent=SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)];
      },80);
    })(i);
  }

  // Auto-stop after a while
  setTimeout(function(){if(!stopped[0])stopReel(0);},2000+Math.random()*1000);
  setTimeout(function(){if(!stopped[1])stopReel(1);},3000+Math.random()*1000);
  setTimeout(function(){if(!stopped[2])stopReel(2);},4000+Math.random()*500);
}
reelTimers=[null,null,null];

function stopReel(idx){
  if(stopped[idx])return;
  stopped[idx]=true;
  clearInterval(reelTimers[idx]);
  // Pick final value (slightly weighted toward variety)
  reelValues[idx]=SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)];
  getEl('r'+idx).textContent=reelValues[idx];
  getEl('r'+idx).classList.remove('spinning');
  getEl('s'+idx).disabled=true;

  // Check if all stopped
  if(stopped[0]&&stopped[1]&&stopped[2]){
    setTimeout(checkResult,300);
  }
}

function checkResult(){
  spinning=false;
  var key=reelValues.join('');
  var win=PAYOUTS[key]||0;

  // Check 2-match
  if(!win){
    if(reelValues[0]===reelValues[1]||reelValues[1]===reelValues[2]||reelValues[0]===reelValues[2])win=5;
  }

  if(win>0){
    coins+=win;
    getEl('coins').textContent=coins;
    getEl('machine').classList.add('win-flash');
    if(win>=20){
      bigWins++;
      getEl('msg').textContent='🎉 大当たり！+'+win+'コイン！🎉';
    }else{
      getEl('msg').textContent='✨ あたり！+'+win+'コイン！';
    }
  }else{
    getEl('msg').textContent='ざんねん〜💦 つぎこそ！';
  }
  getEl('spinBtn').disabled=false;

  if(coins<=0){
    getEl('msg').textContent='コインがなくなっちゃった〜💦';
    setTimeout(showResult,1500);
  }
}

function showResult(){
  showScreen('resultScreen');
  if(coins>100){
    getEl('rTitle').textContent='🎉 プラスで終了！';getEl('rTitle').style.color='#FFD740';
    getEl('rEmoji').textContent='🎰✨';
    getEl('rMsg').textContent='すごいね〜！増やしたよ！';
  }else if(coins>0){
    getEl('rTitle').textContent='😊 おしまい！';getEl('rTitle').style.color='#FF9800';
    getEl('rEmoji').textContent='🎰';
    getEl('rMsg').textContent='まぁまぁだね！';
  }else{
    getEl('rTitle').textContent='😢 コイン切れ！';getEl('rTitle').style.color='#FF5252';
    getEl('rEmoji').textContent='🎰💦';
    getEl('rMsg').textContent='ぜんぶ使っちゃった〜！';
  }
  getEl('rCoins').textContent='最終コイン: '+coins+' / '+spins+'回スピン / 大当たり'+bigWins+'回';
}

getEl('startBtn').addEventListener('click',startGame);
getEl('spinBtn').addEventListener('click',spin);
getEl('s0').addEventListener('click',function(){stopReel(0);});
getEl('s1').addEventListener('click',function(){stopReel(1);});
getEl('s2').addEventListener('click',function(){stopReel(2);});
getEl('retryBtn').addEventListener('click',startGame);
})();

(function(){function decorate(){document.querySelectorAll(".num,.pad,.cbtn,.box,.big-btn,.target").forEach(el=>{if(el.hasAttribute("tabindex")||el.tagName==="BUTTON")return;el.tabIndex=0;el.setAttribute("role","button");el.addEventListener("keydown",e=>{if((e.code==="Enter"||e.code==="Space")&&!e.repeat){e.preventDefault();el.click();}});});}decorate();new MutationObserver(decorate).observe(document.getElementById("g"),{subtree:true,childList:true});})();


(function(){
var totalNums=9,nextTarget,startTime,timerInt,best;
var bestKey='no9';
try{best=parseFloat(localStorage.getItem(bestKey))||999;}catch(e){best=999;}

function getEl(id){return document.getElementById(id);}
function showScreen(id){var s=document.querySelectorAll('.screen');for(var i=0;i<s.length;i++)s[i].classList.remove('active');getEl(id).classList.add('active');}

function startGame(){
  GameShell.beginRound();
  nextTarget=1;
  getEl('nextNum').textContent='1';
  getEl('timer').textContent='0.0';
  getEl('speech').textContent='1から順番にタップ！🔢';
  showScreen('playScreen');

  // Place numbers randomly
  var grid=getEl('grid');
  var gw=grid.offsetWidth||300;
  var gh=grid.offsetHeight||360;
  var cellW=52,margin=8;

  // Generate positions avoiding overlap
  var positions=[];
  var cols=Math.floor(gw/(cellW+margin));
  var rows=Math.max(Math.ceil(totalNums/Math.max(1,cols)),Math.floor(gh/(cellW+margin)));
  grid.style.minHeight=(rows*(cellW+margin)+margin)+'px';
  for(var r=0;r<rows;r++){
    for(var c=0;c<cols;c++){
      positions.push({x:c*(cellW+margin)+margin,y:r*(cellW+margin)+margin});
    }
  }
  // Shuffle
  for(var i=positions.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=positions[i];positions[i]=positions[j];positions[j]=t;}

  var html='';
  for(var i=0;i<totalNums;i++){
    var p=positions[i];
    var cls='num';
    if(i===0)cls+=' next';
    html+='<div class="'+cls+'" data-n="'+(i+1)+'" style="left:'+p.x+'px;top:'+p.y+'px">'+(i+1)+'</div>';
  }
  grid.innerHTML=html;

  var nums=document.querySelectorAll('.num');
  for(var i=0;i<nums.length;i++){
    nums[i].addEventListener('click',function(){onNumTap(this);});
  }

  startTime=GameShell.now();
  clearInterval(timerInt);
  timerInt=setInterval(function(){
    var elapsed=(GameShell.now()-startTime)/1000;
    getEl('timer').textContent=elapsed.toFixed(1);
  },100);
}

function onNumTap(el){
  var n=parseInt(el.getAttribute('data-n'));
  if(n===nextTarget){
    el.classList.add('done');
    el.classList.remove('next');
    nextTarget++;
    getEl('nextNum').textContent=nextTarget;

    if(nextTarget>totalNums){
      // Complete!
      clearInterval(timerInt);
      var time=(GameShell.now()-startTime)/1000;
      if(time<best){best=time;try{localStorage.setItem(bestKey,best);}catch(e){}}
      showResult(time);
    }else{
      // Highlight next
      var nums=document.querySelectorAll('.num');
      for(var i=0;i<nums.length;i++){
        if(parseInt(nums[i].getAttribute('data-n'))===nextTarget)nums[i].classList.add('next');
      }
      if(nextTarget>totalNums*0.7){
        getEl('speech').textContent='あとちょっと〜！💪🔢';
      }
    }
  }else{
    el.classList.add('wrong');
    setTimeout(function(){el.classList.remove('wrong');},300);
    getEl('speech').textContent='ちがうよ〜！'+nextTarget+'をさがして〜💦';
  }
}

function showResult(time){
  showScreen('resultScreen');
  getEl('rTime').textContent=time.toFixed(1)+'秒！';
  getEl('rBest').textContent='🏆 ベスト: '+best.toFixed(1)+'秒';

  if(time<totalNums*0.8){
    getEl('rTitle').textContent='🔥 はや〜い！';getEl('rTitle').style.color='#FFD740';
    getEl('rEmoji').textContent='🔢⚡';
  }else if(time<totalNums*1.5){
    getEl('rTitle').textContent='✨ いいかんじ！';getEl('rTitle').style.color='#1565C0';
    getEl('rEmoji').textContent='🔢✨';
  }else{
    getEl('rTitle').textContent='💪 がんばろ〜！';getEl('rTitle').style.color='#999';
    getEl('rEmoji').textContent='🔢💪';
  }
}

// Difficulty
var dBtns=[getEl('d9'),getEl('d16'),getEl('d25')];
var dVals=[9,16,25];
var dKeys=['no9','no16','no25'];
for(var i=0;i<3;i++){(function(idx){
  dBtns[idx].addEventListener('click',function(){
    for(var j=0;j<3;j++)dBtns[j].classList.remove('active');
    dBtns[idx].classList.add('active');
    totalNums=dVals[idx];
    bestKey=dKeys[idx];
    try{best=parseFloat(localStorage.getItem(bestKey))||999;}catch(e){best=999;}
  });
})(i);}

getEl('startBtn').addEventListener('click',startGame);
getEl('retryBtn').addEventListener('click',startGame);
getEl('backBtn').addEventListener('click',function(){showScreen('titleScreen');});
})();

(function(){function decorate(){document.querySelectorAll(".num,.pad,.cbtn,.box,.big-btn,.target").forEach(el=>{if(el.hasAttribute("tabindex")||el.tagName==="BUTTON")return;el.tabIndex=0;el.setAttribute("role","button");el.addEventListener("keydown",e=>{if((e.code==="Enter"||e.code==="Space")&&!e.repeat){e.preventDefault();el.click();}});});}decorate();new MutationObserver(decorate).observe(document.getElementById("g"),{subtree:true,childList:true});})();

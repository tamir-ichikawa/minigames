
(function(){
var AC;
try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(e){AC=null;}
function tone(freq,dur){
  if(!AC)return;try{if(AC.state==='suspended')AC.resume();
  var o=AC.createOscillator(),g=AC.createGain();
  o.connect(g);g.connect(GameShell.audioOutput(AC));o.frequency.value=freq;o.type='sine';
  g.gain.setValueAtTime(0.1,AC.currentTime);g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+dur);
  o.start();o.stop(AC.currentTime+dur);}catch(e){}
}

var PADS=[
  {bg:'#EF5350',flash:'#FF8A80',emoji:'🔴',freq:262},
  {bg:'#42A5F5',flash:'#82B1FF',emoji:'🔵',freq:330},
  {bg:'#66BB6A',flash:'#A5D6A7',emoji:'🟢',freq:392},
  {bg:'#FFD740',flash:'#FFE57F',emoji:'🟡',freq:523},
  {bg:'#AB47BC',flash:'#CE93D8',emoji:'🟣',freq:659},
  {bg:'#FF7043',flash:'#FFAB91',emoji:'🟠',freq:784},
  {bg:'#26C6DA',flash:'#80DEEA',emoji:'🩵',freq:880},
  {bg:'#EC407A',flash:'#F48FB1',emoji:'🩷',freq:988},
  {bg:'#8D6E63',flash:'#BCAAA4',emoji:'🟤',freq:1047}
];

var gridSize,padCount,sequence,playerIdx,level,score,showing,best,lives,maxLives;
maxLives=3;
try{best=parseInt(localStorage.getItem('pat2'))||0;}catch(e){best=0;}

function getEl(id){return document.getElementById(id);}
function showScreen(id){var s=document.querySelectorAll('.screen');for(var i=0;i<s.length;i++)s[i].classList.remove('active');getEl(id).classList.add('active');}

function startGame(){
  GameShell.beginRound();
  level=1;score=0;sequence=[];lives=maxLives;
  getEl('sc').textContent='0';
  showScreen('playScreen');
  updateLives();
  setupGrid();
  nextLevel();
}

function updateLives(){
  var h='';for(var i=0;i<lives;i++)h+='💖';for(var i=lives;i<maxLives;i++)h+='🖤';
  getEl('lives').innerHTML=h;
}

function setupGrid(){
  gridSize=level<=3?2:level<=8?3:3;
  padCount=gridSize*gridSize;
  if(padCount>PADS.length)padCount=PADS.length;
  getEl('grid').style.gridTemplateColumns='repeat('+gridSize+',1fr)';
  getEl('grid').style.maxWidth=(gridSize<=2?(gridSize*140):(gridSize*115))+'px';
  renderPads(false);
}

function renderPads(clickable){
  var html='';
  for(var i=0;i<padCount;i++){
    var c=PADS[i];
    var cls='pad'+(clickable?'':' disabled');
    html+='<div class="'+cls+'" data-i="'+i+'" style="background:'+c.bg+';box-shadow:0 4px 12px rgba(0,0,0,0.2)"><div class="pad-shine"></div>'+c.emoji+'</div>';
  }
  getEl('grid').innerHTML=html;
  if(clickable){
    var pads=document.querySelectorAll('.pad');
    for(var j=0;j<pads.length;j++){
      pads[j].addEventListener('click',function(){
        if(AC&&AC.state==='suspended')AC.resume();
        onPadClick(parseInt(this.getAttribute('data-i')));
      });
    }
  }
}

function nextLevel(){
  getEl('lv').textContent=level;
  var newSize=level<=3?2:3;
  if(newSize!==gridSize){gridSize=newSize;padCount=gridSize*gridSize;if(padCount>PADS.length)padCount=PADS.length;getEl('grid').style.gridTemplateColumns='repeat('+gridSize+',1fr)';getEl('grid').style.maxWidth=(gridSize*120)+'px';}

  sequence.push(Math.floor(Math.random()*padCount));
  showing=true;
  getEl('status').textContent='みてね〜！👀';
  getEl('speech').textContent='光る順番をおぼえてね〜！🧠';
  renderPads(false);

  var i=0;
  var showSpeed=Math.max(300,600-level*20);
  var interval=setInterval(function(){
    if(i>=sequence.length){
      clearInterval(interval);
      showing=false;
      playerIdx=0;
      getEl('status').textContent='タップしてね〜！';
      getEl('speech').textContent='おなじ順番でタップ！🧠💪';
      renderPads(true);
      return;
    }
    flashPad(sequence[i],showSpeed-100);
    tone(PADS[sequence[i]].freq,0.2);
    i++;
  },showSpeed);
}

function flashPad(idx,dur){
  var pads=document.querySelectorAll('.pad');
  if(idx>=pads.length)return;
  var pad=pads[idx];
  pad.classList.add('flash');
  pad.style.background='#fff';
  pad.style.transform='scale(1.15)';
  pad.style.boxShadow='0 0 35px '+PADS[idx].flash+', 0 0 60px '+PADS[idx].flash+', 0 4px 12px rgba(0,0,0,0.2)';
  pad.style.borderColor='#fff';
  setTimeout(function(){
    pad.classList.remove('flash');
    pad.style.background=PADS[idx].bg;
    pad.style.transform='';
    pad.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)';
    pad.style.borderColor='rgba(0,0,0,0.1)';
  },dur||400);
}

function onPadClick(idx){
  if(showing)return;
  flashPad(idx,250);
  tone(PADS[idx].freq,0.15);

  if(idx===sequence[playerIdx]){
    playerIdx++;
    if(playerIdx>=sequence.length){
      showing=true;
      score+=level*10+(level>5?level*5:0);
      getEl('sc').textContent=score;
      level++;
      var msgs=['すご〜い！✨','かんぺき〜！🧠💕','おぼえてるね〜！🧠','つぎいくよ〜！💪'];
      getEl('speech').textContent=msgs[Math.floor(Math.random()*msgs.length)];
      getEl('status').textContent='⭕ せいかい！';
      setTimeout(function(){setupGrid();nextLevel();},1000);
    }
  }else{
    // Lock input throughout the failure animation and sequence replay.
    showing=true;
    tone(150,0.3);
    lives--;
    updateLives();
    var pads=document.querySelectorAll('.pad');
    if(idx<pads.length){pads[idx].style.background='#FF5252';}

    if(lives<=0){
      getEl('status').textContent='❌ ゲームオーバー';
      getEl('speech').textContent='ざんねん〜💦 レベル'+(level-1)+'までいったよ！';
      if(score>best){best=score;try{localStorage.setItem('pat2',best);}catch(e){}}
      setTimeout(showResult,1500);
    }else{
      getEl('status').textContent='❌ まちがえちゃった！';
      getEl('speech').textContent='もう一回おぼえてね〜！残り'+lives+'回💦';
      // Replay the sequence
      setTimeout(function(){
        renderPads(false);
        getEl('status').textContent='もう一回みてね〜！👀';
        var i=0;
        var showSpeed=Math.max(300,600-level*20);
        var interval=setInterval(function(){
          if(i>=sequence.length){
            clearInterval(interval);
            playerIdx=0;showing=false;
            getEl('status').textContent='タップしてね〜！';
            renderPads(true);
            return;
          }
          flashPad(sequence[i],showSpeed-100);
          tone(PADS[sequence[i]].freq,0.2);
          i++;
        },showSpeed);
      },1200);
    }
  }
}

function showResult(){
  showScreen('resultScreen');
  getEl('rLevel').textContent='レベル'+(level-1)+'まで到達！';
  getEl('rBest').textContent='🏆 ベスト: '+best+'てん';

  if(level>=12){
    getEl('rTitle').textContent='🎉 天才〜！';getEl('rTitle').style.color='#FFD740';
    getEl('rEmoji').textContent='🧠🧠✨';
  }else if(level>=7){
    getEl('rTitle').textContent='✨ すご〜い！';getEl('rTitle').style.color='#5C6BC0';
    getEl('rEmoji').textContent='🧠✨';
  }else if(level>=4){
    getEl('rTitle').textContent='😊 いいかんじ！';getEl('rTitle').style.color='#FF9800';
    getEl('rEmoji').textContent='🧠💕';
  }else{
    getEl('rTitle').textContent='💪 がんばろ〜！';getEl('rTitle').style.color='#999';
    getEl('rEmoji').textContent='🧠💪';
  }
  getEl('rScore').textContent='スコア: '+score+'てん';
}

getEl('startBtn').addEventListener('click',function(){if(AC&&AC.state==='suspended')AC.resume();startGame();});
getEl('retryBtn').addEventListener('click',startGame);
})();

(function(){function decorate(){document.querySelectorAll(".num,.pad,.cbtn,.box,.big-btn,.target").forEach(el=>{if(el.hasAttribute("tabindex")||el.tagName==="BUTTON")return;el.tabIndex=0;el.setAttribute("role","button");el.addEventListener("keydown",e=>{if((e.code==="Enter"||e.code==="Space")&&!e.repeat){e.preventDefault();el.click();}});});}decorate();new MutationObserver(decorate).observe(document.getElementById("g"),{subtree:true,childList:true});})();


(function(){
var POOL=Array.from({length:20},(_,i)=>ArcadeRules.symbol(i));

var busy=false;
var level,score,timer,timeLeft,maxTime,diffCount,rowLen,found;

function getEl(id){return document.getElementById(id);}
function showScreen(id){
  var screens=document.querySelectorAll('.screen');
  for(var i=0;i<screens.length;i++)screens[i].classList.remove('active');
  getEl(id).classList.add('active');
}

function shuffle(a){var b=a.slice();for(var i=b.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=b[i];b[i]=b[j];b[j]=t;}return b;}

function startGame(){
  GameShell.beginRound();
  level=1;score=0;
  getEl('sc').textContent='0';
  showScreen('playScreen');
  nextLevel();
}

function nextLevel(){
  if(level>10){showResult();return;}busy=false;
  // Increase difficulty
  rowLen=Math.min(4+Math.floor(level/3),6);
  diffCount=Math.min(1+Math.floor((level-1)/3),3);
  maxTime=Math.max(3000,8000-level*400);
  found=0;

  getEl('lv').textContent=level;
  getEl('remain').textContent=diffCount;

  // Generate rows
  var pool=shuffle(POOL);
  var rowA=pool.slice(0,rowLen);
  var rowB=rowA.slice();

  // Pick positions to change
  var positions=[];
  for(var i=0;i<rowLen;i++)positions.push(i);
  positions=shuffle(positions);
  var diffPositions=positions.slice(0,diffCount);

  for(var i=0;i<diffPositions.length;i++){
    var pos=diffPositions[i];
    var replacement;
    do{replacement=POOL[Math.floor(Math.random()*POOL.length)];}while(replacement===rowA[pos]||replacement.split('>')[1]===rowA[pos].split('>')[1]);
    rowB[pos]=replacement;
  }

  // Render row A (reference, not clickable)
  var htmlA='';
  for(var i=0;i<rowLen;i++){
    htmlA+='<div class="emoji-cell" style="pointer-events:none">'+rowA[i]+'</div>';
  }
  getEl('rowA').innerHTML=htmlA;

  // Render row B (clickable)
  var htmlB='';
  for(var i=0;i<rowLen;i++){
    var isDiff=diffPositions.indexOf(i)>=0;
    htmlB+='<div class="emoji-cell" data-i="'+i+'" data-diff="'+(isDiff?'1':'0')+'">'+rowB[i]+'</div>';
  }
  getEl('rowB').innerHTML=htmlB;

  var cells=document.querySelectorAll('#rowB .emoji-cell');
  for(var i=0;i<cells.length;i++){
    cells[i].addEventListener('click',function(){onCellTap(this);});
  }

  getEl('speech').textContent='ちがうところをみつけてね〜！🔎';

  // Timer
  timeLeft=maxTime;
  clearInterval(timer);
  getEl('timerFill').style.width='100%';
  timer=setInterval(function(){
    if(GameShell.practice())return;
    timeLeft-=50;
    getEl('timerFill').style.width=Math.max(0,timeLeft/maxTime*100)+'%';
    if(timeLeft<=0){
      clearInterval(timer);
      busy=true;
      // Show remaining diffs
      var cells=document.querySelectorAll('#rowB .emoji-cell');
      for(var i=0;i<cells.length;i++){
        if(cells[i].getAttribute('data-diff')==='1'&&!cells[i].classList.contains('found'))
          cells[i].classList.add('highlight');
      }
      getEl('speech').textContent='じかんぎれ〜💦';
      setTimeout(showResult,1500);
    }
  },50);
}

function onCellTap(el){
  if(busy)return;
  if(el.classList.contains('found')||el.classList.contains('wrong'))return;
  if(el.getAttribute('data-diff')==='1'){
    el.classList.add('found');
    found++;
    score+=10+(GameShell.practice()?0:Math.floor(timeLeft/1000)*5);
    getEl('sc').textContent=score;
    getEl('remain').textContent=Math.max(0,diffCount-found);
    var msgs=['みつけた〜！✨','すご〜い！🔎','ぴんぽ〜ん！💕'];
    getEl('speech').textContent=msgs[Math.floor(Math.random()*msgs.length)];
    if(found>=diffCount){
      busy=true;
      clearInterval(timer);
      level++;
      var msgs2=['ぜんぶみつけた〜！つぎいくよ〜！🔎✨','かんぺき〜！💪'];
      getEl('speech').textContent=msgs2[Math.floor(Math.random()*msgs2.length)];
      setTimeout(nextLevel,1200);
    }
  }else{
    el.classList.add('wrong');GameShell.feedback(false);timeLeft=Math.max(0,timeLeft-750);score=Math.max(0,score-5);getEl('sc').textContent=score;
    setTimeout(function(){el.classList.remove('wrong');},400);
    getEl('speech').textContent='あれれ〜そこじゃないよ〜💦';
  }
}

function showResult(){
  clearInterval(timer);
  showScreen('resultScreen');
  getEl('rTitle').textContent='🎉 おつかれさま！';
  getEl('rEmoji').textContent='🔎🔍';
  getEl('rMsg').textContent=level>10?'10ステージクリア！':'レベル'+level+'まで いったね〜！';
  getEl('rScore').textContent=(GameShell.practice()?'練習スコア: ':'スコア: ')+score+'てん';
}

getEl('startBtn').addEventListener('click',startGame);
getEl('retryBtn').addEventListener('click',startGame);
})();

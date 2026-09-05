
(function(){
var WORDS=window.GAME_WORDS;


var route;
var chain,score,cnt,timer,timeLeft,maxTime,busy,usedEmojis;
maxTime=6000;

function getEl(id){return document.getElementById(id);}
function showScreen(id){var s=document.querySelectorAll('.screen');for(var i=0;i<s.length;i++)s[i].classList.remove('active');getEl(id).classList.add('active');}
function shuffle(a){var b=a.slice();for(var i=b.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=b[i];b[i]=b[j];b[j]=t;}return b;}

function startGame(){
  GameShell.beginRound();
  chain=[];score=0;cnt=0;busy=false;usedEmojis={};
  getEl('sc').textContent='0';
  getEl('cnt').textContent='0';
  showScreen('playScreen');
  // Pick a random starting word
  route=ArcadeRules.wordRoute(WORDS,11);
  var start=route[0];
  chain.push(start);
  usedEmojis[start.emoji]=true;
  renderChain();
  nextRound(start.last);
}

function renderChain(){
  var html='';
  var show=chain.slice(-5);
  for(var i=0;i<show.length;i++){
    if(i>0)html+='<span class="chain-arrow">→</span>';
    html+='<span class="chain-item">'+show[i].emoji+'</span>';
  }
  getEl('chain').innerHTML=html;
}

function nextRound(lastChar){
  if(cnt>=10){showResult(true);return;}
  // Find words starting with lastChar
  var candidates=[];
  for(var i=0;i<WORDS.length;i++){
    if(WORDS[i].read.charAt(0)===lastChar&&!usedEmojis[WORDS[i].emoji]){
      candidates.push(WORDS[i]);
    }
  }

  if(candidates.length===0){
    // No more words - game ends successfully
    showResult(false);
    return;
  }

  candidates=candidates.filter(w=>ArcadeRules.wordSuffix(WORDS,w.last,9-cnt,[...chain.map(w=>w.read),w.read])!==null);
  var answer=candidates[0];if(!answer){showResult(false);return;}

  // Pick distractors
  var distractors=[];
  var pool=shuffle(WORDS);
  for(var i=0;i<pool.length&&distractors.length<5;i++){
    if(pool[i].emoji!==answer.emoji&&pool[i].read.charAt(0)!==lastChar&&!usedEmojis[pool[i].emoji]){
      distractors.push(pool[i]);
    }
  }

  var options=shuffle(candidates.slice(0,3).concat(distractors.slice(0,6-Math.min(3,candidates.length))));
  getEl('nextChar').textContent='「'+lastChar+'」';

  var html='';
  for(var i=0;i<options.length;i++){
    html+='<div class="choice" data-e="'+options[i].emoji+'" data-r="'+options[i].read+'">'+options[i].emoji+'<small>'+options[i].read+'</small></div>';
  }
  getEl('choices').innerHTML=html;

  var cells=document.querySelectorAll('.choice');
  for(var i=0;i<cells.length;i++){
    cells[i].addEventListener('click',function(){
      if(busy)return;
      onChoose(this,answer,lastChar);
    });
  }

  getEl('speech').textContent='「'+lastChar+'」ではじまるの〜どれかな？🐍';

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
      showResult(false);
    }
  },50);
}

function onChoose(el,answer,lastChar){
  busy=true;
  clearInterval(timer);
  var tapped=el.getAttribute('data-e');
  var read=el.getAttribute('data-r');

  if(read.charAt(0)===lastChar){
    // Correct (could be the answer or another valid word)
    el.classList.add('correct');
    var word=null;
    for(var i=0;i<WORDS.length;i++){if(WORDS[i].emoji===tapped){word=WORDS[i];break;}}
    chain.push(word);
    usedEmojis[word.emoji]=true;
    cnt++;score+=10+(GameShell.practice()?0:Math.floor(timeLeft/1000)*5);
    getEl('sc').textContent=score;
    getEl('cnt').textContent=cnt;
    renderChain();
    var msgs=['つながった〜！✨','いいね〜！🐍💕','すご〜い！🎵'];
    getEl('speech').textContent=msgs[Math.floor(Math.random()*msgs.length)]+' '+word.emoji+'('+word.read+')';
    setTimeout(function(){busy=false;nextRound(word.last);},1000);
  }else{
    el.classList.add('wrong');
    // Show correct
    var cells=document.querySelectorAll('.choice');
    for(var i=0;i<cells.length;i++){
      if(cells[i].getAttribute('data-r').charAt(0)===lastChar)cells[i].classList.add('correct');
    }
    getEl('speech').textContent='あれれ〜ちがうよ〜💦 '+answer.emoji+'('+answer.read+')だったの！';
    setTimeout(function(){showResult(false);},1500);
  }
}

function showResult(cleared){
  busy=true;clearInterval(timer);
  showScreen('resultScreen');
  if(cleared||cnt>=10){
    getEl('rTitle').textContent='🎉 すご〜い！';
    getEl('rEmoji').textContent='🐍✨';
    getEl('rMsg').textContent=cnt+'こもつなげたよ〜！';
  }else if(cnt>=5){
    getEl('rTitle').textContent='😊 いいかんじ！';
    getEl('rEmoji').textContent='🐍💕';
    getEl('rMsg').textContent=cnt+'こつなげたね〜！';
  }else{
    getEl('rTitle').textContent='💪 がんばろ〜！';
    getEl('rEmoji').textContent='🐍';
    getEl('rMsg').textContent=cnt+'こつなげたよ〜！つぎはもっとがんばろ〜！';
  }
  getEl('rScore').textContent=(GameShell.practice()?'練習スコア: ':'スコア: ')+score+'てん';
}

const rule=document.createElement('p');rule.textContent='小さい文字は大きく（ちょ→よ）。最後の長音「ー」はその前の文字（ぎたー→た）。同じ単語は1回。どの正解からも10回つなげられます。';rule.style.cssText='font-size:13px;max-width:340px;margin:12px auto';getEl('startBtn').before(rule);
getEl('startBtn').addEventListener('click',startGame);
getEl('retryBtn').addEventListener('click',startGame);
})();

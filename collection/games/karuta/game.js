
(function(){
var KARUTA=window.GAME_WORDS;const SEASONS={"spring":[["🌸","はるにさくピンクのおはな"],["🦋","おはなにとまる、はねのあるちょうちょ"],["🍡","おはなみにたべる、くしにさしたおだんご"],["🎒","しょうがっこうでせおうランドセル"],["🌱","つちからでたばかりの、ちいさなめ"]],"summer":[["🍉","なつにたべる、みどりのかわでなかがあかいくだもの"],["🌻","なつにさく、おおきなきいろいおはな"],["🍦","コーンにのった、つめたいソフトクリーム"],["🏖️","すなはまにパラソルがある、うみべ"],["🎆","なつのよぞらでひらく、はなび"]],"autumn":[["🍁","あかくいろづいた、もみじのはっぱ"],["🌰","かたいからにつつまれた、くりの実"],["🎃","ハロウィンの、かおがついたかぼちゃ"],["🍠","むらさきのかわの、さつまいも"],["🍄","かさとじくのある、きのこ"]],"winter":[["❄️","ふゆにそらからふる、ゆきのけっしょう"],["⛄","ゆきをまるめてつくる、ゆきだるま"],["🧤","さむいひにてにはめる、てぶくろ"],["🧣","さむいひにくびにまく、マフラー"],["🎄","クリスマスにかざる、ツリー"]]};var season="all";

var deck;
var round,score,totalRounds,roundData,timer,timeLeft,maxTime,busy;
totalRounds=10;maxTime=5000;

function getEl(id){return document.getElementById(id);}
function showScreen(id){
  var screens=document.querySelectorAll('.screen');
  for(var i=0;i<screens.length;i++)screens[i].classList.remove('active');
  getEl(id).classList.add('active');
}

function shuffle(arr){
  var a=arr.slice();
  for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}
  return a;
}

var correctCount=0;
function startGame(){
  correctCount=0;
  GameShell.beginRound();
  season=getEl('season').value;round=0;score=0;const set=SEASONS[season]?.map(([emoji,hint])=>({emoji,hint}));deck=set?[...set,...set]:shuffle(KARUTA).slice(0,totalRounds);
  getEl('sc').textContent='0';
  showScreen('playScreen');
  nextRound();
}

function nextRound(){window.speechSynthesis?.cancel();
  if(round>=totalRounds){showResult();return;}
  round++;
  getEl('rnd').textContent=round;
  busy=false;

  // Pick answer + distractors
  var shuffled=shuffle(SEASONS[season]?Object.values(SEASONS).flat().map(([emoji,hint])=>({emoji,hint})):KARUTA);
  var answer=deck[round-1];shuffled=shuffled.filter(function(c){return c.emoji!==answer.emoji;});
  var options=[answer];
  for(var i=0;i<Math.min(5,shuffled.length);i++)options.push(shuffled[i]);
  options=shuffle(options);

  roundData={answer:answer.emoji,options:options};
  getEl('readingText').textContent=answer.hint;
  getEl('speech').textContent='はやくみつけてね〜！🎴';

  // Render cards
  var html='';
  for(var i=0;i<options.length;i++){
    html+='<div class="card" data-e="'+options[i].emoji+'">'+options[i].emoji+'</div>';
  }
  getEl('cards').innerHTML=html;
  var cardEls=document.querySelectorAll('.card');
  for(var i=0;i<cardEls.length;i++){
    cardEls[i].addEventListener('click',function(){
      if(busy)return;
      onCardTap(this);
    });
  }

  // Timer
  timeLeft=maxTime;
  clearInterval(timer);
  getEl('timerFill').style.width='100%';
  timer=setInterval(function(){
    if(GameShell.practice())return;
    timeLeft-=50;
    var pct=Math.max(0,timeLeft/maxTime*100);
    getEl('timerFill').style.width=pct+'%';
    if(timeLeft<=0){
      clearInterval(timer);
      busy=true;
      // Time up - show answer
      var cards=document.querySelectorAll('.card');
      for(var i=0;i<cards.length;i++){
        if(cards[i].getAttribute('data-e')===roundData.answer)cards[i].classList.add('correct');
        else cards[i].classList.add('disabled');
      }
      getEl('speech').textContent='じかんぎれ〜💦 つぎいくよ〜！';
      setTimeout(nextRound,900);
    }
  },50);
}

function onCardTap(el){
  busy=true;
  clearInterval(timer);
  var tapped=el.getAttribute('data-e');

  if(tapped===roundData.answer){
    el.classList.add('correct');GameShell.feedback(true);
    var bonus=(GameShell.practice()?0:Math.floor(timeLeft/maxTime*100));
    correctCount++;score+=10+bonus;
    getEl('sc').textContent=score;
    var msgs=['あったり〜！✨','すご〜い！🎴💕','ぴんぽ〜ん！🎵','はや〜い！💪'];
    getEl('speech').textContent=msgs[Math.floor(Math.random()*msgs.length)];
  }else{
    el.classList.add('wrong');GameShell.feedback(false);
    // Show correct
    var cards=document.querySelectorAll('.card');
    for(var i=0;i<cards.length;i++){
      if(cards[i].getAttribute('data-e')===roundData.answer)cards[i].classList.add('correct');
    }
    var msgs2=['あれれ〜ちがうよ〜💦','おしい〜！🎴','つぎがんばろ〜！'];
    getEl('speech').textContent=msgs2[Math.floor(Math.random()*msgs2.length)];
  }
  setTimeout(nextRound,900);
}

function showResult(){
  clearInterval(timer);
  showScreen('resultScreen');
  var pct=correctCount/totalRounds*100;
  if(pct>=80){
    getEl('rTitle').textContent='🎉 すご〜い！';
    getEl('rEmoji').textContent='🎴✨';
    getEl('rMsg').textContent='かるためいじんだね〜！';
  }else if(pct>=50){
    getEl('rTitle').textContent='😊 いいかんじ！';
    getEl('rEmoji').textContent='🎴💕';
    getEl('rMsg').textContent='もうちょっとでめいじんだよ〜！';
  }else{
    getEl('rTitle').textContent='😢 がんばろ〜！';
    getEl('rEmoji').textContent='🎴💦';
    getEl('rMsg').textContent='つぎはもっとはやくなれるよ〜！';
  }
  getEl('rScore').textContent=(GameShell.practice()?'練習スコア: ':'スコア: ')+score+'てん / 正解 '+correctCount+'/10';
}

const sel=document.createElement('label');sel.innerHTML='絵札セット <select id=season><option value=all>いろいろ</option><option value=spring>春の5枚×2</option><option value=summer>夏の5枚×2</option><option value=autumn>秋の5枚×2</option><option value=winter>冬の5枚×2</option></select>';getEl('startBtn').before(sel);const read=document.createElement('button');read.id='readAloud';read.textContent='お題を読み上げる（任意）';read.disabled=!('speechSynthesis' in window);read.onclick=()=>{try{speechSynthesis.cancel();const voice=new SpeechSynthesisUtterance(getEl('readingText').textContent);voice.lang='ja-JP';voice.volume=.5;speechSynthesis.speak(voice);}catch{getEl('speech').textContent='読み上げが使えません。上の文章を読んで遊べます';}};getEl('readingText').after(read);document.addEventListener('gamepause',()=>window.speechSynthesis?.cancel());
getEl('startBtn').addEventListener('click',startGame);
getEl('retryBtn').addEventListener('click',startGame);
getEl('backBtn').addEventListener('click',function(){showScreen('titleScreen');});
})();


(function(){
var HIRA_WORDS=['さくら','うさぎ','にじ','ほし','はな','そら','つき','うみ','かぜ','ゆき','もり','いぬ','ねこ','とり','くも','あめ','たい','やま','かわ','むし','おと','まち','いえ','みず','ひかり','あさ','よる','なつ','はる','ふゆ'];
var ALPHA_WORDS=['cat','sun','dog','sky','red','cup','hat','pen','run','big','hot','ice','joy','key','map','new','old','pet','top','win','bee','egg','fish','gold','hope','kite','moon','rain','star','tree'];

var charCount=0,charCorrect=0,inputMs=0,wordStarted=0,previousInput='',sources=new Set();
var mode='hira',busy=false,composing=false;
var words,qIdx,score,timer,timeLeft,maxTime,currentWord,totalQ;
totalQ=10;maxTime=8000;

function getEl(id){return document.getElementById(id);}
function showScreen(id){
  var screens=document.querySelectorAll('.screen');
  for(var i=0;i<screens.length;i++)screens[i].classList.remove('active');
  getEl(id).classList.add('active');
}

function shuffle(a){var b=a.slice();for(var i=b.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=b[i];b[i]=b[j];b[j]=t;}return b;}

function buildKeyboard(){
  var rows;
  if(mode==='hira'){
    rows=[
      ['あ','い','う','え','お','か','き','く','け','こ'],
      ['さ','し','す','せ','そ','た','ち','つ','て','と'],
      ['な','に','ぬ','ね','の','は','ひ','ふ','へ','ほ'],
      ['ま','み','む','め','も','や','ゆ','よ','わ','ん'],
      ['ら','り','る','れ','ろ','が','ぎ','ぐ','げ','ご'],
      ['ざ','じ','ず','ぜ','ぞ','だ','ぢ','づ','で','ど']
    ];
  }else{
    rows=[
      ['q','w','e','r','t','y','u','i','o','p'],
      ['a','s','d','f','g','h','j','k','l'],
      ['z','x','c','v','b','n','m']
    ];
  }
  var html='';
  for(var r=0;r<rows.length;r++){
    html+='<div class="kb-row">';
    for(var c=0;c<rows[r].length;c++){
      html+='<button class="kb-key" data-k="'+rows[r][c]+'">'+rows[r][c]+'</button>';
    }
    html+='</div>';
  }
  html+='<div class="kb-row"><button class="kb-key wide" data-k="back">←けす</button></div>';
  getEl('keyboard').innerHTML=html;

  var keys=document.querySelectorAll('.kb-key');
  for(var i=0;i<keys.length;i++){
    keys[i].addEventListener('click',function(){
      if(busy)return;
      sources.add('画面キー');var k=this.getAttribute('data-k');
      var inp=getEl('inp');
      if(k==='back'){
        inp.value=inp.value.slice(0,-1);
      }else{
        inp.value+=k;
      }
      checkInput();
    });
  }
}

var correctCount=0;
function startGame(){
  correctCount=0;charCount=0;charCorrect=0;inputMs=0;sources=new Set();
  GameShell.beginRound();
  words=shuffle(mode==='hira'?HIRA_WORDS:ALPHA_WORDS).slice(0,totalQ);
  qIdx=0;score=0;
  getEl('sc').textContent='0';
  showScreen('playScreen');
  buildKeyboard();
  nextWord();
}

function nextWord(){
  if(qIdx>=totalQ){showResult();return;}
  busy=false;previousInput='';wordStarted=GameShell.now();currentWord=words[qIdx];
  qIdx++;
  getEl('qNum').textContent=qIdx;
  getEl('target').textContent=currentWord;
  getEl('typed').innerHTML='<span class="cursor"> </span>';
  getEl('inp').value='';
  if(!matchMedia('(pointer:coarse)').matches)getEl('inp').focus();
  getEl('speech').textContent='はやくうってね〜！⌨️';

  timeLeft=maxTime;
  clearInterval(timer);
  getEl('timerFill').style.width='100%';
  timer=setInterval(function(){
    if(GameShell.practice())return;
    timeLeft-=50;
    getEl('timerFill').style.width=Math.max(0,timeLeft/maxTime*100)+'%';
    if(timeLeft<=0){
      clearInterval(timer);
      busy=true;inputMs+=GameShell.now()-wordStarted;getEl('speech').textContent='じかんぎれ〜💦';
      setTimeout(nextWord,1000);
    }
  },50);
}

function checkInput(event){
  if(event?.type==='input'&&!composing)sources.add('実キーボード/IME');
  if(busy||composing)return;
  var val=getEl('inp').value.normalize('NFKC');if(mode==='alpha')val=val.toLowerCase();getEl('inp').value=val;
  let same=0;while(same<val.length&&same<previousInput.length&&val[same]===previousInput[same])same++;for(let i=same;i<val.length;i++){charCount++;if(val[i]===currentWord[i])charCorrect++;}previousInput=val;
  const escapeChar=c=>c.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\"','&quot;');
  var html='';
  var allCorrect=true;
  for(var i=0;i<val.length;i++){
    if(i<currentWord.length&&val[i]===currentWord[i]){
      html+='<span class="correct">'+escapeChar(val[i])+'</span>';
    }else{
      html+='<span class="wrong">'+escapeChar(val[i])+'</span>';
      allCorrect=false;
    }
  }
  if(val.length<currentWord.length)html+='<span class="cursor"> </span>';
  getEl('typed').innerHTML=html;

  if(val.length===currentWord.length&&allCorrect){
    busy=true;
    clearInterval(timer);
    var bonus=(GameShell.practice()?0:Math.floor(timeLeft/maxTime*100));
    inputMs+=GameShell.now()-wordStarted;correctCount++;score+=10+bonus;
    getEl('sc').textContent=score;
    var msgs=['すご〜い！✨','はや〜い！⌨️💕','ぴったり〜！🎵','かんぺき〜！💪'];
    getEl('speech').textContent=msgs[Math.floor(Math.random()*msgs.length)];
    setTimeout(nextWord,800);
  }
}

// Real keyboard input
getEl('inp').addEventListener('compositionstart',()=>composing=true);
getEl('inp').addEventListener('compositionend',()=>{composing=false;sources.add('実キーボード/IME');checkInput();});
getEl('inp').addEventListener('input',checkInput);

function showResult(){
  clearInterval(timer);
  showScreen('resultScreen');
  var pct=correctCount/totalQ*100;
  if(pct>=70){
    getEl('rTitle').textContent='🎉 すご〜い！';
    getEl('rEmoji').textContent='⌨️✨';
    getEl('rMsg').textContent='タイピングめいじんだね〜！';
  }else if(pct>=40){
    getEl('rTitle').textContent='😊 いいかんじ！';
    getEl('rEmoji').textContent='⌨️💕';
    getEl('rMsg').textContent='どんどんはやくなってるよ〜！';
  }else{
    getEl('rTitle').textContent='💪 がんばろ〜！';
    getEl('rEmoji').textContent='⌨️';
    getEl('rMsg').textContent='れんしゅうすればはやくなるよ〜！';
  }
  getEl('rMsg').textContent+=' 入力方法：'+([...sources].join('＋')||'未入力')+(sources.size>1?'（混在）':'')+' / 入力 '+charCount+'文字 / 正確さ '+(charCount?Math.round(charCorrect/charCount*100):0)+'% / 入力時間 '+(inputMs/1000).toFixed(1)+'秒（問題間の待ち時間を除く）';
  getEl('rScore').textContent=(GameShell.practice()?'練習スコア: ':'スコア: ')+score+'てん / 正解 '+correctCount+'/10';
}

// Mode buttons
getEl('mHira').addEventListener('click',function(){mode='hira';getEl('mHira').classList.add('active');getEl('mAlpha').classList.remove('active');});
getEl('mAlpha').addEventListener('click',function(){mode='alpha';getEl('mAlpha').classList.add('active');getEl('mHira').classList.remove('active');});
getEl('startBtn').addEventListener('click',startGame);
getEl('retryBtn').addEventListener('click',startGame);
getEl('backBtn').addEventListener('click',function(){showScreen('titleScreen');});
})();

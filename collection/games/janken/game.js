
(function(){
var HANDS=['✊','✌️','🖐️'];
var plannedHand=0,personality='hint',previousHand=null;const statKey=k=>'janken-v4-'+personality+'-'+k;
function prepareHand(){if(personality==='fair'){plannedHand=Math.floor(Math.random()*3);getEl('mSpeech').textContent='均等モード：どの手も1/3。選ぶ前に決めているよ';return;}if(personality==='repeat'&&previousHand!==null){plannedHand=Math.random()<.7?previousHand:(previousHand+1+Math.floor(Math.random()*2))%3;getEl('mSpeech').textContent='くり返し派：前の手 '+HANDS[previousHand]+' を70%で出すよ';return;}var favorite=Math.floor(Math.random()*3);plannedHand=Math.random()<.6?favorite:(favorite+1+Math.floor(Math.random()*2))%3;getEl('mSpeech').textContent='今は '+HANDS[favorite]+' の気分（60%）。どう読む？';}
var mode=3;
var wins=0,losses=0,draws=0,round=0,winStreak=0,maxStreak=0,busy=false;
var roundHistory=[];
var totalW=0,totalL=0,totalD=0;
try{totalW=parseInt(localStorage.getItem(statKey('w')))||0;totalL=parseInt(localStorage.getItem(statKey('l')))||0;totalD=parseInt(localStorage.getItem(statKey('d')))||0;}catch(e){}

function getEl(id){return document.getElementById(id);}

function showScreen(id){
  var screens=document.querySelectorAll('.screen');
  for(var i=0;i<screens.length;i++){screens[i].classList.remove('active');}
  getEl(id).classList.add('active');
}

function updateTotalStats(){
  var t=totalW+totalL+totalD;
  getEl('totalStats').textContent=t>0?'通算（'+({hint:'気分予告',fair:'均等',repeat:'くり返し'}[personality])+'） '+totalW+'勝 '+totalL+'敗 '+totalD+'引分 ('+t+'戦)':'';
}
updateTotalStats();

function renderHistory(targetId){
  var el=getEl(targetId);
  var html='';
  for(var i=0;i<mode;i++){
    if(i<roundHistory.length){
      var r=roundHistory[i];
      if(r==='win')html+='<div class="history-item win">⭕</div>';
      else if(r==='lose')html+='<div class="history-item lose">❌</div>';
      else html+='<div class="history-item draw">△</div>';
    }else{
      html+='<div class="history-item empty">-</div>';
    }
  }
  el.innerHTML=html;
}

function start(m){
  GameShell.beginRound();
  personality=getEl('personality').value;previousHand=null;try{totalW=Number(localStorage.getItem(statKey('w')))||0;totalL=Number(localStorage.getItem(statKey('l')))||0;totalD=Number(localStorage.getItem(statKey('d')))||0;}catch{}mode=m;wins=0;losses=0;draws=0;round=0;winStreak=0;maxStreak=0;busy=false;
  roundHistory=[];
  showScreen('play');
  updateUI();
  prepareHand();
  getEl('cd').textContent='';
  getEl('battleArea').style.display='none';
  getEl('battleResult').textContent='';
  enableBtns(true);
  renderHistory('history');
}

function updateUI(){
  getEl('sWin').textContent=wins;
  getEl('sLose').textContent=losses;
  getEl('sDraw').textContent=draws;
  getEl('sRound').textContent=(round+1)+'回目';
  if(winStreak>=10)getEl('streak').textContent='🔥🔥🔥 '+winStreak+'連勝！すごすぎ！！';
  else if(winStreak>=5)getEl('streak').textContent='🔥🔥 '+winStreak+'連勝！つよい！';
  else if(winStreak>=3)getEl('streak').textContent='🔥 '+winStreak+'連勝中！';
  else getEl('streak').textContent='';
}

function enableBtns(on){
  var btns=document.querySelectorAll('.choice-btn');
  for(var i=0;i<btns.length;i++){
    btns[i].disabled=!on;
    if(on)btns[i].classList.remove('disabled');
    else btns[i].classList.add('disabled');
  }
}

function choose(p){
  if(busy||!getEl('play').classList.contains('active'))return;
  busy=true;
  enableBtns(false);
  getEl('battleArea').style.display='none';
  getEl('battleResult').textContent='';
  var steps=['じゃん…','けん…','ぽん！'];
  var i=0;

  function tick(){
    getEl('cd').textContent=steps[i];
    getEl('mSpeech').textContent=steps[i];
    i++;
    if(i<3){setTimeout(tick,250);}
    else{setTimeout(function(){reveal(p);},200);}
  }
  tick();
}

function reveal(p){
  var m=plannedHand;previousHand=m;
  getEl('cd').textContent='';

  // Show both hands
  getEl('battleArea').style.display='flex';
  getEl('pHand').textContent=HANDS[p];
  getEl('mHand2').textContent=HANDS[m];

  // Determine winner
  var res;
  if(p===m)res=0;
  else if((p===0&&m===1)||(p===1&&m===2)||(p===2&&m===0))res=1;
  else res=2;

  round++;

  var resultEl=getEl('battleResult');

  if(res===0){
    draws++;
    getEl('mSpeech').textContent='あいこだ！もう一回〜！😆';
    resultEl.textContent='△ あいこ！';
    resultEl.className='battle-result result-draw';
    round--; // あいこはカウントしない
    // Draws are reported separately; match slots count decisive rounds only.
    totalD++;try{localStorage.setItem(statKey('d'),totalD);}catch(e){}
  }else if(res===1){
    wins++;winStreak++;
    if(winStreak>maxStreak)maxStreak=winStreak;
    totalW++;try{localStorage.setItem(statKey('w'),totalW);}catch(e){}
    var wMsgs=['えぇ〜負けちゃった😢','うぅ〜くやしい！😣','つよいね〜！🐻💦','まけた〜😭'];
    getEl('mSpeech').textContent=wMsgs[Math.floor(Math.random()*wMsgs.length)];
    resultEl.textContent='⭕ あなたの勝ち！';
    resultEl.className='battle-result result-win';
    roundHistory.push('win');
  }else{
    losses++;winStreak=0;
    totalL++;try{localStorage.setItem(statKey('l'),totalL);}catch(e){}
    var lMsgs=['えへへ〜ポン太の勝ち！🐻✨','やった〜！💖','ポン太つよいでしょ！😄','かったー！🎉'];
    getEl('mSpeech').textContent=lMsgs[Math.floor(Math.random()*lMsgs.length)];
    resultEl.textContent='❌ ポン太の勝ち！';
    resultEl.className='battle-result result-lose';
    roundHistory.push('lose');
  }

  updateUI();
  renderHistory('history');

  // Check game over
  var needed=Math.ceil(mode/2);
  if(wins>=needed||losses>=needed||round>=mode){
    setTimeout(function(){showResultScreen();},1000);
  }else{
    setTimeout(function(){
      getEl('battleArea').style.display='none';
      getEl('battleResult').textContent='';
      prepareHand();
      enableBtns(true);
      busy=false;
    },1000);
  }
}

function showResultScreen(){
  busy=false;
  showScreen('result');
  renderHistory('historyResult');

  if(wins>losses){
    getEl('rTitle').textContent='🎉 あなたの勝ち！';
    getEl('rTitle').style.color='#E91E63';
    getEl('rEmoji').textContent='🐻😢';
    getEl('rMsg').textContent='ポン太負けちゃった〜…つぎは負けないから！';
  }else if(losses>wins){
    getEl('rTitle').textContent='🐻 ポン太の勝ち！';
    getEl('rTitle').style.color='#7C4DFF';
    getEl('rEmoji').textContent='🐻✨';
    getEl('rMsg').textContent='えへへ〜ポン太の勝ち！もう一回やろ！';
  }else{
    getEl('rTitle').textContent='🤝 ひきわけ！';
    getEl('rTitle').style.color='#FFB300';
    getEl('rEmoji').textContent='🐻🤔';
    getEl('rMsg').textContent='おんなじくらいの強さだね！';
  }
  getEl('rScore').textContent=wins+'勝 '+losses+'敗 '+draws+'引分（最大'+maxStreak+'連勝）';
  updateTotalStats();
}

const personalitySelect=document.createElement('label');personalitySelect.innerHTML='相手の性格 <select id=personality><option value=hint>気分を予告（60%）</option><option value=fair>均等（各1/3）</option><option value=repeat>前の手をくり返す（70%）</option></select>';getEl('btn3').closest('.mode-btns').before(personalitySelect);
getEl('personality').onchange=function(){personality=this.value;try{totalW=Number(localStorage.getItem(statKey('w')))||0;totalL=Number(localStorage.getItem(statKey('l')))||0;totalD=Number(localStorage.getItem(statKey('d')))||0;}catch{totalW=totalL=totalD=0;}updateTotalStats();};
// Event listeners
getEl('btn3').addEventListener('click',function(){start(3);});
getEl('btn5').addEventListener('click',function(){start(5);});
getEl('btn7').addEventListener('click',function(){start(7);});
getEl('c0').addEventListener('click',function(){choose(0);});
getEl('c1').addEventListener('click',function(){choose(1);});
getEl('c2').addEventListener('click',function(){choose(2);});
getEl('btnBack').addEventListener('click',function(){busy=false;showScreen('title');updateTotalStats();});

})();

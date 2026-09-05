
(function(){
var EMOJIS=["fish","octopus","crab","shell","star","jelly","turtle","whale"];var names={"fish":"さかな","octopus":"たこ","crab":"かに","shell":"かい","star":"ひとで","jelly":"くらげ","turtle":"うみがめ","whale":"くじら"};var previewPractice=false;
var cards,first,second,busy,matched,taps,pairs,totalPairs,startTime,timerInt;
var rows=2,cols=3,difficulty=0;

function getEl(id){return document.getElementById(id);}

function initGame(){
  GameShell.beginRound();previewPractice=!!document.getElementById('previewPractice')?.checked;
  var total=rows*cols;
  totalPairs=total/2;
  // Pick emojis
  var pool=EMOJIS.slice();
  for(var i=pool.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=pool[i];pool[i]=pool[j];pool[j]=t;}
  var selected=pool.slice(0,totalPairs);
  cards=[];
  for(var i=0;i<totalPairs;i++){cards.push(selected[i]);cards.push(selected[i]);}
  // Shuffle
  for(var i=cards.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=cards[i];cards[i]=cards[j];cards[j]=t;}

  first=null;second=null;busy=false;matched=0;taps=0;pairs=0;
  getEl('pairs').textContent='0';
  getEl('total').textContent=totalPairs;
  getEl('taps').textContent='0';
  getEl('newBtn').style.display='none';
  getEl('speech').textContent='あのねあのね、おなじえもじをみつけてね〜！🐠';
  clearInterval(timerInt);
  startTime=GameShell.now();
  getEl('timer').textContent='0';
  timerInt=setInterval(function(){getEl('timer').textContent=Math.floor((GameShell.now()-startTime)/1000);},500);

  // Set grid
  getEl('board').style.gridTemplateColumns='repeat('+cols+',1fr)';
  if(previewPractice){for(let i=0;i<cards.length;i++)cards[i+'_state']='face';busy=true;getEl('speech').textContent='練習：3秒だけ全札を見よう';setTimeout(()=>{for(let i=0;i<cards.length;i++)cards[i+'_state']='';busy=false;startTime=GameShell.now();render();getEl('speech').textContent='練習：同じ生き物を探そう';},3000);}
  render();
}

function render(){
  const focused=document.activeElement;const restore=focused?.closest('#board')?{i:focused.dataset.i,r:focused.dataset.r,c:focused.dataset.c}:null;

  var html='';
  for(var i=0;i<cards.length;i++){
    var cls='card';
    var state=cards[i+'_state']||'';
    if(state==='face')cls+=' face';
    if(state==='matched')cls+=' matched';
    html+='<div class="'+cls+'" data-i="'+i+'"><span class="front">'+'<img width=44 height=44 src="../../assets/sea/'+cards[i]+'.svg" alt="'+names[cards[i]]+'">'+'</span><span class="back">?</span></div>';
  }
  getEl('board').innerHTML=html;
  var els=document.querySelectorAll('.card');
  for(var j=0;j<els.length;j++){
    els[j].addEventListener('click',function(){
      var idx=parseInt(this.getAttribute('data-i'));
      onCardClick(idx);
    });
  }
  if(restore){const selector=restore.i!==undefined?'[data-i=\"'+restore.i+'\"]':'[data-r=\"'+restore.r+'\"][data-c=\"'+restore.c+'\"]';const target=getEl('board').querySelector(selector);if(target){target.tabIndex=0;target.focus({preventScroll:true});}}

}

function onCardClick(idx){
  if(busy)return;
  var st=cards[idx+'_state']||'';
  if(st==='face'||st==='matched')return;

  taps++;
  getEl('taps').textContent=taps;
  cards[idx+'_state']='face';
  render();

  if(first===null){
    first=idx;
  }else{
    second=idx;
    busy=true;
    if(cards[first]===cards[second]){
      // Match!
      GameShell.feedback(true);
      setTimeout(function(){
        cards[first+'_state']='matched';
        cards[second+'_state']='matched';
        pairs++;
        getEl('pairs').textContent=pairs;
        first=null;second=null;busy=false;
        render();
        if(pairs===totalPairs){
          clearInterval(timerInt);
          var time=Math.floor((GameShell.now()-startTime)/1000);
          getEl('speech').textContent=(previewPractice?'練習（プレビューあり） ':'通常 ')+'🎉 '+(taps<=totalPairs*3?'★★★':taps<=totalPairs*5?'★★':'★')+' '+taps+'タップ / '+time+'秒！ 最小は'+(totalPairs*2)+'タップ';
          getEl('newBtn').style.display='inline-block';
        }else{
          var msgs=['あったあった〜！✨','ぴったんこ〜！💕','すごいすごい〜！🐠'];
          getEl('speech').textContent=msgs[Math.floor(Math.random()*msgs.length)];
        }
      },300);
    }else{
      // No match
      setTimeout(function(){
        cards[first+'_state']='';
        cards[second+'_state']='';
        first=null;second=null;busy=false;
        render();
        var msgs=['あれれ〜ちがったね💦','おしい〜！🐠','よくおぼえてね〜！'];
        getEl('speech').textContent=msgs[Math.floor(Math.random()*msgs.length)];
      },700);
    }
  }
}

// Difficulty
var configs=[[2,3],[3,4],[4,4]];
var dbtns=[getEl('d1'),getEl('d2'),getEl('d3')];
for(var i=0;i<3;i++){
  (function(idx){
    dbtns[idx].addEventListener('click',function(){
      for(var j=0;j<3;j++)dbtns[j].classList.remove('active');
      dbtns[idx].classList.add('active');
      difficulty=idx;rows=configs[idx][0];cols=configs[idx][1];
      initGame();
    });
  })(i);
}

const practiceLabel=document.createElement('label');practiceLabel.innerHTML='<input type=checkbox id=previewPractice> 全札を3秒見る練習';getEl('board').before(practiceLabel);document.getElementById('previewPractice').onchange=initGame;
getEl('newBtn').addEventListener('click',initGame);
initGame();
})();


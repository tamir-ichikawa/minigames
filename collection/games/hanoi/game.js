
(function(){
var Cv=document.getElementById('c'),X=Cv.getContext('2d');
var CW=360,CH=280;
var COLORS=['#EF5350','#FF9800','#FFD740','#66BB6A','#42A5F5'];
var diskCount=3,pegs=[[],[],[]],selected=-1,moves=0,minMoves=7;

function getEl(id){return document.getElementById(id);}
function showScreen(id){var s=document.querySelectorAll('.screen');for(var i=0;i<s.length;i++)s[i].classList.remove('active');getEl(id).classList.add('active');}

function startGame(){
  GameShell.beginRound();
  pegs=[[],[],[]];
  for(var i=diskCount;i>=1;i--)pegs[0].push(i);
  selected=-1;moves=0;
  minMoves=Math.pow(2,diskCount)-1;
  getEl('moves').textContent='0';
  getEl('minMoves').textContent=minMoves;
  getEl('speech').textContent='柱をタップして円盤を移動してね〜！🗼';
  showScreen('playScreen');
  draw();
}

function draw(){
  X.clearRect(0,0,CW,CH);
  var baseY=CH-30;
  var pegX=[CW/6,CW/2,CW*5/6];
  var pegW=8;
  var diskH=22;
  var maxW=CW/3-20;

  // Base
  X.fillStyle='#8D6E63';
  X.fillRect(10,baseY,CW-20,10);

  // Pegs
  for(var p=0;p<3;p++){
    var px=pegX[p];
    // Peg pole
    X.fillStyle=selected===p?'#FFD740':'#BCAAA4';
    X.fillRect(px-pegW/2,baseY-diskCount*diskH-30,pegW,diskCount*diskH+30);
    // Label
    X.font='12px sans-serif';X.textAlign='center';X.fillStyle='#888';
    X.fillText(p===0?'A':p===1?'B':'C',px,baseY+22);
    // Selection indicator
    if(selected===p){
      X.fillStyle='#FFD740';X.font='16px serif';
      X.fillText('👆',px,baseY-diskCount*diskH-40);
    }

    // Disks
    for(var d=0;d<pegs[p].length;d++){
      var disk=pegs[p][d];
      var dw=20+disk*(maxW-20)/diskCount;
      var dy=baseY-10-(d+1)*diskH;
      X.fillStyle=COLORS[(disk-1)%COLORS.length];
      X.beginPath();
      X.moveTo(px-dw/2+5,dy);
      X.arcTo(px+dw/2,dy,px+dw/2,dy+diskH,5);
      X.arcTo(px+dw/2,dy+diskH,px-dw/2,dy+diskH,5);
      X.arcTo(px-dw/2,dy+diskH,px-dw/2,dy,5);
      X.arcTo(px-dw/2,dy,px+dw/2,dy,5);
      X.fill();
      // Highlight
      X.fillStyle='rgba(255,255,255,0.2)';
      X.fillRect(px-dw/2+6,dy+2,dw-12,4);
      // Number
      X.fillStyle='#fff';X.font='bold 12px sans-serif';X.textAlign='center';
      X.fillText(disk,px,dy+diskH/2+4);
    }
  }

  // Bunny
  X.font='24px serif';X.textAlign='center';
  X.fillText('🗼',CW/2,CH-5);
}

function onTap(e){
  e.preventDefault();
  var rect=Cv.getBoundingClientRect();
  var tx=(e.touches?e.touches[0].clientX:e.clientX);
  var x=(tx-rect.left)/rect.width*CW;

  var pegIdx=x<CW/3?0:x<CW*2/3?1:2;

  if(selected===-1){
    // Select source
    if(pegs[pegIdx].length>0){
      selected=pegIdx;
      getEl('speech').textContent='どの柱に移動する〜？🗼';
      draw();
    }
  }else{
    if(pegIdx===selected){
      // Deselect
      selected=-1;
      getEl('speech').textContent='キャンセルしたよ〜🗼';
      draw();
      return;
    }
    // Try to move
    var srcDisk=pegs[selected][pegs[selected].length-1];
    var dstTop=pegs[pegIdx].length>0?pegs[pegIdx][pegs[pegIdx].length-1]:999;
    if(srcDisk<dstTop){
      pegs[pegIdx].push(pegs[selected].pop());
      moves++;
      getEl('moves').textContent=moves;
      selected=-1;
      var msgs=['いいね〜！✨','そうそう！🗼','うまい〜！💕'];
      getEl('speech').textContent=msgs[Math.floor(Math.random()*msgs.length)];
      draw();
      // Check win
      if(pegs[2].length===diskCount){
        setTimeout(showResult,500);
      }
    }else{
      selected=-1;
      getEl('speech').textContent='小さい円盤の上には置けないよ〜💦';
      draw();
    }
  }
}

Cv.addEventListener('mousedown',onTap);
Cv.addEventListener('touchstart',onTap,{passive:false});

function showResult(){
  showScreen('resultScreen');
  if(moves===minMoves){
    getEl('rTitle').textContent='🎉 かんぺき！';getEl('rTitle').style.color='#FFD740';
    getEl('rEmoji').textContent='🗼✨';
    getEl('rMsg').textContent='最小手数でクリア！天才〜！';
  }else if(moves<=minMoves*1.5){
    getEl('rTitle').textContent='✨ すご〜い！';getEl('rTitle').style.color='#2E7D32';
    getEl('rEmoji').textContent='🗼💕';
    getEl('rMsg').textContent='なかなかの腕前だね〜！';
  }else{
    getEl('rTitle').textContent='😊 クリア！';getEl('rTitle').style.color='#FF9800';
    getEl('rEmoji').textContent='🗼💪';
    getEl('rMsg').textContent='クリアおめでとう〜！';
  }
  getEl('rMoves').textContent=moves+'手（最小: '+minMoves+'手）';
}

// Difficulty
var dBtns=[getEl('d3'),getEl('d4'),getEl('d5')];
var dVals=[3,4,5];
for(var i=0;i<3;i++){(function(idx){
  dBtns[idx].addEventListener('click',function(){
    for(var j=0;j<3;j++)dBtns[j].classList.remove('active');
    dBtns[idx].classList.add('active');
    diskCount=dVals[idx];
  });
})(i);}

getEl('startBtn').addEventListener('click',startGame);
getEl('retryBtn').addEventListener('click',startGame);
getEl('resetBtn').addEventListener('click',startGame);
getEl('backBtn').addEventListener('click',function(){showScreen('titleScreen');});
draw();
})();

(function(){function decorate(){document.querySelectorAll(".num,.pad,.cbtn,.box,.big-btn,.target").forEach(el=>{if(el.hasAttribute("tabindex")||el.tagName==="BUTTON")return;el.tabIndex=0;el.setAttribute("role","button");el.addEventListener("keydown",e=>{if((e.code==="Enter"||e.code==="Space")&&!e.repeat){e.preventDefault();el.click();}});});}decorate();new MutationObserver(decorate).observe(document.getElementById("g"),{subtree:true,childList:true});})();

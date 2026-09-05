
(function(){
const {requestAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval}=GameShell.clock;
var C=document.getElementById('c');
var X=C.getContext('2d');
var W=380,H=640;
C.width=W;C.height=H;
function resize(){var r=Math.min(window.innerWidth/W,GameShell.height()/H);C.style.width=Math.floor(W*r)+'px';C.style.height=Math.floor(H*r)+'px';}
resize();window.addEventListener('resize',resize);

var state='menu';
var CATEGORIES=[
  {name:'たべもの🍎',emojis:['🍎','🍊','🍇','🍰','🍣','🍙','🍉','🍦','🍕','🍔']},
  {name:'どうぶつ🐱',emojis:['🐱','🐶','🐰','🦊','🐻','🐸','🐧','🐮','🐷','🐵']},
  {name:'しぜん🌸',emojis:['🌸','⭐','☀️','🌈','❄️','🌙','🌻','🍀','🌊','🔥']},
  {name:'のりもの🚗',emojis:['🚗','✈️','🚂','🚢','🚲','🏍️','🚀','🚁','⛵','🛴']}
];

var finiteMode=true;function recordKey(){return finiteMode?'poston-sort-v4-30':'poston-sort-v4-endless';}
var sortCombo=0,delivered=0,nextItem=null,itemBag=[];
var leftCat,rightCat,falling,score,best,lives,speed,frame,effects;
try{best=parseInt(localStorage.getItem(recordKey()))||0;}catch(e){best=0;}

function reset(){
  GameShell.beginRound();finiteMode=document.getElementById('deliveryMode').value==='30';try{best=Number(localStorage.getItem(recordKey()))||0;}catch{best=0;}
  // Pick 2 random categories
  var shuffled=CATEGORIES.slice();
  for(var i=shuffled.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=shuffled[i];shuffled[i]=shuffled[j];shuffled[j]=t;}
  leftCat=shuffled[0];rightCat=shuffled[1];
  falling=null;delivered=0;itemBag=[];nextItem=null;score=0;sortCombo=0;lives=3;speed=2;frame=0;effects=[];
  spawnItem();
}

function spawnItem(){
  if(finiteMode&&delivered>=30){state='over';if(score>best){best=score;try{localStorage.setItem(recordKey(),best);}catch{}}return;}
  const item=nextItem||makeItem();nextItem=makeItem();falling={x:W/2,y:95,...item,vx:0,decided:false};
}
function makeItem(){if(!itemBag.length)itemBag=[true,false,true,false].sort(()=>Math.random()-.5);const isLeft=itemBag.pop(),cat=isLeft?leftCat:rightCat;return{isLeft,emoji:cat.emojis[Math.floor(Math.random()*cat.emojis.length)]};}

var touchStartX=null;
function onInput(e){
  if(e)e.preventDefault();
  if(state==='menu'){state='play';reset();return;}
  if(state==='over'){state='play';reset();return;}
}

let gesture=0,canFlick=false;GameShell.drag(C,{start:e=>{canFlick=state==='play';gesture=0;if(!canFlick)onInput(e);},move:dx=>{if(!canFlick)return;gesture+=dx;if(Math.abs(gesture)>20){flick(gesture>0?1:-1);canFlick=false;}},end:()=>{canFlick=false;gesture=0;}});
document.addEventListener('keydown',function(e){
  if(state!=='play'){if(e.code==='Space')onInput(null);return;}
  if(e.key==='ArrowLeft')flick(-1);
  if(e.key==='ArrowRight')flick(1);
});

function flick(dir){
  if(!falling||falling.decided)return;
  falling.decided=true;delivered++;
  falling.vx=dir*8;

  var correct=(dir===-1&&falling.isLeft)||(dir===1&&!falling.isLeft);
  GameShell.feedback(correct);if(correct){
    sortCombo++;score+=10+(sortCombo%5===0?20:0);
    speed=2+score*0.012;if(speed>4.5)speed=4.5;
    effects.push({x:falling.x,y:falling.y,text:sortCombo%5===0?'5連続 +20':'⭕',life:20,color:'#66BB6A'});
  }else{
    lives--;sortCombo=0;
    effects.push({x:falling.x,y:falling.y,text:'❌',life:20,color:'#EF5350'});
    if(lives<=0){
      state='over';
      if(score>best){best=score;try{localStorage.setItem('poston-sort-v4-30',best);}catch(e){}}
      return;
    }
  }
  setTimeout(function(){if(state==='play')spawnItem();},300);
}

function drawBg(){
  X.fillStyle='#E3F2FD';X.fillRect(0,0,W,H);
  // Left zone
  X.fillStyle='rgba(129,199,132,0.15)';X.fillRect(0,0,W/2,H);
  // Right zone
  X.fillStyle='rgba(100,181,246,0.15)';X.fillRect(W/2,0,W/2,H);
  // Divider
  X.strokeStyle='rgba(0,0,0,0.08)';X.lineWidth=2;
  X.setLineDash([10,10]);
  X.beginPath();X.moveTo(W/2,0);X.lineTo(W/2,H);X.stroke();
  X.setLineDash([]);

  // Category labels
  X.save();
  X.font='bold 14px sans-serif';X.textAlign='center';
  X.fillStyle='#388E3C';X.fillText('◀ '+leftCat.name,W*0.25,H-20);
  X.fillStyle='#1976D2';X.fillText(rightCat.name+' ▶',W*0.75,H-20);
  X.restore();
}

function drawFalling(){
  if(!falling)return;
  X.font='40px serif';X.textAlign='center';X.textBaseline='middle';
  X.fillText(falling.emoji,falling.x,falling.y);
}

function drawEffects(){
  for(var i=effects.length-1;i>=0;i--){
    var e=effects[i];e.life--;
    if(e.life<=0){effects.splice(i,1);continue;}
    X.globalAlpha=e.life/20;
    X.font='bold 28px sans-serif';X.textAlign='center';X.fillStyle=e.color;
    X.fillText(e.text,e.x,e.y-(20-e.life)*1.5);
    X.globalAlpha=1;
  }
}

function drawHUD(){
  X.save();
  X.font='bold 16px sans-serif';X.textAlign='center';X.fillStyle='#333';
  X.fillText('スコア: '+score,W/2,30);X.font='14px sans-serif';X.fillText(delivered+(finiteMode?'/30個 / 次：':'個 / 次：')+(nextItem?.emoji||''),W/2,63);
  X.font='16px serif';X.textAlign='left';
  var hp='';for(var i=0;i<lives;i++)hp+='💖';
  X.fillText(hp,10,30);
  X.restore();
}

function drawMenu(){
  X.fillStyle='#E3F2FD';X.fillRect(0,0,W,H);
  X.save();X.textAlign='center';X.textBaseline='middle';
  X.font='bold 26px sans-serif';X.fillStyle='#1976D2';
  X.fillText('ポストン仕分け局',W/2,H*0.15);
  var fy=Math.sin(Date.now()/400)*8;
  X.font='50px serif';ArcadeArt.draw(X,W/2,H*0.30+fy,72);
  X.font='15px sans-serif';X.fillStyle='#666';
  X.fillText('えもじを左右にフリックして',W/2,H*0.46);
  X.fillText('30個配送 / 5連続正解で+20',W/2,H*0.51);
  X.fillText('◀ 左フリック / 右フリック ▶',W/2,H*0.57);
  if(best>0){X.font='14px sans-serif';X.fillStyle='#999';X.fillText('🏆 ベスト: '+best,W/2,H*0.63);}
  X.font='18px sans-serif';X.fillStyle='#FF80AB';
  X.fillText('タップで開始！',W/2,H*0.72);
  X.restore();
}

function drawGameOver(){
  X.fillStyle='rgba(0,0,0,0.5)';X.fillRect(0,0,W,H);
  X.save();X.textAlign='center';X.textBaseline='middle';
  X.font='bold 26px sans-serif';X.fillStyle='#FF5252';
  X.fillText(finiteMode&&delivered>=30&&lives>0?'30個 配送完了！':'配送終了',W/2,H*0.28);
  X.font='20px sans-serif';X.fillStyle='#fff';
  X.fillText('スコア: '+score,W/2,H*0.38);
  if(score>=best&&score>0){X.fillStyle='#FFD740';X.fillText('🎉 ハイスコア！',W/2,H*0.44);}
  X.fillStyle='#ccc';X.fillText('🏆 ベスト: '+best,W/2,H*0.50);
  X.font='16px sans-serif';X.fillStyle='#FF80AB';
  X.fillText('タップでもう一回！',W/2,H*0.62);
  X.restore();
}

function update(){
  if(state!=='play'||!falling)return;
  frame++;
  if(falling.decided){
    falling.x+=falling.vx;
    falling.y+=2;
  }else{
    falling.y+=speed;
    if(falling.y>H+30){
      // Missed
      delivered++;lives--;sortCombo=0;
      effects.push({x:W/2,y:H-60,text:'💦',life:20,color:'#FF9800'});
      if(lives<=0){
        state='over';
        if(score>best){best=score;try{localStorage.setItem('poston-sort-v4-30',best);}catch(e){}}
        return;
      }
      spawnItem();
    }
  }
}

const modeLabel=document.createElement('label');modeLabel.id='delivery-mode-label';modeLabel.innerHTML='配送モード <select id=deliveryMode><option value=30>30個で終了</option><option value=endless>エンドレス</option></select>';document.body.append(modeLabel);modeLabel.style.cssText='position:fixed;top:60px;left:50%;transform:translateX(-50%);font-size:14px;white-space:nowrap;';document.getElementById('deliveryMode').onchange=()=>{finiteMode=document.getElementById('deliveryMode').value==='30';try{best=Number(localStorage.getItem(recordKey()))||0;}catch{best=0;}};
function loop(){modeLabel.hidden=state==='play';
  X.clearRect(0,0,W,H);
  if(state==='menu'){drawMenu();}
  else if(state==='play'){drawBg();drawFalling();drawEffects();drawHUD();}
  else{drawBg();drawEffects();drawGameOver();}

}
GameShell.run({update,render:loop,reset});
})();

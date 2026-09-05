
(function(){
var C=document.getElementById('c');
var X=C.getContext('2d');
var cw=Math.min(380,window.innerWidth-24);
var ch=Math.max(160,Math.min(340,GameShell.height()-260));
C.width=cw;C.height=ch;

var COLORS=['#333333','#EF5350','#FF9800','#FFEB3B','#4CAF50','#2196F3','#9C27B0','#FF80AB','#795548','#fff'];
var EMOJIS=['🎨','🌸','⭐','❤️','🎵','🌈','☀️','🐱','🍎','🎀'];

var curColor='#333333';
var curSize=4;
var isEraser=false;
var drawing=false;
var lastX,lastY;
var history=[],redoHistory=[],shape='pen',origin=null,shapeBase=null;

function getEl(id){return document.getElementById(id);}

// Save current state
function saveState(){redoHistory=[];
  if(history.length>=30)history.shift();
  history.push(X.getImageData(0,0,C.width,C.height));
}

function undo(){
  if(!history.length)return;
  drawing=false;redoHistory.push(X.getImageData(0,0,C.width,C.height));const old=history.pop();C.width=old.width;C.height=old.height;X.putImageData(old,0,0);
}

// Color palette
var colHtml='';
for(var i=0;i<COLORS.length;i++){
  var active=COLORS[i]===curColor?' active':'';
  var border=COLORS[i]==='#fff'?'border:2px solid #ccc;':'';
  colHtml+='<button aria-label="'+['黒','赤','橙','黄','緑','青','紫','桃','茶','白'][i]+'" class="color-btn'+active+'" data-c="'+COLORS[i]+'" style="background:'+COLORS[i]+';'+border+'"></button>';
}
getEl('colors').innerHTML=colHtml;

var colBtns=document.querySelectorAll('.color-btn');
for(var i=0;i<colBtns.length;i++){
  colBtns[i].addEventListener('click',function(){
    curColor=this.getAttribute('data-c');
    isEraser=false;stampMode=false;shape='pen';syncTools();
    getEl('eraserBtn').classList.remove('active');
    for(var j=0;j<colBtns.length;j++)colBtns[j].classList.remove('active');
    this.classList.add('active');
  });
}

// Emoji stamps
var emHtml='';
for(var i=0;i<EMOJIS.length;i++){
  emHtml+='<button class="emoji-btn" data-e="'+EMOJIS[i]+'">'+EMOJIS[i]+'</button>';
}
getEl('emojis').innerHTML=emHtml;

var stampMode=false,stampEmoji='';
var emBtns=document.querySelectorAll('.emoji-btn');
for(var i=0;i<emBtns.length;i++){
  emBtns[i].addEventListener('click',function(){
    stampEmoji=this.getAttribute('data-e');
    stampMode=true;shape='pen';
    isEraser=false;syncTools();
    getEl('speech').textContent=stampEmoji+'をおきたいところをタップしてね〜！🎨';
  });
}

// Eraser
getEl('eraserBtn').addEventListener('click',function(){
  isEraser=!isEraser;
  stampMode=false;shape='pen';syncTools();
  syncTools();
  getEl('speech').textContent=isEraser?'けしゴムモードだよ〜🧽':'おえかきモードにもどったよ〜🎨';
});

// Size
getEl('sizeSlider').addEventListener('input',function(){curSize=parseInt(this.value);});

// Undo
getEl('undoBtn').addEventListener('click',function(){undo();getEl('speech').textContent='もどしたよ〜！↩🎨';});

// Clear
getEl('clearBtn').addEventListener('click',function(){
  saveState();X.clearRect(0,0,C.width,C.height);
  getEl('speech').textContent='ぜんぶけしちゃった〜！🗑🎨';
});

// Save
getEl('saveBtn').addEventListener('click',function(){
  var link=document.createElement('a');
  link.download='iro-no-atelier.png';
  const output=document.createElement('canvas');output.width=C.width;output.height=C.height;const ctx=output.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,C.width,C.height);ctx.drawImage(C,0,0);link.href=output.toDataURL();
  link.click();
  getEl('speech').textContent='画像のダウンロードを開始しました。保存先を確認してね。';
});

// Drawing
function startDraw(x,y){
  if(shape!=='pen'){saveState();shapeBase=X.getImageData(0,0,C.width,C.height);origin={x,y};drawing=true;return;}
  if(stampMode){
    saveState();
    X.font='28px serif';X.textAlign='center';X.textBaseline='middle';
    X.fillText(stampEmoji,x,y);
    stampMode=false;syncTools();
    var msgs=['ぺたっ！かわいい〜！✨','いいかんじ〜！🎨','すてき〜！💕'];
    getEl('speech').textContent=msgs[Math.floor(Math.random()*msgs.length)];
    return;
  }
  drawing=true;lastX=x;lastY=y;
  saveState();
  X.beginPath();
  X.arc(x,y,curSize/2,0,Math.PI*2);
  X.fillStyle=isEraser?'#fff':curColor;
  X.fill();
}

function moveDraw(x,y){
  if(!drawing)return;
  if(shape!=='pen'){X.putImageData(shapeBase,0,0);X.beginPath();X.strokeStyle=curColor;X.lineWidth=curSize;if(shape==='line'){X.moveTo(origin.x,origin.y);X.lineTo(x,y);}else X.ellipse((origin.x+x)/2,(origin.y+y)/2,Math.max(.1,Math.abs(x-origin.x)/2),Math.max(.1,Math.abs(y-origin.y)/2),0,0,Math.PI*2);X.stroke();return;}
  X.beginPath();
  X.moveTo(lastX,lastY);
  X.lineTo(x,y);
  X.strokeStyle=isEraser?'#fff':curColor;
  X.lineWidth=curSize;
  X.lineCap='round';
  X.lineJoin='round';
  X.stroke();
  lastX=x;lastY=y;
}

function endDraw(){drawing=false;}

function getPos(e){
  var rect=C.getBoundingClientRect();
  var scaleX=C.width/rect.width,scaleY=C.height/rect.height;
  if(e.touches){return{x:(e.touches[0].clientX-rect.left)*scaleX,y:(e.touches[0].clientY-rect.top)*scaleY};}
  return{x:(e.clientX-rect.left)*scaleX,y:(e.clientY-rect.top)*scaleY};
}

C.style.touchAction='none';
let activePointer=null;
C.addEventListener('pointerdown',function(e){if(activePointer!==null)return;e.preventDefault();activePointer=e.pointerId;C.setPointerCapture(e.pointerId);const p=getPos(e);startDraw(p.x,p.y);});
C.addEventListener('pointermove',function(e){if(e.pointerId!==activePointer)return;const p=getPos(e);moveDraw(p.x,p.y);});
function releasePointer(e){if(e.pointerId!==activePointer)return;endDraw();activePointer=null;}
C.addEventListener('lostpointercapture',releasePointer);window.addEventListener('blur',()=>{endDraw();activePointer=null;});document.addEventListener('gamepause',()=>{endDraw();activePointer=null;});C.addEventListener('pointerup',releasePointer);C.addEventListener('pointercancel',releasePointer);

function syncTools(){document.querySelectorAll('.emoji-btn').forEach(b=>{const on=stampMode&&b.dataset.e===stampEmoji;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on);});getEl('eraserBtn').classList.toggle('active',isEraser);getEl('eraserBtn').setAttribute('aria-pressed',isEraser);document.querySelectorAll('[data-shape]').forEach(b=>{const on=!isEraser&&!stampMode&&shape===b.dataset.shape;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on);});}
const extra=document.createElement('div');extra.className='toolbar';extra.innerHTML='<button id=redoBtn>やり直す</button><button data-shape=pen>ペン</button><button data-shape=line>直線</button><button data-shape=circle>丸</button><label>下絵 <select id=outline><option value="">選ぶ</option><option value=house>おうち</option><option value=flower>おはな</option><option value=fish>さかな</option></select></label><button id=expandCanvas>紙を右下に広げる</button>';C.before(extra);
getEl('redoBtn').onclick=()=>{if(!redoHistory.length)return;if(history.length>=30)history.shift();history.push(X.getImageData(0,0,C.width,C.height));const next=redoHistory.pop();C.width=next.width;C.height=next.height;X.putImageData(next,0,0);};
extra.querySelectorAll('[data-shape]').forEach(b=>b.onclick=()=>{shape=b.dataset.shape;stampMode=false;isEraser=false;syncTools();});
getEl('outline').onchange=function(){if(!this.value)return;saveState();X.save();X.strokeStyle='#a5a5aa';X.lineWidth=2;X.beginPath();const x=40,y=30;if(this.value==='house'){X.moveTo(x,y+65);X.lineTo(x+70,y);X.lineTo(x+140,y+65);X.lineTo(x+140,y+160);X.lineTo(x,y+160);X.closePath();X.rect(x+55,y+100,30,60);}else if(this.value==='flower'){for(let i=0;i<6;i++){const a=i*Math.PI/3;X.moveTo(110+Math.cos(a)*40+25,100+Math.sin(a)*40);X.arc(110+Math.cos(a)*40,100+Math.sin(a)*40,25,0,Math.PI*2);}X.moveTo(110,160);X.lineTo(110,225);}else{X.ellipse(120,110,65,40,0,0,Math.PI*2);X.moveTo(55,110);X.lineTo(20,80);X.lineTo(20,140);X.closePath();}X.stroke();X.restore();getEl('speech').textContent='お題：下絵から想像して、まわりにも描いてみよう';this.value='';};
getEl('expandCanvas').onclick=()=>{if(C.width>=900||C.height>=900)return;saveState();const pixels=X.getImageData(0,0,C.width,C.height);C.width+=80;C.height+=80;X.putImageData(pixels,0,0);getEl('speech').textContent='絵のピクセルを保って右と下を80ずつ拡張。画面表示は紙全体に合わせます';};syncTools();
})();


(function(){
const {requestAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval}=GameShell.clock;
var C=document.getElementById('c');
var X=C.getContext('2d');
var COLS=10,ROWS=20,SZ=28;
C.width=COLS*SZ;C.height=ROWS*SZ;

var SHAPES=[
  [[1,1,1,1]],
  [[1,1],[1,1]],
  [[0,1,0],[1,1,1]],
  [[1,0,0],[1,1,1]],
  [[0,0,1],[1,1,1]],
  [[0,1,1],[1,1,0]],
  [[1,1,0],[0,1,1]]
];
var COLORS=['#00BCD4','#FFD740','#AB47BC','#2196F3','#FF9800','#4CAF50','#F44336'];

var board,piece,pieceX,pieceY,pieceType,score,lines,level,gameOver,dropInterval,timer,paused;

function newBoard(){
  var b=[];
  for(var r=0;r<ROWS;r++){var row=[];for(var c=0;c<COLS;c++)row.push(0);b.push(row);}
  return b;
}

var groundedMs=0,lockResets=0,gravityMs=0;const LOCK_DELAY=450,MAX_RESETS=8;
var bag=[],nextType;
function takePiece(){if(!bag.length)bag=ArcadeRules.shuffle(SHAPES.map((_,i)=>i));return bag.pop();}
function newPiece(){
  pieceType=nextType===undefined?takePiece():nextType;nextType=takePiece();
  const preview=document.getElementById('nextPiece');
  preview.setAttribute('aria-label','次のブロック '+['I','O','T','J','L','S','Z'][nextType]);
  preview.style.gridTemplateColumns='repeat('+SHAPES[nextType][0].length+',12px)';
  preview.innerHTML=SHAPES[nextType].flat().map(n=>'<i style="background:'+(n?COLORS[nextType]:'transparent')+'"></i>').join('');
  piece=JSON.parse(JSON.stringify(SHAPES[pieceType]));
  pieceX=Math.floor((COLS-piece[0].length)/2);
  pieceY=0;groundedMs=0;lockResets=0;gravityMs=0;
  if(collides(piece,pieceX,pieceY)){gameOver=true;}
}

function collides(p,px,py){
  for(var r=0;r<p.length;r++){
    for(var c=0;c<p[r].length;c++){
      if(!p[r][c])continue;
      var nx=px+c,ny=py+r;
      if(nx<0||nx>=COLS||ny>=ROWS)return true;
      if(ny>=0&&board[ny][nx])return true;
    }
  }
  return false;
}

function merge(){
  for(var r=0;r<piece.length;r++){
    for(var c=0;c<piece[r].length;c++){
      if(!piece[r][c])continue;
      var ny=pieceY+r;
      if(ny>=0&&ny<ROWS)board[ny][pieceX+c]=pieceType+1;
    }
  }
}

function clearLines(){
  var cleared=0;
  for(var r=ROWS-1;r>=0;r--){
    var full=true;
    for(var c=0;c<COLS;c++){if(!board[r][c]){full=false;break;}}
    if(full){
      board.splice(r,1);
      var row=[];for(var c=0;c<COLS;c++)row.push(0);
      board.unshift(row);
      cleared++;r++;
    }
  }
  if(cleared>0){
    var pts=[0,100,300,500,800];
    score+=pts[cleared]*level;
    lines+=cleared;
    level=Math.floor(lines/10)+1;
    dropInterval=Math.max(100,1000-level*80);
    updateInfo();
  }
}

function rotate(){
  var rows=piece.length,cols=piece[0].length;
  var rot=[];
  for(var c=0;c<cols;c++){var row=[];for(var r=rows-1;r>=0;r--)row.push(piece[r][c]);rot.push(row);}
  for(const [dx,dy] of [[0,0],[-1,0],[1,0],[-2,0],[2,0],[-3,0],[3,0],[0,-1],[0,-2]]){if(!collides(rot,pieceX+dx,pieceY+dy)){const grounded=collides(piece,pieceX,pieceY+1);piece=rot;pieceX+=dx;pieceY+=dy;resetLock(grounded);return;}}
}
function resetLock(grounded){if(grounded&&lockResets<MAX_RESETS){groundedMs=0;lockResets++;}}
function move(dx){if(!collides(piece,pieceX+dx,pieceY)){const grounded=collides(piece,pieceX,pieceY+1);pieceX+=dx;resetLock(grounded);}}
function drop(){if(!collides(piece,pieceX,pieceY+1)){pieceY++;return true;}return false;}
function tick(){if(paused||gameOver)return;gravityMs+=16; if(gravityMs>=dropInterval){gravityMs-=dropInterval;drop();}
 if(collides(piece,pieceX,pieceY+1)){groundedMs+=16;if(groundedMs>=LOCK_DELAY){merge();clearLines();newPiece();checkLevel();}}else if(lockResets<MAX_RESETS)groundedMs=0;
 if(gameOver){clearInterval(timer);showOverlay('ゲームオーバー','スコア: '+score+' / ライン: '+lines);}draw();}

function hardDrop(){
  while(!collides(piece,pieceX,pieceY+1))pieceY++;
  merge();clearLines();newPiece();checkLevel();
}

function draw(){
  if(!board){board=newBoard();gameOver=true;}
  X.clearRect(0,0,C.width,C.height);
  // Grid
  X.strokeStyle='rgba(255,255,255,0.04)';
  for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++){X.strokeRect(c*SZ,r*SZ,SZ,SZ);}
  // Board
  for(var r=0;r<ROWS;r++){
    for(var c=0;c<COLS;c++){
      if(board[r][c]){
        X.fillStyle=COLORS[board[r][c]-1];
        X.fillRect(c*SZ+1,r*SZ+1,SZ-2,SZ-2);
        X.fillStyle='rgba(255,255,255,0.15)';
        X.fillRect(c*SZ+1,r*SZ+1,SZ-2,3);
      }
    }
  }
  // Ghost
  if(!gameOver){
    var gy=pieceY;
    while(!collides(piece,pieceX,gy+1))gy++;
    X.globalAlpha=0.2;
    for(var r=0;r<piece.length;r++){
      for(var c=0;c<piece[r].length;c++){
        if(piece[r][c]){
          X.fillStyle=COLORS[pieceType];
          X.fillRect((pieceX+c)*SZ+1,(gy+r)*SZ+1,SZ-2,SZ-2);
        }
      }
    }
    X.globalAlpha=1;
    // Current piece
    for(var r=0;r<piece.length;r++){
      for(var c=0;c<piece[r].length;c++){
        if(piece[r][c]){
          X.fillStyle=COLORS[pieceType];
          X.fillRect((pieceX+c)*SZ+1,(pieceY+r)*SZ+1,SZ-2,SZ-2);
          X.fillStyle='rgba(255,255,255,0.2)';
          X.fillRect((pieceX+c)*SZ+1,(pieceY+r)*SZ+1,SZ-2,3);
        }
      }
    }
  }
}

function updateInfo(){
  document.getElementById('sc').textContent=score;
  document.getElementById('ln').textContent=lines;
  document.getElementById('lv').textContent=level;
}

function showOverlay(title,msg){
  var ov=document.getElementById('overlay');
  ov.querySelector('h2').textContent=title;
  ov.querySelector('p').textContent=msg;
  ov.classList.remove('hidden');
}

function startGame(){
  GameShell.beginRound();
  bag=[];nextType=undefined;board=newBoard();score=0;lines=0;level=1;gameOver=false;
  dropInterval=1000;paused=false;lastLevel=1;
  updateInfo();
  newPiece();
  document.getElementById('overlay').classList.add('hidden');
  clearInterval(timer);
  timer=setInterval(tick,16);draw();
}
var lastLevel=1;
function checkLevel(){lastLevel=level;}

// Controls
document.getElementById('bl').addEventListener('click',function(){if(!gameOver){move(-1);draw();}});
document.getElementById('br').addEventListener('click',function(){if(!gameOver){move(1);draw();}});
document.getElementById('bd').addEventListener('click',function(){if(!gameOver){drop();checkLevel();if(gameOver){clearInterval(timer);showOverlay('ゲームオーバー😢','スコア: '+score+' / ライン: '+lines);}draw();}});
document.getElementById('brot').addEventListener('click',function(){if(!gameOver){rotate();draw();}});
document.getElementById('bdrop').addEventListener('click',function(){if(!gameOver){hardDrop();checkLevel();if(gameOver){clearInterval(timer);showOverlay('ゲームオーバー😢','スコア: '+score+' / ライン: '+lines);}draw();}});
document.getElementById('startBtn').addEventListener('click',startGame);

document.addEventListener('keydown',function(e){
  if(gameOver)return;
  if(e.key==='ArrowLeft'){e.preventDefault();move(-1);draw();}
  else if(e.key==='ArrowRight'){e.preventDefault();move(1);draw();}
  else if(e.key==='ArrowDown'){e.preventDefault();drop();checkLevel();if(gameOver){clearInterval(timer);showOverlay('ゲームオーバー😢','スコア: '+score+' / ライン: '+lines);}draw();}
  else if(e.key==='ArrowUp'||e.key===' '){e.preventDefault();rotate();draw();}
  else if(e.key==='Enter'){e.preventDefault();hardDrop();checkLevel();if(gameOver){clearInterval(timer);showOverlay('ゲームオーバー😢','スコア: '+score+' / ライン: '+lines);}draw();}
});

// Touch swipe
var tx=0,ty=0;
C.addEventListener('touchstart',function(e){e.preventDefault();var t=e.touches[0];tx=t.clientX;ty=t.clientY;},{passive:false});
C.addEventListener('touchend',function(e){
  e.preventDefault();
  if(gameOver)return;
  var t=e.changedTouches[0];
  var dx=t.clientX-tx,dy=t.clientY-ty;
  if(Math.abs(dx)<10&&Math.abs(dy)<10){rotate();draw();return;}
  if(Math.abs(dx)>Math.abs(dy)){
    if(dx>0)move(1);else move(-1);
  }else{
    if(dy>0){drop();checkLevel();if(gameOver){clearInterval(timer);showOverlay('ゲームオーバー😢','スコア: '+score+' / ライン: '+lines);}}
  }
  draw();
},{passive:false});

draw();
})();

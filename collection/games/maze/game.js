
(function(){
const {requestAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval}=GameShell.clock;
var C=document.getElementById('c');
var X=C.getContext('2d');
var maze,rows,cols,cellSz,px,py,gx,gy,steps,startTime,timerInterval,won;
var treasures=[],collected=0,treasureTotal=0;
var shortest=0,hints=0,hintCell=null;
var difficulty=0; // 0=easy,1=medium,2=hard
var sizes=[[9,9],[13,13],[19,15]];

function generate(r,c){
  // Create grid: 0=wall, 1=path
  var grid=[];
  for(var i=0;i<r;i++){var row=[];for(var j=0;j<c;j++)row.push(0);grid.push(row);}
  // DFS maze generation
  function carve(y,x){
    grid[y][x]=1;
    var dirs=[[0,-2],[0,2],[-2,0],[2,0]];
    // Shuffle
    for(var i=dirs.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=dirs[i];dirs[i]=dirs[j];dirs[j]=t;}
    for(var d=0;d<dirs.length;d++){
      var ny=y+dirs[d][0],nx=x+dirs[d][1];
      if(ny>0&&ny<r-1&&nx>0&&nx<c-1&&!grid[ny][nx]){
        grid[y+dirs[d][0]/2][x+dirs[d][1]/2]=1;
        carve(ny,nx);
      }
    }
  }
  carve(1,1);
  return grid;
}

function initGame(){
  GameShell.beginRound();
  var sz=sizes[difficulty];
  cols=sz[0];rows=sz[1];
  // Make sure odd
  if(cols%2===0)cols++;if(rows%2===0)rows++;
  for(let attempt=0;attempt<32;attempt++){maze=generate(rows,cols);const direct=new Set(ArcadeRules.path(maze,[1,1],[cols-2,rows-2]).map(p=>p.join(',')));if(maze.some((row,y)=>row.some((n,x)=>n&&!direct.has(x+','+y))))break;if(attempt===31){maze=Array.from({length:rows},()=>Array(cols).fill(0));for(let y=1;y<rows-1;y++)maze[y][1]=1;for(let x=1;x<cols-1;x++)maze[rows-2][x]=1;for(let x=3;x<cols-1;x+=2)for(let y=1;y<rows-2;y++)maze[y][x]=1;}}
  // Start and goal
  px=1;py=1;
  gx=cols-2;gy=rows-2;
  maze[gy][gx]=1;
  steps=0;won=false;hints=0;hintCell=null;shortest=ArcadeRules.path(maze,[1,1],[gx,gy]).length-1;
  const direct=new Set(ArcadeRules.path(maze,[1,1],[gx,gy]).map(p=>p.join(',')));const branches=[];
  for(let y=1;y<rows-1;y++)for(let x=1;x<cols-1;x++)if(maze[y][x]&&!direct.has(x+','+y)&&[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>maze[y+dy]?.[x+dx]).length===1)branches.push([x,y]);
  treasures=branches.slice(0,3);collected=0;treasureTotal=treasures.length;
  // Size canvas
  cellSz=Math.min(Math.floor(340/cols),Math.floor(340/rows),32);
  C.width=cols*cellSz;C.height=rows*cellSz;
  document.getElementById('steps').textContent='0';
  document.getElementById('msg').textContent='出口へ最短 '+shortest+'歩 / 寄り道の木の実 '+treasureTotal+'個（任意）';document.getElementById('hintBtn').disabled=false;
  clearInterval(timerInterval);
  startTime=GameShell.now();
  document.getElementById('timer').textContent='0';
  timerInterval=setInterval(function(){
    if(!won)document.getElementById('timer').textContent=Math.floor((GameShell.now()-startTime)/1000);
  },500);
  draw();
}

function draw(){
  X.clearRect(0,0,C.width,C.height);
  var s=cellSz;
  for(var r=0;r<rows;r++){
    for(var c=0;c<cols;c++){
      if(maze[r][c]===0){
        X.fillStyle='#4CAF50';
      }else{
        X.fillStyle='#FFFDE7';
      }
      X.fillRect(c*s,r*s,s,s);
    }
  }
  if(hintCell){X.fillStyle='#ffc84a';X.fillRect(hintCell[0]*s+2,hintCell[1]*s+2,s-4,s-4);}
  X.fillStyle='#885127';for(const [x,y] of treasures){X.beginPath();X.arc((x+.5)*s,(y+.5)*s,s*.24,0,Math.PI*2);X.fill();}
  // Goal
  X.font=(s-4)+'px serif';
  X.textAlign='center';X.textBaseline='middle';
  X.fillText('⭐',gx*s+s/2,gy*s+s/2);
  // Player
  ArcadeArt.draw(X,px*s+s/2,py*s+s/2,parseFloat(X.font.replace('bold ','')));
}

function movePlayer(dx,dy){
  if(won)return;
  var nx=px+dx,ny=py+dy;
  if(nx<0||nx>=cols||ny<0||ny>=rows)return;
  if(maze[ny][nx]===0)return;
  px=nx;py=ny;steps++;hintCell=null;const ti=treasures.findIndex(([x,y])=>x===px&&y===py);if(ti>=0){treasures.splice(ti,1);collected++;GameShell.feedback?.(true);document.getElementById('msg').textContent='木の実 '+collected+'/'+treasureTotal+'個。いつでも出口へ進めます';}
  document.getElementById('steps').textContent=steps;
  draw();
  if(px===gx&&py===gy){
    won=true;
    clearInterval(timerInterval);
    var time=Math.floor((GameShell.now()-startTime)/1000);
    document.getElementById('msg').textContent='🎉 ゴール！ '+steps+'歩 / '+time+'秒 / 最短 '+shortest+'歩 / ヒント '+hints+'回 / 木の実 '+collected+'/'+treasureTotal;
  }
}

// Controls
document.getElementById('mu').addEventListener('click',function(){movePlayer(0,-1);});
document.getElementById('md').addEventListener('click',function(){movePlayer(0,1);});
document.getElementById('ml').addEventListener('click',function(){movePlayer(-1,0);});
document.getElementById('mr').addEventListener('click',function(){movePlayer(1,0);});

document.addEventListener('keydown',function(e){
  if(e.key==='ArrowUp'){e.preventDefault();movePlayer(0,-1);}
  else if(e.key==='ArrowDown'){e.preventDefault();movePlayer(0,1);}
  else if(e.key==='ArrowLeft'){e.preventDefault();movePlayer(-1,0);}
  else if(e.key==='ArrowRight'){e.preventDefault();movePlayer(1,0);}
});

// Touch swipe on canvas
var tx=0,ty=0;
C.addEventListener('touchstart',function(e){e.preventDefault();tx=e.touches[0].clientX;ty=e.touches[0].clientY;},{passive:false});
C.addEventListener('touchend',function(e){
  e.preventDefault();
  var dx=e.changedTouches[0].clientX-tx,dy=e.changedTouches[0].clientY-ty;
  if(Math.abs(dx)<10&&Math.abs(dy)<10)return;
  if(Math.abs(dx)>Math.abs(dy)){movePlayer(dx>0?1:-1,0);}
  else{movePlayer(0,dy>0?1:-1);}
},{passive:false});

// Size buttons
var btns=[document.getElementById('s1'),document.getElementById('s2'),document.getElementById('s3')];
for(var i=0;i<3;i++){
  (function(idx){
    btns[idx].addEventListener('click',function(){
      for(var j=0;j<3;j++)btns[j].classList.remove('active');
      btns[idx].classList.add('active');
      difficulty=idx;
      initGame();
    });
  })(i);
}

document.getElementById('hintBtn').onclick=function(){if(won||hints>=3)return;hintCell=ArcadeRules.path(maze,[px,py],[gx,gy])[1];hints++;this.disabled=hints>=3;document.getElementById('msg').textContent='黄色のマスへ！ 残りヒント '+(3-hints)+'回';draw();};
document.getElementById('newMaze').onclick=initGame;
initGame();
ArcadeArt.ready().then(draw).catch(()=>{});
})();


(function(){
var puzzleMode=false,puzzleIdx=0;const puzzles=[{b:[1,1,0,2,2,0,0,0,0],answer:2,text:"あと一手で勝つ",why:"上の横一列が○でそろう"},{b:[2,2,0,1,0,0,0,1,0],answer:2,text:"相手のリーチを止める",why:"上の横一列の×を右上で止める"},{b:[1,2,0,0,1,2,0,0,0],answer:8,text:"あと一手で勝つ",why:"左上から右下の斜めが○でそろう"},{b:[2,1,0,0,2,1,0,0,0],answer:8,text:"相手のリーチを止める",why:"左上から右下の斜めの×を止める"}];
var board,turn,over,difficulty,winYou,winMt,draws;
winYou=0;winMt=0;draws=0;difficulty='easy';var firstPlayer=1;

function getEl(id){return document.getElementById(id);}

function init(){
  GameShell.beginRound();puzzleMode=false;
  board=[0,0,0,0,0,0,0,0,0]; // 0=empty,1=player(O),2=AI(X)
  turn=firstPlayer;over=false;
  getEl('resetBtn').style.display='none';
  getEl('status').textContent='あなたのばんだよ！⭕';
  getEl('speech').textContent='じゃあ先にどうぞ〜🤖';
  renderBoard();
  if(firstPlayer===2){getEl('status').textContent='ノヴァが先手です';setTimeout(aiMove,450);}
}

function renderBoard(){
  const focused=document.activeElement;const restore=focused?.closest('#board')?{i:focused.dataset.i,r:focused.dataset.r,c:focused.dataset.c}:null;

  var html='';
  for(var i=0;i<9;i++){
    var txt='';
    if(board[i]===1)txt='⭕';
    else if(board[i]===2)txt='❌';
    var cls='cell';
    if(over||board[i])cls+=' disabled';
    html+='<div class="'+cls+'" data-i="'+i+'">'+txt+'</div>';
  }
  getEl('board').innerHTML=html;
  var cells=document.querySelectorAll('.cell');
  for(var i=0;i<cells.length;i++){
    cells[i].addEventListener('click',function(){
      if(over||turn!==1)return;
      var idx=parseInt(this.getAttribute('data-i'));
      if(board[idx])return;
      makeMove(idx,1);
    });
  }
  if(restore){const selector=restore.i!==undefined?'[data-i=\"'+restore.i+'\"]':'[data-r=\"'+restore.r+'\"][data-c=\"'+restore.c+'\"]';const target=getEl('board').querySelector(selector);if(target){target.tabIndex=0;target.focus({preventScroll:true});}}

}

function makeMove(idx,player){
  if(puzzleMode){const p=puzzles[puzzleIdx];getEl('speech').textContent=idx===p.answer?'正解！ '+p.why:'もう一度。'+p.text+'手を探そう';if(idx===p.answer){board[idx]=1;over=true;renderBoard();getEl('status').textContent='問題 '+(puzzleIdx+1)+'/4 クリア';}return;}
  board[idx]=player;
  renderBoard();
  var w=checkWin();
  if(w){
    over=true;
    highlightWin(w);
    if(player===1){
      winYou++;
      getEl('status').textContent='🎉 あなたの勝ち！';
      var msgs=['えぇ〜負けちゃった😢','つよいね〜！🤖💦','くやしい！😣'];
      getEl('speech').textContent=msgs[Math.floor(Math.random()*msgs.length)];
    }else{
      winMt++;
      getEl('status').textContent='❌ ノヴァの勝ち！';
      var msgs2=['えへへ〜勝っちゃった！🤖✨','ノヴァつよいでしょ！😄','やった〜！💖'];
      getEl('speech').textContent=msgs2[Math.floor(Math.random()*msgs2.length)];
    }
    updateScore();
    getEl('resetBtn').style.display='inline-block';
    return;
  }
  if(board.indexOf(0)===-1){
    over=true;draws++;
    getEl('status').textContent='🤝 ひきわけ！';
    getEl('speech').textContent='おんなじくらいの強さだね〜🤖';
    updateScore();
    getEl('resetBtn').style.display='inline-block';
    return;
  }
  if(player===1){
    turn=2;
    getEl('status').textContent='ノヴァが考え中…🤖';
    setTimeout(function(){aiMove();},400+Math.random()*400);
  }
}

function aiMove(){
  if(over||turn!==2)return;
  var idx;
  if(difficulty==='hard'){
    idx=bestMove();
  }else{
    // Easy: 70% random, 30% smart
    if(Math.random()<0.7){
      var empty=[];
      for(var i=0;i<9;i++)if(!board[i])empty.push(i);
      idx=empty[Math.floor(Math.random()*empty.length)];
    }else{
      idx=bestMove();
    }
  }
  turn=1;
  makeMove(idx,2);
  if(!over){
    getEl('status').textContent='あなたのばんだよ！⭕';
    var hints=['どこに置く〜？🤖','うーん、どうくる？','がんばって〜！✨'];
    getEl('speech').textContent=hints[Math.floor(Math.random()*hints.length)];
  }
}

function bestMove(){
  // Minimax
  var bestScore=-Infinity,bestIdx=0;
  for(var i=0;i<9;i++){
    if(board[i])continue;
    board[i]=2;
    var s=minimax(board,0,false);
    board[i]=0;
    if(s>bestScore){bestScore=s;bestIdx=i;}
  }
  return bestIdx;
}

function minimax(b,depth,isMax){
  var w=checkWinBoard(b);
  if(w===2)return 10-depth;
  if(w===1)return depth-10;
  if(b.indexOf(0)===-1)return 0;
  if(isMax){
    var best=-Infinity;
    for(var i=0;i<9;i++){
      if(b[i])continue;b[i]=2;
      best=Math.max(best,minimax(b,depth+1,false));
      b[i]=0;
    }
    return best;
  }else{
    var best=Infinity;
    for(var i=0;i<9;i++){
      if(b[i])continue;b[i]=1;
      best=Math.min(best,minimax(b,depth+1,true));
      b[i]=0;
    }
    return best;
  }
}

var WIN_LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function checkWin(){
  for(var i=0;i<WIN_LINES.length;i++){
    var l=WIN_LINES[i];
    if(board[l[0]]&&board[l[0]]===board[l[1]]&&board[l[1]]===board[l[2]])return l;
  }
  return null;
}

function checkWinBoard(b){
  for(var i=0;i<WIN_LINES.length;i++){
    var l=WIN_LINES[i];
    if(b[l[0]]&&b[l[0]]===b[l[1]]&&b[l[1]]===b[l[2]])return b[l[0]];
  }
  return 0;
}

function highlightWin(line){
  var cells=document.querySelectorAll('.cell');
  for(var i=0;i<line.length;i++){cells[line[i]].classList.add('win-cell');}
}

function updateScore(){
  getEl('sYou').textContent=winYou;
  getEl('sMt').textContent=winMt;
  getEl('sDr').textContent=draws;
}

const pb=document.createElement('button');pb.id='puzzleBtn';pb.textContent='詰め問題 / 次の問題';getEl('board').before(pb);pb.onclick=()=>{GameShell.beginRound();if(puzzleMode)puzzleIdx=(puzzleIdx+1)%puzzles.length;puzzleMode=true;board=puzzles[puzzleIdx].b.slice();turn=1;over=false;getEl('status').textContent=puzzles[puzzleIdx].text;getEl('speech').textContent='あなたは○。正解の1マスを選ぼう';renderBoard();};
getEl('resetBtn').addEventListener('click',init);
getEl('dEasy').addEventListener('click',function(){
  difficulty='easy';
  getEl('dEasy').classList.add('active');
  getEl('dHard').classList.remove('active');
  init();
});
getEl('dHard').addEventListener('click',function(){
  difficulty='hard';
  getEl('dHard').classList.add('active');
  getEl('dEasy').classList.remove('active');
  init();
});

getEl('firstPlayer').onchange=function(){firstPlayer=Number(this.value);init();};
init();
})();


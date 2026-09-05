
(function(){
// 4x4 Sudoku (numbers 1-4)
var SIZE=4,notes={},memoMode=false,lateCheck=false,checked=false;
var solution,puzzle,userBoard,given,selected,errorCount,difficulty;
difficulty=0;

function getEl(id){return document.getElementById(id);}

function generate(){
  GameShell.beginRound();notes={};checked=false;lateCheck=!!getEl('lateCheck')?.checked;
  // Generate a valid 4x4 grid
  var grid=[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
  function isValid(g,r,c,n){
    for(var i=0;i<4;i++){if(g[r][i]===n||g[i][c]===n)return false;}
    var br=Math.floor(r/2)*2,bc=Math.floor(c/2)*2;
    for(var i=br;i<br+2;i++)for(var j=bc;j<bc+2;j++){if(g[i][j]===n)return false;}
    return true;
  }
  function solve(g){
    for(var r=0;r<4;r++){
      for(var c=0;c<4;c++){
        if(g[r][c]===0){
          var nums=[1,2,3,4];
          for(var i=nums.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=nums[i];nums[i]=nums[j];nums[j]=t;}
          for(var k=0;k<4;k++){
            if(isValid(g,r,c,nums[k])){g[r][c]=nums[k];if(solve(g))return true;g[r][c]=0;}
          }
          return false;
        }
      }
    }
    return true;
  }
  solve(grid);
  solution=grid.map(function(r){return r.slice();});

  // Remove cells based on difficulty
  var blanks=[4,7,10][difficulty];
  var cells=[];
  for(var i=0;i<16;i++)cells.push(i);
  for(var i=cells.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=cells[i];cells[i]=cells[j];cells[j]=t;}

  for(let attempt=0;attempt<64;attempt++){puzzle=ArcadeRules.makePuzzle(solution,blanks);if(ArcadeRules.sudokuReasonLevel(puzzle)===difficulty)break;}
  // Some completed grids cannot yield the requested reasoning profile. Fall back
  // to a verified unique template with a randomized digit permutation, never mislabel it.
  if(ArcadeRules.sudokuReasonLevel(puzzle)!==difficulty){const digits=solution[0].slice(),base=[[1,2,3,4],[3,4,1,2],[2,1,4,3],[4,3,2,1]],templates=[[[1,2,0,4],[3,0,1,2],[2,1,4,0],[0,3,2,1]],[[1,2,3,4],[3,0,1,0],[2,0,4,0],[0,3,0,0]],[[0,0,0,4],[0,0,1,0],[0,1,0,0],[0,3,2,1]]];solution=base.map(row=>row.map(n=>digits[n-1]));puzzle=templates[difficulty].map(row=>row.map(n=>n?digits[n-1]:0));}
  userBoard=puzzle.map(function(r){return r.slice();});
  given=[];
  for(var r=0;r<4;r++){
    var row=[];
    for(var c=0;c<4;c++)row.push(puzzle[r][c]!==0);
    given.push(row);
  }
  selected=null;errorCount=0;
  getEl('errors').textContent='0';
  getEl('newBtn').style.display='none';
  getEl('speech').textContent='この問題の推論：'+['まず行を見る','行と列を組み合わせる','行・列・2×2の四角を組み合わせる','候補を比べて考える'][ArcadeRules.sudokuReasonLevel(puzzle)]+'。候補メモも使えるよ';
  updateRemain();
  render();
}

function updateRemain(){
  var rem=0;
  for(var r=0;r<4;r++)for(var c=0;c<4;c++){if(userBoard[r][c]===0)rem++;}
  getEl('remain').textContent=rem;
}

function render(){
  const focused=document.activeElement;const restore=focused?.closest('#board')?{i:focused.dataset.i,r:focused.dataset.r,c:focused.dataset.c}:null;

  var html='';
  for(var r=0;r<4;r++){
    for(var c=0;c<4;c++){
      var val=userBoard[r][c];
      var cls='cell';
      if(given[r][c])cls+=' given';
      if(selected&&selected[0]===r&&selected[1]===c)cls+=' selected';
      if((!lateCheck||checked)&&val&&!given[r][c]&&val!==solution[r][c])cls+=' error';
      html+='<div class="'+cls+'" data-r="'+r+'" data-c="'+c+'">'+(val||'<small style="font-size:14px">'+(notes[r+','+c]||[]).join(' ')+'</small>')+'</div>';
    }
  }
  getEl('board').innerHTML=html;

  var cells=document.querySelectorAll('.cell');
  for(var i=0;i<cells.length;i++){
    cells[i].addEventListener('click',function(){
      var r=parseInt(this.getAttribute('data-r'));
      var c=parseInt(this.getAttribute('data-c'));
      if(given[r][c])return;
      selected=[r,c];
      render();
    });
  }
  if(restore){const selector=restore.i!==undefined?'[data-i=\"'+restore.i+'\"]':'[data-r=\"'+restore.r+'\"][data-c=\"'+restore.c+'\"]';const target=getEl('board').querySelector(selector);if(target){target.tabIndex=0;target.focus({preventScroll:true});}}

}

function placeNumber(n){
  if(!selected)return;
  var r=selected[0],c=selected[1];
  if(given[r][c])return;
  if(memoMode&&n){if(userBoard[r][c])return;const k=r+','+c,a=notes[k]||[];notes[k]=a.includes(n)?a.filter(v=>v!==n):[...a,n].sort();render();return;}
  if(userBoard[r][c]===n)return;
  userBoard[r][c]=n;
  checked=false;delete notes[r+','+c];
  if(!lateCheck&&n!==0&&n!==solution[r][c]){
    errorCount++;
    getEl('errors').textContent=errorCount;
    var msgs=['あれれ〜ちがうよ〜💦','うーん、それじゃないかも🤖','もういっかいかんがえてみて〜！'];
    getEl('speech').textContent=msgs[Math.floor(Math.random()*msgs.length)];
  }else if(!lateCheck&&n!==0){
    var msgs2=['すご〜い！あってる！✨','やった〜！🤖💕','そのちょうし〜！'];
    getEl('speech').textContent=msgs2[Math.floor(Math.random()*msgs2.length)];
  }
  updateRemain();
  render();
  if(!lateCheck)checkComplete();
}

function checkComplete(){
  for(var r=0;r<4;r++)for(var c=0;c<4;c++){if(userBoard[r][c]!==solution[r][c])return;}
  getEl('speech').textContent='🎉 かんせい〜！すごいね！🤖✨';
  getEl('newBtn').style.display='inline-block';
  selected=null;
  // Highlight all correct
  var cells=document.querySelectorAll('.cell');
  for(var i=0;i<cells.length;i++)cells[i].classList.add('correct');
}

// Numpad
var npHtml='';
for(var i=1;i<=4;i++){npHtml+='<button class="nbtn" data-n="'+i+'">'+i+'</button>';}
npHtml+='<button class="nbtn erase" data-n="0">けす</button>';
getEl('numpad').innerHTML=npHtml;
var nbtns=document.querySelectorAll('.nbtn');
for(var i=0;i<nbtns.length;i++){
  nbtns[i].addEventListener('click',function(){
    placeNumber(parseInt(this.getAttribute('data-n')));
  });
}

// Difficulty
var dbtns=[getEl('d1'),getEl('d2'),getEl('d3')];
for(var i=0;i<3;i++){
  (function(idx){
    dbtns[idx].addEventListener('click',function(){
      for(var j=0;j<3;j++)dbtns[j].classList.remove('active');
      dbtns[idx].classList.add('active');
      difficulty=idx;
      generate();
    });
  })(i);
}

const panel=document.createElement('div');panel.className='v2-actions';panel.innerHTML='<button id="memoMode" aria-pressed="false">候補メモ OFF</button><button id="reasonHint">理由ヒント</button><label><input type="checkbox" id="lateCheck">最後に答え合わせ</label><button id="checkBoard">答え合わせ</button>';getEl('board').before(panel);
getEl('memoMode').onclick=()=>{memoMode=!memoMode;getEl('memoMode').textContent='候補メモ '+(memoMode?'ON':'OFF');getEl('memoMode').setAttribute('aria-pressed',memoMode);};getEl('lateCheck').onchange=generate;
getEl('checkBoard').onclick=()=>{checked=true;render();if(userBoard.every((row,r)=>row.every((n,c)=>n===solution[r][c])))checkComplete();else getEl('speech').textContent='赤い数字と空欄を見直そう';};
getEl('reasonHint').onclick=()=>{if(userBoard.some((row,r)=>row.some((n,c)=>n&&n!==solution[r][c]))){getEl('speech').textContent='先に入力済みの数字を見直そう。同じ行・列・四角に重複はないかな？';return;}for(let r=0;r<4;r++)for(let c=0;c<4;c++)if(!userBoard[r][c]){const ns=[1,2,3,4].filter(n=>ArcadeRules.validNumber(userBoard,r,c,n));if(ns.length===1){selected=[r,c];render();getEl('speech').textContent=(r+1)+'行'+(c+1)+'列：同じ行・列・2×2の数字を除くと '+ns[0]+' だけ残る。自分で入れてみよう';return;}}getEl('speech').textContent='各マスの候補をメモして、行・列・四角の中で1か所にしか入らない数字を探そう';};
getEl('newBtn').addEventListener('click',generate);
generate();
})();


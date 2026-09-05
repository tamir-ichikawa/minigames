
const ENEMIES=[
  {name:'スライム',emoji:'🟢',hp:40,atk:8,pattern:[1,1,.5],desc:'ぷるぷるスライム'},
  {name:'コウモリ',emoji:'🦇',hp:50,atk:10,pattern:[.5,1.5,0],desc:'やみのコウモリ'},
  {name:'おばけ',emoji:'👻',hp:55,atk:12,pattern:[0,2,1],desc:'いたずらおばけ'},
  {name:'ドラゴン',emoji:'🐉',hp:70,atk:14,pattern:[1,0,2],desc:'ちいさなドラゴン'},
  {name:'まおう',emoji:'😈',hp:90,atk:16,pattern:[1,2,0,1.5],desc:'やみのまおう'}
];

const CARDS=[
  {id:'atk1',icon:'⚔️',name:'こうげき',desc:'次の攻撃を+8' ,type:'attack',power:15},
  {id:'atk2',icon:'🔥',name:'ファイア',desc:'強いが自分も3ダメージ',type:'attack',power:20},
  {id:'heal',icon:'💚',name:'ヒール',desc:'HPを回復するよ',type:'heal',power:25},
  {id:'shield',icon:'🛡️',name:'シールド',desc:'次の攻撃を75%軽減！',type:'shield',power:0},
  {id:'special',icon:'⭐',name:'スペシャル',desc:'大ダメージ！敵ごとに1回',type:'special',power:35},
  {id:'atk3',icon:'⚡',name:'サンダー',desc:'今回の敵攻撃を半分に',type:'attack',power:18},
  {id:'heal2',icon:'🌸',name:'さくらヒール',desc:'ちょっと回復♪',type:'heal',power:18},
];

let enemyIntent=0,attackBonus=0,healBonus=0,charge=0,weakened=false,growing=false;
let playerHP,playerMaxHP=100,enemyHP,enemyMaxHP,round,shielded,specialUsed,enemyIdx,playing;

function $(id){return document.getElementById(id)}

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
  $(id).classList.remove('hidden');
}

function startGame(){
  GameShell.beginRound();
  playerMaxHP=100;attackBonus=0;healBonus=0;charge=0;growing=false;playerHP=playerMaxHP;round=0;enemyIdx=0;specialUsed=false;shielded=false;playing=true;
  showScreen('battle-screen');
  setupEnemy();
}

function setupEnemy(){
  let e=ENEMIES[enemyIdx];
  round=0;charge=0;enemyIntent=e.atk;
  enemyHP=e.hp;enemyMaxHP=e.hp;
  $('eName').textContent=e.emoji+' '+e.name;
  $('eChar').textContent=e.emoji;
  $('roundInfo').textContent='ラウンド '+(enemyIdx+1)+'/'+ENEMIES.length;
  $('msg').textContent=e.desc+'が あらわれた！';
  updateBars();
  dealHand();
}

function dealHand(){
  let hand=[];
  // Always include at least one attack
  let pool=[...CARDS];
  // Remove special if used
  if(specialUsed)pool=pool.filter(c=>c.type!=='special');
  // Pick 3 random cards, ensure at least 1 attack
  let atks=pool.filter(c=>c.type==='attack');
  let others=pool.filter(c=>c.type!=='attack');
  hand.push(atks[Math.floor(Math.random()*atks.length)]);
  let remaining=[...atks,...others].filter(c=>c!==hand[0]);
  enemyIntent=Math.round(ENEMIES[enemyIdx].atk*ENEMIES[enemyIdx].pattern[round%ENEMIES[enemyIdx].pattern.length]);
  const danger=enemyIntent>=ENEMIES[enemyIdx].atk*1.5;
  const support=remaining.filter(c=>danger?c.type==='shield':playerHP<65?c.type==='heal':c.type==='shield'||c.type==='heal');
  hand.push(playerHP<65&&!danger?support.sort((a,b)=>b.power-a.power)[0]:support[Math.floor(Math.random()*support.length)]);remaining=remaining.filter(c=>c!==hand[1]);
  for(let i=0;i<1;i++){
    let pick=remaining[Math.floor(Math.random()*remaining.length)];
    hand.push(pick);
    remaining=remaining.filter(c=>c!==pick);
  }

  $('intent').textContent=(enemyIntent===0?'反撃のチャンス':danger?'⚠ 大きな攻撃':'次の攻撃')+'：'+enemyIntent+' ダメージ';
  renderHand(hand);
}

function renderHand(hand){
  let h=$('hand');h.innerHTML='';
  hand.forEach(c=>{
    let div=document.createElement('div');
    div.className='card';
    div.innerHTML=`<div class="icon">${c.icon}</div><div class="name">${c.name}</div><div class="desc">${c.desc}</div><div class="pwr">${c.type==='attack'||c.type==='special'?'ダメージ: '+(c.power+attackBonus+charge):c.type==='heal'?'回復: '+(c.power+healBonus):'防御 75%'}</div>`;
    div.onclick=()=>{if(playing)playCard(c)};
    h.appendChild(div);
  });
}

function playCard(card){
  if(!playing)return;playing=false;
  GameShell.feedback(true);let msg='';
  // Player action
  if(card.type==='attack'||card.type==='special'){
    let dmg=card.power+attackBonus+charge;charge=card.id==='atk1'?8:0;weakened=card.id==='atk3';if(card.id==='atk2')playerHP=Math.max(1,playerHP-3);
    enemyHP=Math.max(0,enemyHP-dmg);
    msg='騎士ルクの'+card.name+'！ '+dmg+'ダメージ！';
    shakeChar('eChar');showDmg(dmg,false);
    if(card.type==='special')specialUsed=true;
  }else if(card.type==='heal'){
    let heal=Math.min(card.power+healBonus,playerMaxHP-playerHP);
    playerHP=Math.min(playerMaxHP,playerHP+heal);
    msg='騎士ルクは'+heal+'HP回復した！💚';
    showDmg(heal,true,true);
  }else if(card.type==='shield'){
    shielded=true;
    msg='騎士ルクはシールドをはった！🛡️';
  }
  $('msg').textContent=msg;
  updateBars();

  if(enemyHP<=0){
    setTimeout(()=>{
      enemyIdx++;
      if(enemyIdx>=ENEMIES.length){
        showResult(true);
      }else{
        $('msg').textContent=ENEMIES[enemyIdx-1].name+'をたおした！✨';
        setTimeout(showGrowth,650);
      }
    },800);
    return;
  }

  // Enemy turn
  setTimeout(()=>{
    let e=ENEMIES[enemyIdx];
    let eatk=weakened?Math.floor(enemyIntent/2):enemyIntent;weakened=false;round++;
    if(shielded){eatk=Math.floor(eatk*.25);shielded=false;msg=e.name+'のこうげき！シールドで'+eatk+'に軽減！🛡️'}
    else{msg=e.name+'のこうげき！ '+eatk+'ダメージ！'}
    playerHP=Math.max(0,playerHP-eatk);
    shakeChar('pChar');showDmg(eatk,false,true);
    $('msg').textContent=msg;
    updateBars();

    if(playerHP<=0){
      setTimeout(()=>showResult(false),800);
      return;
    }
    setTimeout(()=>{$('msg').textContent='カードをえらんでね！';dealHand();playing=true},650);
  },650);
}

function shakeChar(id){
  let el=$(id);el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake');
}

function showDmg(val,isHeal,isPlayer){
  let d=document.createElement('div');
  d.className='dmg'+(isHeal?' heal-txt':'');
  d.textContent=(isHeal?'+':'-')+val;
  let arena=$('arena');
  d.style.left=isPlayer?'25%':'70%';
  d.style.top='30%';
  arena.appendChild(d);
  setTimeout(()=>d.remove(),1000);
}

function updateBars(){
  $('pBar').style.width=(playerHP/playerMaxHP*100)+'%';
  $('eBar').style.width=(enemyHP/enemyMaxHP*100)+'%';
  $('pHP').textContent=playerHP+'/'+playerMaxHP;
  $('eHP').textContent=enemyHP+'/'+enemyMaxHP;
}

function showResult(win){
  playing=false;
  showScreen('result-screen');
  if(win){
    $('resultTitle').textContent='🎉 しょうり！ 🎉';
    $('resultTitle').style.color='#FFD740';
    $('resultMsg').textContent='騎士ルクは全てのてきをたおした！すごい！🛡️✨';
  }else{
    $('resultTitle').textContent='😢 ざんねん…';
    $('resultTitle').style.color='#FF5252';
    $('resultMsg').textContent='騎士ルクはたおれてしまった…もう一回がんばろう！';
  }
}

function backToTitle(){GameShell.beginRound();playing=false;showScreen('title-screen')}

function showGrowth(){growing=true;playing=false;showScreen('battle-screen');$('intent').textContent='戦闘後の成長：1つ選ぶと次の敵へ。全選択でHPも20回復。';$('msg').textContent='最大HP / 攻撃 / 回復、どれを伸ばす？';$('hand').replaceChildren();[['最大HP +20','hp'],['攻撃 +3','attack'],['回復 +8','heal']].forEach(([label,id])=>{const b=document.createElement('button');b.className='card';b.textContent=label;b.onclick=()=>chooseGrowth(id);$('hand').append(b);});}
function chooseGrowth(id){if(!growing)return;growing=false;if(id==='hp'){playerMaxHP+=20;playerHP+=20;}else if(id==='attack')attackBonus+=3;else healBonus+=8;playerHP=Math.min(playerMaxHP,playerHP+20);specialUsed=false;shielded=false;setupEnemy();playing=true;}

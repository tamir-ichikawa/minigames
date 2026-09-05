/* Explicit renderer: does not patch the browser canvas prototype. */
(()=>{'use strict';
const id=window.GAME_CONFIG.id,url=new URL('../assets/characters/'+id+'.svg',document.currentScript.src).href;
const sprite=new Image();sprite.src=url;
window.ArcadeArt={draw(ctx,x,y,size){ctx.save();if(sprite.complete&&sprite.naturalWidth){ctx.drawImage(sprite,x-size/2,y-size/2,size,size);}else{ctx.fillStyle='#efc981';ctx.beginPath();ctx.arc(x,y,size*.35,0,Math.PI*2);ctx.fill();}ctx.restore();},ready:()=>sprite.decode(),
 star(ctx,x,y,size){ctx.save();ctx.translate(x,y);ctx.fillStyle='#ffe6a0';ctx.strokeStyle='#b47530';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=size*(i%2?.23:.48);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();},
 barrier(ctx,x,y){ctx.save();ctx.translate(x,y);ctx.fillStyle='#cf8957';ctx.strokeStyle='#273e3e';ctx.lineWidth=3;ctx.fillRect(-15,-15,30,30);ctx.strokeRect(-15,-15,30,30);ctx.fillStyle='#ffdfa2';ctx.fillRect(-3,-15,6,30);ctx.restore();},
 drone(ctx,x,y,size,hp){ctx.save();ctx.translate(x,y);ctx.fillStyle=['#83cbbb','#b5a0e7','#ee9c94','#efd280'][Math.min(3,Math.max(0,Math.ceil(hp/2)-1))];ctx.strokeStyle='#d9edf3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-size/2);ctx.lineTo(size/2,0);ctx.lineTo(size*.35,size*.45);ctx.lineTo(-size*.35,size*.45);ctx.lineTo(-size/2,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#263b57';ctx.fillRect(-size*.25,-3,size*.5,6);ctx.restore();}
};
document.addEventListener('DOMContentLoaded',()=>{
 document.querySelectorAll('h1,.emoji-big,.face,#pChar,#rEmoji,#titleScreen [style*="font-size:50"],#title-screen .sub').forEach(el=>{
  if(el.matches('#rEmoji'))return;
  if(el.matches('.emoji-big')&&el.textContent.includes('✊'))return;
  if(el.matches('h1')&&document.querySelector('.emoji-big,.face,#pChar,[style*="font-size:50"]'))return;
  const img=document.createElement('img');img.src=url;img.alt='';img.className='game-character';
  if(el.matches('h1')){img.classList.add('heading-character');el.prepend(img);}else el.replaceChildren(img);
 });
 for(const el of document.querySelectorAll('#speech,#msg,#status,#mSpeech')){el.setAttribute('aria-live','polite');el.setAttribute('aria-atomic','true');}
 const c=document.querySelector('canvas');if(c)c.setAttribute('aria-label',window.GAME_CONFIG.title+'。操作設定でキーを確認できます。');
 const guides={dash:'星を拾い続けると配達コンボ。5個ごとに報酬が増えます。取り逃すとコンボが途切れ、箱に触れると終了。',shooting:'8機連続撃破で6秒間の3連ショット。被弾すると強化が解除されます。ライフは3、被弾後は1.5秒無敵。',jump:'足場では自動ジャンプ。青い足場は動き、橙の足場は一度跳ねると壊れます。画面下に落ちると終了。',flappy:'押すたび上昇。月夜の門をくぐりましょう。門の中央付近を通るとNICE FLIGHT。上下の端と柱に触れると終了。',flick:'下のカテゴリを確認して荷物を左右へ。5連続正解で20点追加。間違い・取り逃しでライフが1減ります。',tsumiki:'動く灯りを重ねます。6px以内ならぴったり判定。3連続以降は幅が回復します。重ならなければ終了。',tetris:'横一列を埋めると消えます。NEXTと薄い着地点を見て配置。10ラインごとに落下速度が上がります。',maze:'星が出口です。矢印で一歩ずつ移動。最短歩数に近づけましょう。ヒントは次の一歩を3回まで表示。',matching:'2枚めくって同じ海の仲間を探します。少ないタップで全ペアをそろえると高評価。',sudoku:'縦・横・太線の2×2に1〜4を一つずつ置きます。マスを選び数字で入力。けすボタンで取り消せます。',marubatsu:'縦・横・斜めのどれかに3個並べると勝ち。強い相手には引き分けも立派な結果です。',machigai:'上が見本、下が鑑定対象。異なる模様だけを選び、全10ステージを目指します。空振りは5点減点。',anzan:'15問。5問ごとに計算の段階が上がります。連続正解で追加点。時間制限なしの練習も選べます。',karuta:'文章に合う絵札を一つ選びます。全10問。正解数で評価し、通常モードは速さがスコアに加わります。',shiritori:'表示された文字から始まる言葉を選びます。10回つながればクリア。読み仮名をよく見ましょう。',typing:'表示された言葉と同じ文字を入力。ひらがなはIME入力、または画面のキーで入力できます。全10問を正解数で評価。',card_battle:'5体の敵を倒す旅。攻撃予告を見て手札を選びます。3手ごとの強攻撃にはシールドが有効。敵を倒すとHP20回復。',janken:'相手の気分の手は60%、他の2手は各20%。手はあなたが選ぶ前に決まっています。あいこは勝敗枠に数えません。',oekaki:'色を選んで描き、スタンプで飾れます。Undoは30回。保存すると白い背景のPNG画像になります。'};
 const dialog=document.getElementById('shell-dialog');if(dialog){const guide=document.createElement('p');guide.textContent=guides[id]||'';guide.className='game-guide';dialog.querySelector('h2').after(guide);}
});
})();

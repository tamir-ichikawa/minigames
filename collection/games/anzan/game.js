
(function(){
var qIdx,score,level,combo,maxCombo,correct,wrong,timer,timeLeft,maxTime,totalQ,busy;
totalQ=15;maxTime=8000;var operation='mix',mistakes=[],currentQ;

function getEl(id){return document.getElementById(id);}
function showScreen(id){var s=document.querySelectorAll('.screen');for(var i=0;i<s.length;i++)s[i].classList.remove('active');getEl(id).classList.add('active');}

function startGame(){
  GameShell.beginRound();
  operation=getEl('operation').value;mistakes=[];getEl('reviewErrors')?.remove();qIdx=0;score=0;level=1;combo=0;maxCombo=0;correct=0;wrong=0;busy=false;
  getEl('sc').textContent='0';
  showScreen('playScreen');
  nextQuestion();
}

function makeQuestion(){
  var a,b,op,answer;
  if(level<=3){
    // Addition/subtraction with small numbers
    a=Math.floor(Math.random()*10)+1;
    b=Math.floor(Math.random()*10)+1;
    if(Math.random()<0.5){op='+';answer=a+b;}
    else{if(a<b){var t=a;a=b;b=t;}op='-';answer=a-b;}
  }else if(level<=6){
    // Bigger numbers + multiplication
    var r=Math.random();
    if(r<0.3){
      a=Math.floor(Math.random()*12)+1;b=Math.floor(Math.random()*20)+5;
      op='+';answer=a+b;
    }else if(r<0.6){
      a=Math.floor(Math.random()*12)+1;b=Math.floor(Math.random()*15)+1;
      if(a<b){var t=a;a=b;b=t;}op='-';answer=a-b;
    }else{
      a=Math.floor(Math.random()*4)+2;b=Math.floor(Math.random()*9)+2;
      op='×';answer=a*b;
    }
  }else{
    // Hard
    var r=Math.random();
    if(r<0.25){a=Math.floor(Math.random()*20)+1;b=Math.floor(Math.random()*50)+10;op='+';answer=a+b;}
    else if(r<0.5){a=Math.floor(Math.random()*20)+1;b=Math.floor(Math.random()*12)+1;if(a<b){var t=a;a=b;b=t;}op='-';answer=a-b;}
    else{a=Math.floor(Math.random()*8)+2;b=Math.floor(Math.random()*12)+2;op='×';answer=a*b;}
  }
  if(operation!=='mix'){a=1+Math.floor(Math.random()*(level<=3?9:12));b=1+Math.floor(Math.random()*9);op=operation;if(op==='-'&&a<b)[a,b]=[b,a];answer=op==='+'?a+b:op==='-'?a-b:a*b;}
  return{expr:a+' '+op+' '+b,answer:answer};
}

function nextQuestion(){
  if(qIdx>=totalQ){showResult();return;}
  qIdx++;busy=false;
  level=1+Math.floor((qIdx-1)/5)*3;
  getEl('qNum').textContent=qIdx;
  getEl('lv').textContent=level;

  var q=currentQ=makeQuestion();
  getEl('expr').textContent=q.expr;

  // Generate choices
  var choices=[q.answer];
  while(choices.length<4){
    var fake=q.answer+Math.floor(Math.random()*11)-5;
    if(fake!==q.answer&&choices.indexOf(fake)===-1&&fake>=0)choices.push(fake);
  }
  // Shuffle
  for(var i=choices.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=choices[i];choices[i]=choices[j];choices[j]=t;}

  var html='';
  for(var i=0;i<choices.length;i++){
    html+='<button class="ans" data-v="'+choices[i]+'">'+choices[i]+'</button>';
  }
  getEl('answers').innerHTML=html;

  var btns=document.querySelectorAll('.ans');
  for(var i=0;i<btns.length;i++){
    btns[i].addEventListener('click',function(){
      if(busy)return;
      onAnswer(this,q.answer);
    });
  }

  getEl('speech').textContent='さんすうがんばろ〜！⚡';
  if(combo>=3)getEl('streak').textContent='🔥 '+combo+'れんぞく正解！';
  else getEl('streak').textContent='';

  // Timer
  timeLeft=maxTime-Math.floor((qIdx-1)/5)*700;if(timeLeft<3000)timeLeft=3000;
  var roundTime=timeLeft;
  clearInterval(timer);
  getEl('timerFill').style.width='100%';
  timer=setInterval(function(){
    if(GameShell.practice())return;
    timeLeft-=50;
    getEl('timerFill').style.width=Math.max(0,timeLeft/roundTime*100)+'%';
    if(timeLeft<=0){
      clearInterval(timer);busy=true;wrong++;combo=0;if(mistakes.length<3)mistakes.push(q);
      getEl('speech').textContent='じかんぎれ〜💦 こたえは '+q.answer+' だよ〜！';
      // Show correct
      var btns=document.querySelectorAll('.ans');
      for(var i=0;i<btns.length;i++){
        if(parseInt(btns[i].getAttribute('data-v'))===q.answer)btns[i].classList.add('correct');
      }
      setTimeout(nextQuestion,1500);
    }
  },50);
}

function onAnswer(el,correctAns){
  busy=true;
  clearInterval(timer);
  var val=parseInt(el.getAttribute('data-v'));

  if(val===correctAns){
    el.classList.add('correct');GameShell.feedback(true);
    correct++;combo++;if(combo>maxCombo)maxCombo=combo;
    var bonus=(GameShell.practice()?0:Math.floor(timeLeft/1000)*5);
    score+=10+bonus+combo*2;
    getEl('sc').textContent=score;
    var msgs=['あったり〜！✨','すご〜い！⚡💕','ぴんぽ〜ん！🎵','せいかい〜！💪'];
    getEl('speech').textContent=msgs[Math.floor(Math.random()*msgs.length)];
  }else{
    el.classList.add('wrong');GameShell.feedback(false);
    wrong++;combo=0;if(mistakes.length<3)mistakes.push(currentQ);
    // Show correct
    var btns=document.querySelectorAll('.ans');
    for(var i=0;i<btns.length;i++){
      if(parseInt(btns[i].getAttribute('data-v'))===correctAns)btns[i].classList.add('correct');
    }
    var msgs2=['あれれ〜ちがうよ〜💦','おしい〜！⚡','こたえは '+correctAns+' だよ〜！'];
    getEl('speech').textContent=msgs2[Math.floor(Math.random()*msgs2.length)];
  }
  setTimeout(nextQuestion,1200);
}

function showResult(){
  clearInterval(timer);
  showScreen('resultScreen');
  var pct=correct/totalQ;
  if(pct>=0.9){
    getEl('rTitle').textContent='🎉 天才〜！';
    getEl('rEmoji').textContent='⚡✨';
    getEl('rMsg').textContent='さんすうめいじんだね〜！';
  }else if(pct>=0.6){
    getEl('rTitle').textContent='😊 いいかんじ！';
    getEl('rEmoji').textContent='⚡💕';
    getEl('rMsg').textContent='もうちょっとで満点だよ〜！';
  }else{
    getEl('rTitle').textContent='💪 がんばろ〜！';
    getEl('rEmoji').textContent='⚡';
    getEl('rMsg').textContent='れんしゅうすればできるよ〜！';
  }
  getEl('rScore').textContent=(GameShell.practice()?'練習スコア: ':'スコア: ')+score+'てん';
  if(mistakes.length){const review=document.createElement('div');review.id='reviewErrors';review.innerHTML='<p>ゆっくり復習（点数・時間制限なし）</p>';mistakes.forEach(q=>{const row=document.createElement('p'),label=document.createElement('label'),inp=document.createElement('input'),b=document.createElement('button'),msg=document.createElement('span');label.textContent=q.expr+' = ';inp.type='number';inp.style.width='65px';label.append(inp);b.textContent='確認';b.onclick=()=>{msg.textContent=inp.value!==''&&Number(inp.value)===q.answer?' 正解！理解できたね':' 答えは '+q.answer+'。もう一度入力してみよう';};row.append(label,b,msg);review.append(row);});getEl('rDetail').after(review);}
  getEl('rDetail').textContent='正解: '+correct+' / まちがい: '+wrong+' / 最大れんぞく: '+maxCombo;
}

const ops=document.createElement('label');ops.textContent='計算の種類 ';ops.innerHTML+='<select id=operation><option value=mix>ミックス</option><option value=+>足し算</option><option value=->引き算</option><option value=×>掛け算</option></select>';getEl('startBtn').before(ops);
getEl('startBtn').addEventListener('click',startGame);
getEl('retryBtn').addEventListener('click',startGame);
})();

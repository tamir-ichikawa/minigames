/* Test harness uses the real asset loader, collision masks and game simulation. */
(() => {
  const style=document.createElement('style');
  style.textContent=`body{display:block;height:auto;overflow:auto;padding:24px;background:#0c1222;color:#d9e9ff;font:14px system-ui}#game,#hangar,#round-actions{display:none!important}main{max-width:1200px;margin:auto}h1{font-size:26px}h2{margin-top:36px}a{color:#88ddff}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px}article{background:#142039;border:1px solid #314969;border-radius:14px;padding:16px;min-width:0}article canvas{width:100%;height:auto;background:repeating-conic-gradient(#101a2b 0% 25%,#15223a 0% 50%) 0 0/18px 18px;border-radius:8px}.sheet{width:100%;height:auto}p{line-height:1.7}.label{color:#9bb4d8;font-size:12px}pre{white-space:pre-wrap;background:#101c2d;border-radius:12px;padding:20px;font-size:12px;line-height:1.7}button{padding:9px 18px}nav{display:flex;gap:20px;flex-wrap:wrap}details{margin:24px 0}summary{cursor:pointer}#summary{color:#83e6b1}label{display:inline-flex;gap:8px;margin:16px 18px 0 0}`;
  document.head.append(style);
  const root=document.createElement('main');
  root.innerHTML=`<p class="label">ASTRA PATROL / FLEET LAB</p><h1>機体・攻撃・エフェクト図鑑</h1>
    <p>自機3機 ＋ 敵機18機 ＋ ボス6機。各機体は5フレームの傾き、爆発は5種類 × 8フレームです。<br>敵の攻撃は図鑑内で繰り返し再生します。光・尾は当たり判定に含みません。</p>
    <nav><a href="./">ゲームを遊ぶ →</a><a href="?inspect-player">自機の噴射・当たり判定 →</a></nav>
    <label><input id="animate" type="checkbox" checked>アニメーション</label><label>傾きを固定<input id="bank" type="range" min="-1" max="1" step=".5" value="0"></label>
    <details><summary id="summary">自動検証中…</summary><pre id="results"></pre></details>
    <h2>YOUR FLEET · 自機</h2><div id="players" class="gallery"></div>
    <h2>ENEMY FLEET · 敵機と専用武器</h2><div id="enemies" class="gallery"></div>
    <h2>BOSSES · ボス</h2><div id="bosses" class="gallery"></div>
    <h2>DESTRUCTION · 爆発5種</h2><div id="effects" class="gallery"></div>`;
  document.body.append(root);
  const cards=[];
  const names=Object.fromEntries(AstraFleet.sheets.flatMap(s=>s.names));
  function card(id,name,category,description){
    const article=document.createElement('article');
    article.innerHTML=`<h3>${name}</h3><canvas width="280" height="240" aria-label="${name}のプレビュー"></canvas><p>${description}</p><a href="${AstraAtlas.ships[id].file}" target="_blank">5フレーム PNG ↗</a><img class="sheet" src="${AstraAtlas.ships[id].file}" alt="${name}の左・中央・右フレーム">`;
    root.querySelector('#'+category).append(article);
    cards.push({id,category,canvas:article.querySelector('canvas'),bullets:[],pending:[],time:0,round:0});
  }
  AstraFleet.players.forEach(p=>card(p.id,p.name,'players',p.description));
  Object.entries(EnemyAttacks.profiles).forEach(([id,p])=>card(id,names[id],'enemies',p.label));
  AstraFleet.bosses.forEach((b,i)=>card(b.id,names[b.id],'bosses',`HP ${b.hp} / ${EnemyAttacks.bossLabels[i]}<br><a href="?boss=${i+1}">このボスと練習する →</a>`));
  const effects=Explosions.types.map((type,i)=>{
    const article=document.createElement('article');
    article.innerHTML=`<h3>${Explosions.names[i]||type}</h3><canvas width="280" height="160"></canvas><p><a href="${AstraAtlas.effects[type].file}" target="_blank">8フレーム PNG ↗</a></p>`;
    root.querySelector('#effects').append(article);return{type,canvas:article.querySelector('canvas')};
  });
  const checks=[];
  function check(label,pass){checks.push({label,pass:!!pass});}
  check('アセットを全件読み込み',assetList.every(([id])=>images[id]));
  check('27機 × 5フレーム',Object.keys(AstraAtlas.ships).length===27&&Object.values(AstraAtlas.ships).every(s=>s.frames.length===5));
  check('5種類 × 8フレームの爆発',Object.keys(AstraAtlas.effects).length===5&&Object.values(AstraAtlas.effects).every(s=>s.frames===8));
  for(const hz of [30,60,120,144]){
    let count=0;const stepper=createFixedStepper(()=>count++);for(let i=0;i<hz;i++)stepper.advance(1000/hz);
    check(hz+' Hz画面でも1秒＝60更新',count===60);
  }
  for(let s=0;s<3;s++){
    selectedShip=s;resetGame();
    check(shipDefinition().name+': 選択したHP・初期武器',lives===shipDefinition().hp&&weaponType===shipDefinition().weapon);
    weaponType=(weaponType+1)%4;
    check(shipDefinition().name+': 武器変更でも機体を保持',playerFrame().id===shipDefinition().id);
    for(const lean of [-1,-.5,0,.5,1]){
      player.x=240;player.y=620;player.lean=lean;const body=playerFrame();
      const hitbox=playerHitbox(),r=shipDefinition().hitRadius;
      check(shipDefinition().name+': 傾き'+lean+'でも中心の小さな円を維持',hitbox.x===240&&hitbox.y===620&&hitbox.radius===r&&hitbox.w<body.w&&hitbox.h<body.h);
      check(shipDefinition().name+': 円内は被弾・円外と四角の角は無傷',PlayerGeometry.solidAt(hitbox,240+r*.8,620)&&!PlayerGeometry.solidAt(hitbox,240+r+1,620)&&!PlayerGeometry.solidAt(hitbox,240+r*.85,620+r*.85));
      check(shipDefinition().name+': 傾き'+lean+'の噴射口が機体内',body.nozzles.every(n=>{const p=PlayerGeometry.attachment(body,n);return PlayerGeometry.solidAt(body,p.x,p.y);}));
      player.x=-50;player.y=800;clampPlayer();const bounded=playerFrame();
      check(shipDefinition().name+': 傾き'+lean+'でも画面内',bounded.x-bounded.w/2>=-1e-6&&bounded.y+bounded.h/2<=720+1e-6);
    }
  }
  check('判定半径：赤5 < 青8 < 黄10',AstraFleet.players[1].hitRadius===5&&AstraFleet.players[0].hitRadius===8&&AstraFleet.players[2].hitRadius===10);
  // Exercise real collision handling, not just the geometric helper.
  for(let s=0;s<3;s++){
    selectedShip=s;resetGame();boss=null;bossActive=false;invincibleTimer=0;
    const startHP=lives,r=shipDefinition().hitRadius;
    enemyBullets.push({x:player.x+r+2,y:player.y,w:1,h:1});checkCollisions();
    check(shipDefinition().name+': 円の外の翼に当たってもHP不変',lives===startHP);
    enemyBullets.length=0;enemyBullets.push({x:player.x+r*.5,y:player.y,w:1,h:1});checkCollisions();
    check(shipDefinition().name+': 円の内側の弾でHPが1だけ減る',lives===startHP-1);
  }
  resetGame();const spawned=[];
  for(const type of Object.keys(ENEMY_TYPES))for(let i=0;i<3;i++){spawnEnemy(type,240,100,'hover');spawned.push(enemies.at(-1).skin);}
  check('18機が通常の出現順に組み込まれている',new Set(spawned).size===18&&spawned.every(id=>EnemyAttacks.profiles[id]));
  const signatures=new Set();
  for(const [id,p] of Object.entries(EnemyAttacks.profiles)){
    const shots=EnemyAttacks.plan(id,1.7,1);signatures.add(JSON.stringify(shots));
    check(names[id]+': 専用攻撃が有限・低速',shots.length>0&&shots.every(s=>Number.isFinite(s.angle)&&s.speed<=3&&s.delay>=0));
    for(const shot of shots){const b=EnemyAttacks.emit(shot,140,40);for(let t=0;t<140;t++)EnemyAttacks.step(b,{x:180,y:220});check(names[id]+': 弾の座標が正常',Number.isFinite(b.x)&&Number.isFinite(b.y));}
  }
  check('全18機の攻撃定義が異なる',signatures.size===18);
  resetGame();spawnEnemy('core',240,120,'hover');const charging=enemies[0];charging.shootCD=0;
  updateEnemies();check('敵は予告なしに即時発砲しない',charging.warning>0&&enemyBullets.length===0);
  for(let i=0;i<charging.attack.warning+2;i++)updateEnemies();
  check('予告後に実際に発砲する',enemyBullets.length>0);
  for(let i=0;i<6;i++){
    wave=i;spawnBoss();boss.entering=false;boss.y=155;enemyBullets.length=0;
    for(let t=0;t<53;t++)updateBoss();
    check(names[boss.skin]+': HP設定・0.9秒の攻撃予告',boss.hp===AstraFleet.bosses[i].hp&&boss.warning>0&&enemyBullets.length===0);
    for(let t=0;t<70;t++)updateBoss();
    check(names[boss.skin]+': 専用弾幕を発射',enemyBullets.length>0&&enemyBullets.every(b=>b.speed<=2.2));
    const n=enemyBullets.length;for(let t=0;t<100;t++)updateBoss();
    check(names[boss.skin]+': 攻撃後に休止時間',enemyBullets.length===n);
  }
  const piercing={pierce:true}, target={};gameTime=1;
  check('貫通弾の初回ヒット',projectileCanDamage(piercing,target));gameTime=2;
  check('重なった貫通弾は毎フレームHPを減らさない',!projectileCanDamage(piercing,target));gameTime=13;
  check('貫通弾は12フレーム後に再判定',projectileCanDamage(piercing,target));
  resetGame();wave=0;spawnBoss();boss.entering=false;boss.x=240;boss.y=180;player.x=240;player.y=620;
  enemies.push({x:240,y:180,w:50,h:50,hp:1,maxHp:1,score:0});
  playerBullets.push({x:240,y:180,w:10,h:10,dmg:2});const before=boss.hp;
  checkCollisions();check('敵に消費した弾が同時にボスにも当たらない',boss.hp===before&&playerBullets.length===0);
  resetGame();lives=3;invincibleTimer=0;enemyBullets.push({x:240,y:620,w:4,h:4});
  enemies.push({x:240,y:620,w:4,h:4,hp:10});checkCollisions();
  check('同時接触でHPが二重に減らない',lives===2&&invincibleTimer>0);
  lives=0;invincibleTimer=0;playerHit();check('撃墜演出中のHPが負にならない',lives===0);
  resetGame();wave=5;spawnBoss();boss.entering=false;boss.hp=1;defeatBoss();updateWaves();
  check('6ボス撃破後に新しい敵を予約しない',gameState==='victory'&&spawnQueue.length===0);
  resetGame();spawnQueue.push({due:999});resetGame();check('リトライで出現予約・被弾・傾きをリセット',spawnQueue.length===0&&player.lean===0&&deathAnimTimer===0);
  const damageResults=[];
  // Track a moving first boss, with initial weapons and no pickups. This is
  // an upper-bound accuracy benchmark, not a claim about a human clear time.
  for(let s=0;s<3;s++){
    selectedShip=s;resetGame();wave=0;spawnBoss();boss.entering=false;boss.y=155;invincibleTimer=100000;
    keys.Space=true;let elapsed=0;
    while(boss&&elapsed<6000){
      player.x=boss.x;gameTime++;elapsed++;updatePlayer();updatePlayerBullets();updateBoss();updateEnemyBullets();checkCollisions();updateParticles();Explosions.update();
    }
    const seconds=(elapsed/60).toFixed(1);
    check(shipDefinition().name+': 初期武器でボス撃破（追従ベンチ '+seconds+'秒）',!boss&&elapsed>=600&&elapsed<6000);
    damageResults.push(shipDefinition().name+' '+seconds+'秒');
  }
  resetGame();releaseControls();
  const failed=checks.filter(c=>!c.pass);
  root.querySelector('#results').textContent=checks.map(c=>(c.pass?'PASS':'FAIL')+' '+c.label).join('\n');
  root.querySelector('#summary').textContent=`自動検証 ${checks.length-failed.length} / ${checks.length} PASS${failed.length?' — 要修正':''}`;
  root.dataset.testStatus=failed.length?'failed':'passed';root.dataset.testCount=checks.length;
  // No game loop runs on this page. Independent previews cannot affect saves.
  let ticks=0,previous=null;
  const stepper=createFixedStepper(()=>{
    ticks++;
    for(const c of cards){
      c.time++;
      if(c.category!=='players'&&c.time%240===1){
        const plan=c.category==='bosses'?EnemyAttacks.bossPlan({skin:c.id,aim:Math.PI/2,phase:0,attackPattern:c.round++}):EnemyAttacks.plan(c.id,Math.PI/2,c.round++);
        c.pending=plan.map(s=>({...s,remaining:s.delay+36}));
      }
      for(let i=c.pending.length-1;i>=0;i--)if(--c.pending[i].remaining<=0){c.bullets.push(EnemyAttacks.emit(c.pending[i],140,70));c.pending.splice(i,1);}
      for(let i=c.bullets.length-1;i>=0;i--){const b=c.bullets[i],children=EnemyAttacks.step(b,{x:140,y:225});if(children){c.bullets.splice(i,1);c.bullets.push(...children);}else if(b.x<-20||b.x>300||b.y<-20||b.y>260)c.bullets.splice(i,1);}
    }
  });
  function render(now){
    if(previous===null)previous=now;
    const animate=root.querySelector('#animate').checked;if(animate)stepper.advance(now-previous);previous=now;
    for(const c of cards){
      const g=c.canvas.getContext('2d');g.clearRect(0,0,280,240);
      const lean=animate?Math.sin(ticks*.025):Number(root.querySelector('#bank').value);
      const body=SpriteAnimation.frame(c.id,c.category==='players'?lean:-lean,140,c.category==='players'?105:45,c.category==='bosses'?60:54,c.category!=='players');
      if(c.category==='players')PlayerGeometry.drawExhaust(g,body,body.nozzles,ticks);
      SpriteAnimation.draw(g,body);c.bullets.forEach(b=>EnemyAttacks.draw(g,b));
      if(c.category==='players'){
        const ship=AstraFleet.players.find(p=>p.id===c.id);
        drawPlayerHitbox(g,false,{x:140,y:105,radius:ship.hitRadius},ship.color);
      }
    }
    for(const e of effects){const g=e.canvas.getContext('2d');g.clearRect(0,0,280,160);const frame=Math.min(7,Math.floor((ticks%70)/5));if(ticks%70<40)g.drawImage(images['fx_'+e.type],frame*128,0,128,128,76,16,128,128);}
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
})();

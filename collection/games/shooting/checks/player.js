/* Open ../?inspect-player to compare all ships using the production renderer. */
(() => {
  const style = document.createElement('style');
  style.textContent = `
    body{display:block;overflow:auto;background:#111827;color:#e6edf7;padding:24px;font:14px system-ui;min-height:100vh}
    #game{display:none}h1{font-size:22px;margin-bottom:10px}p{margin:10px 0;line-height:1.7}
    .ships{display:grid;grid-template-columns:repeat(3,minmax(220px,1fr));gap:16px;margin:20px 0}
    article{padding:16px;border:1px solid #3c4e63;border-radius:10px;background:#1c293c}
    article canvas{width:100%;height:auto;background:repeating-conic-gradient(#152030 0% 25%,#1b2b3f 0% 50%) 0 0/16px 16px}
    label{display:inline-flex;gap:8px;margin:8px 18px 8px 0}pre{white-space:pre-wrap;padding:16px;background:#0a121c;line-height:1.7}
    @media(max-width:740px){.ships{grid-template-columns:1fr}}
  `;
  document.head.append(style);
  const root = document.createElement('main');
  root.innerHTML = `<h1>ASTRA PATROL · 自機の位置確認</h1>
    <p>実際のゲーム描画を拡大表示。赤い円が自機の当たり判定、黄色の点は噴射口です。赤：半径5px ／ 青：8px ／ 黄：10px。</p>
    <label><input id="mask" type="checkbox">当たり判定を表示</label>
    <label><input id="anchors" type="checkbox">噴射口を表示</label>
    <label>炎のフレーム<input id="phase" type="range" min="0" max="120" value="0"></label>
    <label>機体の傾き<input id="bank" type="range" min="-1" max="1" step="0.5" value="0"></label>
    <p><a href="./">ゲームへ</a> ／ <a href="?inspect-fleet">全機体・攻撃・爆発の図鑑へ</a></p>
    <div class="ships"></div><pre id="results">検証中…</pre>`;
  document.body.append(root);
  const cards = [0, 1, 2].map(type => {
    const article = document.createElement('article');
    article.innerHTML = `<h2>${AstraFleet.players[type].name}</h2><canvas width="360" height="360"></canvas><p></p>`;
    root.querySelector('.ships').append(article);
    return { type, canvas: article.querySelector('canvas'), label: article.querySelector('p') };
  });
  player.x = 240; player.y = 180; lives = 3; invincibleTimer = 0;

  function render() {
    gameTime = Number(root.querySelector('#phase').value);
    player.lean=Number(root.querySelector('#bank').value);
    for (const card of cards) {
      selectedShip = card.type;
      const body = playerFrame();
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawPlayer();
      if (root.querySelector('#mask').checked) {
        drawPlayerHitbox(ctx,true);
      }
      if (root.querySelector('#anchors').checked) {
        ctx.fillStyle = '#ffff55';
        for (const nozzle of body.nozzles) {
          const point = PlayerGeometry.attachment(body, nozzle);
          ctx.beginPath(); ctx.arc(point.x, point.y, 0.8, 0, Math.PI * 2); ctx.fill();
        }
      }
      const target = card.canvas.getContext('2d');
      target.clearRect(0, 0, 360, 360);
      target.drawImage(canvas, 195, 142, 90, 90, 0, 0, 360, 360);
      card.label.textContent = `表示 ${body.w.toFixed(1)} × ${body.h.toFixed(1)}px ／ 判定は半径${shipDefinition().hitRadius}pxの円。翼・炎は無傷。`;
    }
  }
  for (const input of root.querySelectorAll('input')) input.addEventListener('input', render);

  const results = [];
  function check(label, value) { results.push(`${value ? 'PASS' : 'FAIL'} ${label}`); }
  const probe = (x, y) => ({ x, y, w: 0.4, h: 0.4 });
  for (const card of cards) {
    selectedShip = card.type; player.x = 240; player.y = 180;
    const body = playerFrame();
    const hitbox = playerHitbox();
    const name = shipDefinition().id;
    check(`${name}: 中心円に接触`, PlayerGeometry.overlaps(hitbox, probe(hitbox.x, hitbox.y)));
    check(`${name}: 機体の隅を通過`, !PlayerGeometry.overlaps(hitbox,
      probe(body.x - body.w * .46, body.y - body.h * .46)));
    for (const [i, nozzle] of body.nozzles.entries()) {
      const point = PlayerGeometry.attachment(body, nozzle);
      check(`${name}: 噴射口 ${i + 1} が機体上にある`, PlayerGeometry.solidAt(body, point.x, point.y));
      check(`${name}: 噴射炎のみへの接触は無傷`, !PlayerGeometry.overlaps(hitbox, probe(point.x, point.y + 10)));
    }
    // Translate to fractional positions to detect coordinate-origin mismatches.
    const shifted = { ...hitbox, x: hitbox.x + 87.3, y: hitbox.y - 41.7 };
    check(`${name}: 移動後も判定が機体と一致`, PlayerGeometry.overlaps(shifted, probe(shifted.x, shifted.y)) &&
      !PlayerGeometry.overlaps(shifted, probe(hitbox.x, hitbox.y)));
    player.x = -10; player.y = 800; clampPlayer();
    const clamped = playerFrame();
    check(`${name}: 画面端でも機体が画面内`, clamped.x - clamped.w / 2 >= -1e-6 && clamped.y + clamped.h / 2 <= CANVAS_H + 1e-6);
    player.x = 240; player.y = 180;
  }
  // Real collision processing must not remove two lives for simultaneous hits.
  weaponType = 0; lives = 3; invincibleTimer = 0;
  const bullet = { x: player.x, y: player.y, w: 4, h: 4 };
  enemyBullets.push(bullet);
  enemies.push({ x: player.x, y: player.y, w: 4, h: 4, hp: 10 });
  checkCollisions();
  check('同一フレームの弾・敵接触で二重被弾しない', lives === 2 && invincibleTimer > 0);
  lives = 0; invincibleTimer = 0;
  playerHit();
  check('撃墜演出中に追加被弾してHPが負にならない', lives === 0);
  enemyBullets.length = 0; enemies.length = 0; particles.length = 0;
  lives = 3; invincibleTimer = 0;
  check('全アセット読み込み完了', assetList.every(([name]) => images[name]));
  root.querySelector('#results').textContent = results.join('\n');
  root.dataset.testStatus = results.some(line => line.startsWith('FAIL')) ? 'failed' : 'passed';
  render();
})();

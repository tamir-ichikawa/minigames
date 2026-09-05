/* The runner uses its own delta-time clock; keep input/settings separate from its simulation. */
window.MarimoControls = {
  connect(game) {
    let key = 'KeyZ', capturing = false, musicEnabled = false;
    try { const saved = localStorage.getItem('miitan-marimo-bite'); if (saved) key = saved; } catch {}
    const music = new Audio('../../assets/bgm/arcade.mp3');
    music.loop = true; music.volume = .22;
    const bar = document.createElement('nav');
    bar.className = 'runner-tools';
    bar.innerHTML = '<a href="../../">← 一覧</a><button id="runner-pause">一時停止</button><button id="runner-bgm">BGM OFF</button><button id="runner-settings">操作設定</button>';
    document.body.append(bar);
    const pad = document.createElement('button'); pad.className = 'runner-bite'; document.body.append(pad);
    const dialog = document.createElement('dialog');
    dialog.innerHTML = '<h2>食べる操作</h2><p>ボタンを押して、好きなキーを入力してください。</p><button id="runner-bind"></button><p id="runner-note">Spaceで一時停止。Enterでも食べられます。</p><button id="runner-close">閉じる</button>';
    document.body.append(dialog);
    function labels() { pad.textContent = 'ぱくっ！ / ' + key.replace('Key', ''); dialog.querySelector('#runner-bind').textContent = '食べる：' + key.replace('Key', ''); }
    async function sync() {
      bar.querySelector('#runner-pause').textContent = game.getState() === 'paused' ? '再開' : '一時停止';
      if (musicEnabled && ['playing', 'clearing'].includes(game.getState())) {
        if (music.paused) try { await music.play(); } catch { musicEnabled = false; }
      } else music.pause();
      bar.querySelector('#runner-bgm').textContent = 'BGM ' + (musicEnabled ? 'ON' : 'OFF');
    }
    function action() { if (dialog.open) return; if (['title', 'gameover', 'clear'].includes(game.getState())) game.start(); else game.bite(); sync(); }
    pad.addEventListener('pointerdown', e => { e.preventDefault(); action(); });
    pad.addEventListener('click', e => { if(e.detail===0)action(); });
    bar.querySelector('#runner-pause').onclick = () => { game.pause(); sync(); };
    bar.querySelector('#runner-bgm').onclick = () => { musicEnabled = !musicEnabled; sync(); };
    bar.querySelector('#runner-settings').onclick = () => { if (game.getState() === 'playing') game.pause(); sync(); dialog.showModal(); };
    dialog.querySelector('#runner-bind').onclick = () => { capturing = true; dialog.querySelector('#runner-note').textContent = 'キーを押してください。Escで取消。'; };
    dialog.querySelector('#runner-close').onclick = () => dialog.close();
    dialog.addEventListener('close', () => { capturing = false; });
    document.addEventListener('keydown', e => {
      if (capturing) {
        e.preventDefault();
        if (e.code === 'Escape') capturing = false;
        else if (/^(Key[A-Z]|Digit[0-9])$/.test(e.code) && !e.ctrlKey && !e.altKey && !e.metaKey) {
          key = e.code; capturing = false; try { localStorage.setItem('miitan-marimo-bite', key); } catch {} labels();
        }
        return;
      }
      if (dialog.open || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.matches('button,a,input,select')) return;
      if (e.code === key || e.code === 'Enter') { e.preventDefault(); action(); }
      if (e.code === 'Space' || e.code === 'Escape') { e.preventDefault(); game.pause(); sync(); }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && game.getState() === 'playing') game.pause(); sync(); });
    window.addEventListener('blur',()=>{if(game.getState()==='playing')game.pause();sync();});
    window.addEventListener('marimo-state', sync);
    labels();
  }
};

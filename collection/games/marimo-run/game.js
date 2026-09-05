
  (() => {
    'use strict';

    const W = 960;
    const H = 540;
    const GROUND_Y = 405;
    const PLAYER_X = 178;
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const shell = document.getElementById('gameShell');
    const hud = document.getElementById('hud');
    const scoreEl = document.getElementById('score');
    const comboEl = document.getElementById('combo');
    const comboPill = document.getElementById('comboPill');
    const fullnessValueEl = document.getElementById('fullnessValue');
    const fullnessFillEl = document.getElementById('fullnessFill');
    const formLabelEl = document.getElementById('formLabel');
    const bitesLeftEl = document.getElementById('bitesLeft');
    const bitePill = document.getElementById('bitePill');
    const titleScreen = document.getElementById('titleScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const clearScreen = document.getElementById('clearScreen');
    const pauseScreen = document.getElementById('pauseScreen');
    const finalScoreEl = document.getElementById('finalScore');
    const bestScoreEl = document.getElementById('bestScore');
    const bestTitleEl = document.getElementById('bestTitle');
    const newBestEl = document.getElementById('newBest');
    const startButton = document.getElementById('startButton');
    const retryButton = document.getElementById('retryButton');
    const replayButton = document.getElementById('replayButton');
    const resumeButton = document.getElementById('resumeButton');
    const soundButton = document.getElementById('soundButton');
    const clearScoreEl = document.getElementById('clearScore');
    const clearBestEl = document.getElementById('clearBest');

    let state = 'title';
    let score = 0;
    let best = loadBest();
    let combo = 0;
    let elapsed = 0;
    let firstBiteLesson=true;
    let scroll = 0;
    let nextSpawn = .85;
    let burstLeft = 0;
    let lastEatTime = -10;
    let biteTime = -10;
    let biteHit = false;
    let biteActive = true;
    let bitesLeft = 5;
    let fullness = 0;
    let formStage = 0;
    let transformTimer = 0;
    let clearTime = 0;
    let clearBurstDone = false;
    let shake = 0;
    let flash = 0;
    let waveNotice = 0;
    let waveText = 'RUSH! 連打だ！';
    let gameOverAt = 0;
    let lastFrame = performance.now();
    let enemyId = 0;
    let audioEnabled = true;
    let audioContext = null;
    let enemies = [];
    let particles = [];
    let floaters = [];

    const enemyColors = [
      ['#ff7d78', '#dd4f63'],
      ['#8b77ee', '#6651c9'],
      ['#ffc94f', '#ec963c'],
      ['#4ed3c1', '#22a79e'],
      ['#ff91c8', '#d95b9e']
    ];
    const MAX_MISSES = 5;
    const FORM_LABELS = ['ポム', '二足歩行', 'ローリング'];

    function loadBest() {
      try { return Number(localStorage.getItem('pom-run-v4-best')) || 0; }
      catch (_) { return 0; }
    }

    function saveBest() {
      try { localStorage.setItem('pom-run-v4-best', String(best)); }
      catch (_) { /* localStorage may be disabled; the game still works. */ }
    }

    function resize() {
      const rect = shell.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    }

    function resetGame() {
      state = 'playing';queueMicrotask(()=>window.dispatchEvent(new Event('marimo-state')));
      score = 0;
      combo = 0;
      elapsed = 0;
      scroll = 0;
      nextSpawn = 1.6;
      burstLeft = 0;
      lastEatTime = -10;
      firstBiteLesson=true;
      biteTime = -10;
      biteHit = false;
      biteActive = true;
      bitesLeft = MAX_MISSES;
      fullness = 0;
      formStage = 0;
      transformTimer = 0;
      clearTime = 0;
      clearBurstDone = false;
      shake = 0;
      flash = 0;
      waveNotice = 0;
      waveText = 'RUSH! 連打だ！';
      enemyId = 0;
      enemies = [];
      particles = [];
      floaters = [];
      scoreEl.textContent = '0';
      comboEl.textContent = '0';
      comboPill.classList.remove('on');
      titleScreen.classList.add('hidden');
      gameOverScreen.classList.add('hidden');
      clearScreen.classList.add('hidden');
      pauseScreen.classList.add('hidden');
      hud.hidden = false;
      updateProgressHud();
      unlockAudio();
      playTone(440, .07, 'sine', .045, 0);
      playTone(660, .10, 'sine', .04, .07);
      canvas.focus({ preventScroll: true });
    }

    function updateProgressHud() {
      const value = Math.max(0, Math.min(100, Math.round(fullness)));
      fullnessValueEl.textContent = String(value);
      fullnessFillEl.style.width = `${value}%`;
      formLabelEl.textContent = FORM_LABELS[Math.min(formStage, FORM_LABELS.length - 1)];
      bitesLeftEl.textContent = String(bitesLeft);
      bitePill.classList.toggle('danger', bitesLeft === 1);
      bitePill.classList.toggle('empty', bitesLeft === 0);
    }

    function addFullness(enemy) {
      const meal = enemy.kind === 'depth' ? 28 : enemy.kind === 'flyer' ? 23 : enemy.kind === 'meteor' ? 17 : 20;
      fullness = Math.min(100, fullness + meal);
      updateProgressHud();
      if (fullness >= 100) advanceForm();
    }

    function advanceForm() {
      if (formStage >= 2) {
        startClearSequence();
        return;
      }

      formStage++;
      fullness = 0;
      bitesLeft = MAX_MISSES;
      transformTimer = 1.35;
      waveNotice = 1.35;
      waveText = formStage === 1 ? 'へんしん！二足歩行！' : 'へんしん！ローリング！';
      updateProgressHud();
      shake = 10;
      flash = .75;
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 70 + Math.random() * 190;
        particles.push({
          x: PLAYER_X,
          y: GROUND_Y - 58,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 40,
          size: 4 + Math.random() * 8,
          color: i % 2 ? '#fff17b' : '#79ef9d',
          life: .7 + Math.random() * .45,
          maxLife: 1.15,
          star: i % 3 === 0
        });
      }
      playTone(380, .12, 'triangle', .06);
      playTone(570, .14, 'triangle', .055, .08);
      playTone(820, .2, 'sine', .05, .17);
    }

    function startClearSequence() {
      state = 'clearing';queueMicrotask(()=>window.dispatchEvent(new Event('marimo-state')));
      clearTime = 0;
      clearBurstDone = false;
      fullness = 100;
      enemies = [];
      floaters = [];
      combo = 0;
      comboPill.classList.remove('on');
      hud.hidden = true;
      pauseScreen.classList.add('hidden');
      if (score > best) {
        best = score;
        saveBest();
      }
      clearScoreEl.textContent = String(score);
      clearBestEl.textContent = String(best);
      bestTitleEl.textContent = `BEST ${best}`;
      playTone(440, .18, 'sine', .05);
      playTone(660, .2, 'sine', .05, .12);
      playTone(880, .28, 'triangle', .055, .25);
    }

    function makeClearBurst() {
      clearBurstDone = true;
      for (let i = 0; i < 42; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 75 + Math.random() * 250;
        particles.push({
          x: 596,
          y: 176,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 35,
          size: 4 + Math.random() * 10,
          color: ['#fff37c', '#ff9ac7', '#86f0dd', '#ffffff'][i % 4],
          life: .9 + Math.random() * .8,
          maxLife: 1.7,
          star: true
        });
      }
      shake = 12;
      flash = 1;
      playTone(523, .16, 'triangle', .06);
      playTone(784, .2, 'sine', .06, .1);
      playTone(1046, .34, 'sine', .055, .22);
    }

    function togglePause() {
      if (state === 'playing') {
        state = 'paused';
        pauseScreen.classList.remove('hidden');
      } else if (state === 'paused') {
        state = 'playing';queueMicrotask(()=>window.dispatchEvent(new Event('marimo-state')));
        pauseScreen.classList.add('hidden');
        canvas.focus({ preventScroll: true });
      }
      window.dispatchEvent(new Event('marimo-state'));
    }

    function endGame() {
      if (state !== 'playing') return;
      state = 'gameover';queueMicrotask(()=>window.dispatchEvent(new Event('marimo-state')));
      gameOverAt = elapsed;
      shake = 16;
      flash = 1;
      combo = 0;
      comboPill.classList.remove('on');
      const isNew = score > best;
      if (isNew) {
        best = score;
        saveBest();
      }
      finalScoreEl.textContent = String(score);
      bestScoreEl.textContent = String(best);
      bestTitleEl.textContent = `BEST ${best}`;
      newBestEl.classList.toggle('show', isNew && score > 0);
      playTone(180, .18, 'sawtooth', .055, 0);
      playTone(120, .32, 'triangle', .06, .13);
      setTimeout(() => {
        if (state === 'gameover') {
          gameOverScreen.classList.remove('hidden');
          retryButton.focus({ preventScroll: true });
        }
      }, 480);
    }

    function unlockAudio() {
      if (!audioEnabled) return;
      try {
        if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') audioContext.resume();
      } catch (_) { audioContext = null; }
    }

    function playTone(freq, duration, type = 'sine', volume = .04, delay = 0) {
      if (!audioEnabled || !audioContext) return;
      try {
        const start = audioContext.currentTime + delay;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.exponentialRampToValueAtTime(Math.max(60, freq * .78), start + duration);
        gain.gain.setValueAtTime(.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + .012);
        gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
        osc.connect(gain).connect(audioContext.destination);
        osc.start(start);
        osc.stop(start + duration + .03);
      } catch (_) { /* Sound is optional. */ }
    }

    function toggleSound(event) {
      event.stopPropagation();
      audioEnabled = !audioEnabled;
      soundButton.textContent = audioEnabled ? '♪' : '×';
      soundButton.setAttribute('aria-label', audioEnabled ? '効果音をオフにする' : '効果音をオンにする');
      if (audioEnabled) {
        unlockAudio();
        playTone(620, .08, 'sine', .04);
      }
    }

    function getSpeed() {
      return Math.min(firstBiteLesson?150:330, 150 + elapsed * 2 + score * 3.2);
    }

    function spawnEnemy(options = {}) {
      const level = 1 + Math.floor(score / 8);
      const radius = options.radius || (25 + Math.random() * 8);
      const id = enemyId++;
      let kind = options.kind;
      if (!kind) {
        // New directions are introduced predictably, then mixed randomly.
        if (id >= 7 && (id % 10 === 7 || Math.random() < Math.min(.14, score * .005))) kind = 'meteor';
        else if (id >= 4 && (id % 6 === 4 || Math.random() < Math.min(.2, score * .008))) kind = 'depth';
        else if (id >= 2 && (id % 4 === 2 || Math.random() < Math.min(.28, score * .012))) kind = 'flyer';
        else kind = 'ground';
      }
      const paletteOffset = kind === 'depth' ? 2 : kind === 'flyer' ? 1 : kind === 'meteor' ? 4 : 0;
      const palette = enemyColors[(id + paletteOffset) % enemyColors.length];
      const vanishX = 655 + Math.random() * 210;
      const vanishY = 155 + Math.random() * 95;
      const targetX = PLAYER_X + 60 + Math.random() * 28;
      const targetY = GROUND_Y - 67 + (Math.random() - .5) * 34;
      const meteorIndex = options.meteorIndex || 0;
      const baseY = kind === 'flyer'
        ? 255 + Math.random() * 48
        : kind === 'meteor'
          ? 64 + meteorIndex * 54 + Math.random() * 15
          : GROUND_Y - radius + 4;
      const startX = kind === 'meteor'
        ? (options.x || W + radius + 22 + meteorIndex * 86)
        : kind === 'depth'
          ? vanishX
          : (options.x || W + radius + 18);
      const enemy = {
        id,
        kind,
        x: startX,
        y: kind === 'depth' ? vanishY : baseY,
        baseY,
        radius,
        palette,
        wobble: Math.random() * Math.PI * 2,
        face: id % 3,
        speedFactor: kind === 'meteor'
          ? 1.46 + Math.min(.2, level * .012)
          : 1 + Math.min(.12, level * .008) * Math.random(),
        squash: 0,
        depth: kind === 'depth' ? .04 : 0,
        depthRate: .175 + Math.min(.105, level * .009 + score * .0015),
        vanishX,
        vanishY,
        targetX,
        targetY,
        renderScale: kind === 'depth' ? .2 : kind === 'meteor' ? .62 : 1,
        meteorIndex,
        meteorStartX: startX,
        meteorStartY: baseY,
        meteorTargetY: GROUND_Y - 56 + (meteorIndex - 1) * 8
      };
      enemies.push(enemy);
      return enemy;
    }

    function scheduleSpawns(dt) {
      if(firstBiteLesson&&enemies.length)return;
      nextSpawn -= dt;
      if (nextSpawn > 0) return;

      const spawned = spawnEnemy();
      if (spawned.kind === 'meteor') {
        for (let i = 1; i < 3; i++) {
          spawnEnemy({ kind: 'meteor', meteorIndex: i, x: W + 45 + i * 90, radius: 23 + i * 2 });
        }
        burstLeft = 0;
        waveNotice = 1.35;
        waveText = 'METEOR! 流星群を迎え撃て！';
        nextSpawn = 1.05;
        playTone(210, .16, 'sawtooth', .035);
        return;
      }
      if (burstLeft > 0) {
        burstLeft--;
        nextSpawn = Math.max(.25, .39 - score * .002) + Math.random() * .08;
        return;
      }

      const difficulty = Math.min(1, elapsed / 75 + score / 100);
      const canBurst = score >= 3;
      if (canBurst && Math.random() < .28 + difficulty * .42) {
        burstLeft = 1 + Math.floor(Math.random() * (score >= 16 ? 4 : score >= 8 ? 3 : 2));
        waveNotice = 1.35;
        waveText = 'RUSH! 連打だ！';
        nextSpawn = .38;
      } else {
        nextSpawn = Math.max(.53, 1.15 - difficulty * .46) + Math.random() * .35;
      }
    }

    function bite() {
      if (state !== 'playing' || transformTimer > 0) return;
      const sinceLast = elapsed - biteTime;
      if (sinceLast < .085) return;
      biteTime = elapsed;
      biteHit = false;
      unlockAudio();

      if (bitesLeft <= 0) {
        biteActive = false;
        playTone(82, .13, 'square', .025);
        floaters.push({ x: PLAYER_X + 95, y: 300, text: 'もう食べられない！', color: '#6f6f74', life: .7, maxLife: .7, small: true });
        return;
      }
      biteActive = true;

      let target = null;
      let nearestDanger = Infinity;
      for (const enemy of enemies) {
        let danger = Infinity;
        if (enemy.kind === 'depth') {
          if (enemy.depth >= .72) danger = (1 - enemy.depth) / enemy.depthRate;
        } else {
          const front = enemy.x - enemy.radius;
          if (front >= PLAYER_X + 18 && front <= PLAYER_X + 238) {
            danger = (front - PLAYER_X - 39) / (getSpeed() * enemy.speedFactor);
          }
        }
        if (danger < nearestDanger) {
          target = enemy;
          nearestDanger = danger;
        }
      }

      if (target) {
        firstBiteLesson=false;
        biteHit = true;
        eatEnemy(target);
      } else {
        if(firstBiteLesson){floaters.push({x:PLAYER_X+170,y:304,text:'まだ遠い。近づいて「今！」が出たらタップ',color:'#72567e',life:1,maxLife:1,small:true});return;}
        if(elapsed<3)return;
        bitesLeft = Math.max(0, bitesLeft - 1);
        updateProgressHud();
        shake = 2.5;
        playTone(155, .055, 'square', .018);
        const reason=enemies.some(e=>e.kind==='depth'&&e.depth<.72)?'奥の敵はまだ遠い':enemies.some(e=>e.x-e.radius>PLAYER_X+238)?'まだ遠い。光る範囲まで待とう':'近くに食べられる敵がいない';
        const missText = bitesLeft === 0 ? '空振り！もう食べられない！' : reason+`（残り${bitesLeft}）`;
        floaters.push({ x: PLAYER_X + 130, y: 304, text: missText, color: bitesLeft === 0 ? '#d84255' : '#72567e', life: .72, maxLife: .72, small: true });
      }
    }

    function eatEnemy(enemy) {
      enemies = enemies.filter(item => item !== enemy);
      const quickCombo = elapsed - lastEatTime < 1.12;
      combo = quickCombo ? combo + 1 : 1;
      lastEatTime = elapsed;
      const gained = combo >= 3 ? Math.min(5, 1 + Math.floor(combo / 3)) : 1;
      score += gained;
      addFullness(enemy);
      scoreEl.textContent = String(score);
      comboEl.textContent = String(combo);
      comboPill.classList.toggle('on', combo >= 2);
      shake = Math.min(7, 2.4 + combo * .32);
      flash = .2;

      const words = combo >= 8 ? 'SUPER!' : combo >= 5 ? 'YUMMY!' : combo >= 2 ? `${combo} COMBO!` : '+1';
      floaters.push({ x: enemy.x, y: enemy.y - 18, text: words, color: combo >= 5 ? '#8a52ca' : '#e95154', life: .78, maxLife: .78 });
      for (let i = 0; i < 13; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 55 + Math.random() * 170;
        particles.push({
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 45,
          size: 3 + Math.random() * 7,
          color: i % 3 === 0 ? '#fff4a8' : enemy.palette[0],
          life: .45 + Math.random() * .35,
          maxLife: .8,
          star: i % 4 === 0
        });
      }
      playTone(260 + Math.min(combo, 10) * 25, .09, 'triangle', .055);
      playTone(520 + Math.min(combo, 10) * 32, .08, 'sine', .038, .045);
    }

    function update(dt) {
      if (state === 'paused') return;
      scroll += dt * (state === 'playing' ? getSpeed() : state === 'clearing' ? 72 : 35);
      biteTime = Math.max(biteTime, -10);
      shake = Math.max(0, shake - dt * 26);
      flash = Math.max(0, flash - dt * 3.4);
      waveNotice = Math.max(0, waveNotice - dt);

      for (const particle of particles) {
        particle.life -= dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += 360 * dt;
        particle.vx *= Math.pow(.12, dt);
      }
      particles = particles.filter(p => p.life > 0);

      for (const floater of floaters) {
        floater.life -= dt;
        floater.y -= 46 * dt;
      }
      floaters = floaters.filter(f => f.life > 0);

      if (state === 'clearing') {
        clearTime += dt;
        if (clearTime >= 3.25 && !clearBurstDone) makeClearBurst();
        if (clearTime >= 4.65 && clearScreen.classList.contains('hidden')) {
          clearScreen.classList.remove('hidden');
          replayButton.focus({ preventScroll: true });
        }
        return;
      }

      if (state !== 'playing') return;
      if (transformTimer > 0) {
        transformTimer = Math.max(0, transformTimer - dt);
        return;
      }
      elapsed += dt;
      scheduleSpawns(dt);

      if (elapsed - lastEatTime > 1.12 && combo !== 0) {
        combo = 0;
        comboPill.classList.remove('on');
      }

      if(firstBiteLesson&&enemies[0]){waveNotice=.2;waveText=enemies[0].x-enemies[0].radius<=PLAYER_X+238?'今！ タップで食べよう':'最初の敵が近づくまで待とう';}
      const speed = getSpeed();
      for (const enemy of enemies) {
        enemy.wobble += dt * 5.2;
        enemy.squash = Math.sin(enemy.wobble) * .045;
        let collided = false;

        if (enemy.kind === 'depth') {
          enemy.depth += enemy.depthRate * dt;
          const projection = Math.min(1, enemy.depth * enemy.depth);
          enemy.x = enemy.vanishX + (enemy.targetX - enemy.vanishX) * projection;
          enemy.y = enemy.vanishY + (enemy.targetY - enemy.vanishY) * projection
            + Math.sin(enemy.wobble * .8) * 8 * (1 - projection);
          enemy.renderScale = .2 + projection * 1.28;
          collided = enemy.depth >= 1;
        } else {
          enemy.x -= speed * enemy.speedFactor * dt;
          if(firstBiteLesson)enemy.x=Math.max(enemy.x,PLAYER_X+150+enemy.radius);
          if (enemy.kind === 'flyer') {
            const dive = Math.max(0, Math.min(1, (465 - enemy.x) / 245));
            enemy.y = enemy.baseY + Math.sin(enemy.wobble * 1.35) * 17 + dive * 43;
            enemy.squash *= .55;
          } else if (enemy.kind === 'meteor') {
            const flightLength = Math.max(1, enemy.meteorStartX - (PLAYER_X + 55));
            const dive = Math.max(0, Math.min(1, (enemy.meteorStartX - enemy.x) / flightLength));
            const rush = dive * dive * (3 - 2 * dive);
            enemy.y = enemy.meteorStartY + (enemy.meteorTargetY - enemy.meteorStartY) * rush
              - Math.sin(dive * Math.PI) * 24;
            enemy.renderScale = .62 + dive * .55;
            enemy.squash = Math.sin(enemy.wobble * 2.2) * .025;
          }
          collided = enemy.x - enemy.radius <= PLAYER_X + 39;
        }

        if (collided) {
          burstAtPlayer(enemy);
          endGame();
          break;
        }
      }
    }

    function burstAtPlayer(enemy) {
      for (let i = 0; i < 22; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 70 + Math.random() * 210;
        particles.push({
          x: PLAYER_X,
          y: GROUND_Y - 54,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 50,
          size: 4 + Math.random() * 8,
          color: i % 2 ? '#58bf6e' : enemy.palette[0],
          life: .55 + Math.random() * .55,
          maxLife: 1.1,
          star: i % 5 === 0
        });
      }
    }

    function roundRect(context, x, y, width, height, radius) {
      const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
      context.beginPath();
      context.roundRect(x, y, width, height, r);
    }

    function drawBackground() {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#70d9ef');
      sky.addColorStop(.66, '#d1f6d5');
      sky.addColorStop(1, '#fff3ac');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.globalAlpha = .33;
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 6; i++) {
        const x = ((i * 210 - scroll * .08) % 1260 + 1260) % 1260 - 130;
        const y = 75 + (i % 3) * 58;
        drawCloud(x, y, .8 + (i % 2) * .28);
      }
      ctx.restore();

      drawHillLayer('#88dda0', 344, 42, .14);
      drawHillLayer('#55c586', 377, 54, .25);

      ctx.fillStyle = '#ffe48b';
      ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
      ctx.fillStyle = '#f4c967';
      ctx.fillRect(0, GROUND_Y, W, 8);

      ctx.strokeStyle = 'rgba(218,164,69,.34)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      for (let i = 0; i < 18; i++) {
        const x = ((i * 72 - scroll * .78) % 1296 + 1296) % 1296 - 100;
        const y = 448 + (i % 3) * 27;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 18, y + ((i % 2) ? 5 : -4));
        ctx.stroke();
      }

      for (let i = 0; i < 11; i++) {
        const x = ((i * 105 - scroll * .53) % 1155 + 1155) % 1155 - 55;
        drawFlower(x, 419 + (i % 2) * 12, i % 3);
      }
    }

    function drawCloud(x, y, scale) {
      ctx.beginPath();
      ctx.ellipse(x, y, 44 * scale, 20 * scale, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 36 * scale, y + 2 * scale, 37 * scale, 17 * scale, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 14 * scale, y - 13 * scale, 29 * scale, 25 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawHillLayer(color, baseY, height, rate) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, H);
      const offset = -((scroll * rate) % 240);
      for (let x = offset - 240; x < W + 300; x += 240) {
        ctx.quadraticCurveTo(x + 60, baseY - height, x + 120, baseY);
        ctx.quadraticCurveTo(x + 180, baseY + height * .18, x + 240, baseY);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    }

    function drawFlower(x, y, type) {
      const colors = ['#ff7e7a', '#8c6ee8', '#fff5f0'];
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = colors[type];
      for (let i = 0; i < 5; i++) {
        ctx.rotate(Math.PI * 2 / 5);
        ctx.beginPath();
        ctx.ellipse(0, -6, 4, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f4a83d';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawPlayer() {
      const biteAge = elapsed - biteTime;
      let open = 0;
      if (biteActive && (state === 'playing' || state === 'paused') && biteAge >= 0 && biteAge < .38) {
        // The face snaps open, hangs for a beat, then contracts organically.
        if (biteAge < .065) open = biteAge / .065;
        else if (biteAge < .16) open = 1;
        else open = 1 - (biteAge - .16) / .22;
        open = Math.sin(Math.max(0, open) * Math.PI / 2);
      }
      const bob = state === 'title' ? Math.sin(performance.now() / 420) * 2 : Math.sin(elapsed * 9) * 3;
      const isBiped = formStage === 1;
      const isRolling = formStage === 2;
      const y = GROUND_Y - (isBiped ? 76 : 55) + bob;
      const runSquash = (state === 'playing' || state === 'paused') ? Math.sin(elapsed * 18) * .025 : 0;

      ctx.save();
      ctx.translate(PLAYER_X, y);

      ctx.save();
      ctx.globalAlpha = .18;
      ctx.fillStyle = '#6d753c';
      ctx.beginPath();
      ctx.ellipse(0, GROUND_Y - y + 4, isBiped ? 46 : 56, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (transformTimer > 0) {
        const transformProgress = 1 - transformTimer / 1.35;
        ctx.save();
        ctx.globalAlpha = Math.max(0, transformTimer / 1.35) * .75;
        ctx.strokeStyle = transformProgress < .5 ? '#fff37c' : '#a5ffcb';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(0, 0, 64 + transformProgress * 55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 91 + transformProgress * 70, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (isBiped) {
        const step = Math.sin(elapsed * 16) * 9;
        ctx.save();
        ctx.strokeStyle = '#88572e';
        ctx.fillStyle = '#e7a057';
        ctx.lineWidth = 16;
        ctx.lineCap = 'round';
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(side * 20, 37);
          ctx.quadraticCurveTo(side * 22, 57, side * (25 + step * side), 70);
          ctx.stroke();
          ctx.fillStyle = '#c5833c';
          ctx.beginPath();
          ctx.ellipse(side * (29 + step * side), 75, 18, 8, -.08 * side, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(side * 39, -2);
          ctx.quadraticCurveTo(side * 66, 8 + step * .35, side * 72, 25);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (isRolling && open < .12) {
        ctx.rotate(-scroll * .045);
      }

      ctx.scale(1 + runSquash - open * .05, 1 - runSquash + open * .04);
      const body = ctx.createRadialGradient(-18, -24, 8, 0, 0, 61);
      body.addColorStop(0, '#ffe9a0');
      body.addColorStop(.52, '#efa14f');
      body.addColorStop(1, '#c07136');
      ctx.fillStyle = body;
      ctx.strokeStyle = '#88572e';
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        const fuzz = i % 2 ? 3.5 : -1;
        const r = 55 + fuzz + Math.sin(i * 4.7) * 1.5;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * (r * .96);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#92b66c';ctx.strokeStyle='#55784a';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(0,-50);ctx.quadraticCurveTo(-8,-85,-35,-70);ctx.quadraticCurveTo(-30,-45,0,-50);ctx.fill();ctx.stroke();
      ctx.strokeStyle = 'rgba(136,87,46,.45)';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      for (let i = 0; i < 14; i++) {
        const a = i * 2.4;
        const r = 25 + (i % 3) * 8;
        const x = Math.cos(a) * r;
        const yy = Math.sin(a) * r;
        ctx.beginPath();
        ctx.moveTo(x, yy);
        ctx.lineTo(x + Math.cos(a + .7) * 8, yy + Math.sin(a + .7) * 8);
        ctx.stroke();
      }

      if (open > .12) drawBigMouth(open, biteHit);
      else drawCuteFace();

      ctx.restore();
    }

    function drawCuteFace() {
      ctx.fillStyle = '#173f45';
      ctx.beginPath();
      ctx.ellipse(-16, -8, 5.5, 7, 0, 0, Math.PI * 2);
      ctx.ellipse(15, -8, 5.5, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-18, -10, 1.8, 0, Math.PI * 2);
      ctx.arc(13, -10, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,116,125,.6)';
      ctx.beginPath();
      ctx.ellipse(-31, 5, 9, 4, 0, 0, Math.PI * 2);
      ctx.ellipse(30, 5, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#19404a';
      ctx.beginPath();
      ctx.ellipse(0, 7, 5.5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef7590';
      ctx.beginPath();
      ctx.ellipse(0, 8, 2.4, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawBigMouth(open, hit) {
      const ease = 1 - Math.pow(1 - open, 2);
      const pulse = Math.sin(elapsed * 58) * 1.6 * ease;
      const throatX = 36 + ease * 37;

      ctx.save();
      ctx.translate(3 * ease, 0);

      // Four muscular mandibles erupt from the otherwise round face.
      const lobes = [
        { angle: -1.03, length: 64 + ease * 42, width: 23 + ease * 15, inner: 1 },
        { angle: -.36, length: 61 + ease * 62, width: 21 + ease * 18, inner: 1 },
        { angle: .36, length: 61 + ease * 62, width: 21 + ease * 18, inner: -1 },
        { angle: 1.03, length: 64 + ease * 42, width: 23 + ease * 15, inner: -1 }
      ];

      function drawMandible(lobe, index) {
        ctx.save();
        ctx.translate(0, 0);
        ctx.rotate(lobe.angle);

        const flesh = ctx.createLinearGradient(-8, 0, lobe.length, 0);
        flesh.addColorStop(0, '#2d8956');
        flesh.addColorStop(.27, '#5b7e54');
        flesh.addColorStop(.5, '#a84d66');
        flesh.addColorStop(.78, index % 2 ? '#c86878' : '#b35470');
        flesh.addColorStop(1, '#663047');
        ctx.fillStyle = flesh;
        ctx.strokeStyle = '#173e3a';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-10, -lobe.width * .22);
        ctx.bezierCurveTo(lobe.length * .18, -lobe.width * .72, lobe.length * .67, -lobe.width * .62, lobe.length, -lobe.width * .18);
        ctx.quadraticCurveTo(lobe.length + 10 + ease * 5, 0, lobe.length - 3, lobe.width * .25);
        ctx.bezierCurveTo(lobe.length * .62, lobe.width * .62, lobe.length * .17, lobe.width * .48, -10, lobe.width * .2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Wet specular shine and branching veins make the surface feel alive.
        ctx.strokeStyle = 'rgba(255,190,187,.48)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(5, -lobe.width * .2);
        ctx.bezierCurveTo(lobe.length * .34, -lobe.width * .45, lobe.length * .7, -lobe.width * .34, lobe.length * .88, -lobe.width * .12);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(77,24,60,.48)';
        ctx.lineWidth = 1.8;
        for (let v = 0; v < 3; v++) {
          const vx = lobe.length * (.28 + v * .2);
          ctx.beginPath();
          ctx.moveTo(vx, 0);
          ctx.quadraticCurveTo(vx + 7, -lobe.width * .25, vx + 17, -lobe.width * (.38 - v * .04));
          ctx.stroke();
        }
        ctx.restore();
      }

      for (let i = 0; i < lobes.length; i++) drawMandible(lobes[i], i);

      // Deep, contracting throat.
      const throat = ctx.createRadialGradient(throatX + 23, pulse, 3, throatX, 0, 73 + ease * 7);
      throat.addColorStop(0, hit ? '#df547e' : '#9e315f');
      throat.addColorStop(.22, '#682143');
      throat.addColorStop(.62, '#29142f');
      throat.addColorStop(1, '#100f1b');
      ctx.fillStyle = throat;
      ctx.strokeStyle = '#142d2c';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(throatX, 0, 25 + ease * 49 + pulse, 15 + ease * 41, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(201,91,121,.46)';
      for (let ring = 0; ring < 3; ring++) {
        ctx.lineWidth = 3 - ring * .5;
        ctx.beginPath();
        ctx.ellipse(throatX + 2 + ring * 8, 0, 18 + ease * (34 - ring * 6), 10 + ease * (30 - ring * 5), 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // A thick tongue lashes forward when prey is caught.
      const tongueReach = hit ? 21 : 7;
      const tongue = ctx.createLinearGradient(throatX, 0, throatX + 78, 0);
      tongue.addColorStop(0, '#6f234c');
      tongue.addColorStop(.55, '#c24a72');
      tongue.addColorStop(1, '#e47d91');
      ctx.fillStyle = tongue;
      ctx.beginPath();
      ctx.moveTo(throatX - 11, 14);
      ctx.bezierCurveTo(throatX + 20, 4, throatX + 48 + tongueReach, 5 + pulse, throatX + 60 + tongueReach, 12);
      ctx.bezierCurveTo(throatX + 38 + tongueReach, 29, throatX + 5, 33, throatX - 11, 14);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,174,178,.56)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(throatX + 5, 15);
      ctx.quadraticCurveTo(throatX + 34, 10, throatX + 55 + tongueReach, 13);
      ctx.stroke();

      // Uneven inward-facing teeth line all four jaw petals.
      for (const lobe of lobes) {
        ctx.save();
        ctx.rotate(lobe.angle);
        for (let i = 0; i < 4; i++) {
          const tx = 25 + i * (lobe.length - 36) / 3;
          const baseY = lobe.inner * (lobe.width * (.18 + (i % 2) * .05));
          const fang = 8 + ease * (8 + (i % 2) * 3);
          ctx.fillStyle = i % 2 ? '#ddd6ad' : '#f5edc8';
          ctx.strokeStyle = '#665d4a';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(tx - 4.5, baseY);
          ctx.quadraticCurveTo(tx, baseY + lobe.inner * fang, tx + 5, baseY + lobe.inner * 1.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }

      // Stretchy saliva strands briefly bridge the open mandibles.
      if (ease > .46) {
        ctx.save();
        ctx.strokeStyle = 'rgba(210,255,211,.72)';
        ctx.fillStyle = 'rgba(220,255,220,.82)';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        const strands = [
          [48, -39, 66, 38, .35],
          [86, -29, 101, 27, .6],
          [30, -50, 45, 47, .1]
        ];
        for (const [x1, y1, x2, y2, sway] of strands) {
          ctx.beginPath();
          ctx.moveTo(x1, y1 * ease);
          ctx.bezierCurveTo(x1 + 13, pulse * sway, x2 - 11, -pulse, x2, y2 * ease);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.ellipse(102, 31 * ease + 5, 3.5, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // One familiar eye remains, now tightened and focused on the prey.
      ctx.fillStyle = '#102b2d';
      ctx.beginPath();
      ctx.ellipse(-19, -10, 8, 5.5, -.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d6ff9d';
      ctx.beginPath();
      ctx.ellipse(-17, -10, 3, 2.2, -.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#142325';
      ctx.fillRect(-17.7, -13, 1.8, 6);

      // Creases show the cute round face being pulled apart by the jaws.
      ctx.strokeStyle = 'rgba(19,67,49,.72)';
      ctx.lineWidth = 3;
      for (const sy of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-8, sy * 17);
        ctx.quadraticCurveTo(4, sy * 30, 15, sy * (34 + ease * 10));
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawEnemy(enemy) {
      const { x, y, radius, palette } = enemy;

      // Ground contact and aerial/depth motion use different spatial cues.
      if (enemy.kind === 'ground') {
        ctx.save();
        ctx.globalAlpha = .16;
        ctx.fillStyle = '#55552e';
        ctx.beginPath();
        ctx.ellipse(x, y + radius + 5, radius * .92, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (enemy.kind === 'flyer') {
        ctx.save();
        const height = Math.max(0, GROUND_Y - y);
        ctx.globalAlpha = Math.max(.05, .16 - height * .00045);
        ctx.fillStyle = '#405743';
        ctx.beginPath();
        ctx.ellipse(x, GROUND_Y + 7, radius * 1.05, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (enemy.kind === 'meteor') {
        // A layered flame tail makes the diagonal kamikaze dive read like a meteor.
        const tailLength = 78 + enemy.renderScale * 34;
        const tailX = x + tailLength;
        const tailY = y - tailLength * .72;
        ctx.save();
        ctx.lineCap = 'round';
        const trail = ctx.createLinearGradient(x, y, tailX, tailY);
        trail.addColorStop(0, 'rgba(255,74,65,.92)');
        trail.addColorStop(.42, 'rgba(255,183,55,.75)');
        trail.addColorStop(1, 'rgba(255,239,119,0)');
        ctx.strokeStyle = trail;
        ctx.lineWidth = radius * .95 * enemy.renderScale;
        ctx.beginPath();
        ctx.moveTo(x + radius * .25, y - radius * .18);
        ctx.quadraticCurveTo(x + tailLength * .5, y - tailLength * .2, tailX, tailY);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,245,166,.8)';
        ctx.lineWidth = radius * .28 * enemy.renderScale;
        ctx.stroke();
        for (let i = 0; i < 7; i++) {
          const spark = (i + 1) / 8;
          const flicker = Math.sin(enemy.wobble * 3 + i * 2.1);
          ctx.fillStyle = i % 2 ? '#ffef78' : '#ff714f';
          ctx.globalAlpha = .35 + spark * .5;
          ctx.beginPath();
          ctx.arc(
            x + spark * tailLength + flicker * 9,
            y - spark * tailLength * .7 + Math.cos(enemy.wobble + i) * 9,
            2 + (i % 3),
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        ctx.restore();
      } else {
        const dx = x - enemy.vanishX;
        const dy = y - enemy.vanishY;
        const length = Math.hypot(dx, dy) || 1;
        const ux = dx / length;
        const uy = dy / length;
        const streak = 22 + enemy.renderScale * 25;
        ctx.save();
        ctx.globalAlpha = Math.min(.48, .1 + enemy.depth * .4);
        ctx.strokeStyle = palette[0];
        ctx.lineWidth = Math.max(1.5, enemy.renderScale * 2.2);
        ctx.lineCap = 'round';
        for (let i = -2; i <= 2; i++) {
          const sideX = -uy * i * radius * enemy.renderScale * .42;
          const sideY = ux * i * radius * enemy.renderScale * .42;
          ctx.beginPath();
          ctx.moveTo(x + sideX - ux * streak, y + sideY - uy * streak);
          ctx.lineTo(x + sideX - ux * 5, y + sideY - uy * 5);
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.save();
      ctx.translate(x, y);
      const tilt = Math.sin(enemy.wobble) * .06;
      ctx.rotate(tilt);
      const scale = enemy.renderScale || 1;
      ctx.scale(scale * (1 + enemy.squash), scale * (1 - enemy.squash));

      if (enemy.kind === 'flyer') {
        const flap = Math.sin(enemy.wobble * 2.15);
        ctx.save();
        ctx.fillStyle = 'rgba(238,252,255,.72)';
        ctx.strokeStyle = 'rgba(62,92,117,.75)';
        ctx.lineWidth = 3;
        for (const side of [-1, 1]) {
          ctx.save();
          ctx.scale(side, 1);
          ctx.rotate(-.18 + flap * .2);
          ctx.beginPath();
          ctx.moveTo(-radius * .12, -radius * .18);
          ctx.bezierCurveTo(radius * .15, -radius * 1.28, radius * 1.25, -radius * 1.22, radius * 1.38, -radius * .28);
          ctx.quadraticCurveTo(radius * .66, -radius * .38, -radius * .12, -radius * .18);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(radius * .13, -radius * .3);
          ctx.lineTo(radius * 1.05, -radius * .82);
          ctx.strokeStyle = 'rgba(93,127,145,.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      } else if (enemy.kind === 'meteor') {
        // Uneven ember spikes turn the round monster into a living fireball.
        ctx.save();
        ctx.fillStyle = '#ff7649';
        ctx.strokeStyle = '#6f314d';
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4 + .15;
          const inner = radius * .7;
          const outer = radius * (1.08 + (i % 3) * .13);
          ctx.beginPath();
          ctx.moveTo(Math.cos(a - .22) * inner, Math.sin(a - .22) * inner);
          ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
          ctx.lineTo(Math.cos(a + .22) * inner, Math.sin(a + .22) * inner);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      } else if (enemy.kind === 'depth') {
        // Horns reinforce the looming silhouette as it grows toward camera.
        ctx.fillStyle = '#49354f';
        ctx.strokeStyle = '#252c3c';
        ctx.lineWidth = 3;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(side * radius * .48, -radius * .68);
          ctx.quadraticCurveTo(side * radius * 1.08, -radius * 1.36, side * radius * .82, -radius * .26);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }

      const grad = ctx.createRadialGradient(-radius * .32, -radius * .4, 2, 0, 0, radius * 1.2);
      grad.addColorStop(0, '#fff2c9');
      grad.addColorStop(.08, palette[0]);
      grad.addColorStop(1, palette[1]);
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#3e4860';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-radius * .88, radius * .45);
      ctx.quadraticCurveTo(-radius * 1.08, 0, -radius * .74, -radius * .55);
      ctx.quadraticCurveTo(-radius * .48, -radius * 1.08, 0, -radius * .87);
      ctx.quadraticCurveTo(radius * .52, -radius * 1.08, radius * .78, -radius * .48);
      ctx.quadraticCurveTo(radius * 1.08, .1 * radius, radius * .84, radius * .52);
      ctx.quadraticCurveTo(radius * .42, radius * .98, 0, radius * .82);
      ctx.quadraticCurveTo(-radius * .52, radius * 1.02, -radius * .88, radius * .45);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#37404d';
      if (enemy.kind === 'meteor') {
        ctx.strokeStyle = '#44253e';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(side * radius * .48, -radius * .31);
          ctx.lineTo(side * radius * .12, -radius * .12);
          ctx.stroke();
        }
        ctx.fillStyle = '#fff08d';
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(side * radius * .28, -radius * .08, 3.3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (enemy.kind === 'depth') {
        const iris = ctx.createRadialGradient(0, -4, 1, 0, -4, radius * .28);
        iris.addColorStop(0, '#24223a');
        iris.addColorStop(.35, '#fff17b');
        iris.addColorStop(1, '#e05267');
        ctx.fillStyle = '#fff3d7';
        ctx.beginPath();
        ctx.ellipse(0, -4, radius * .42, radius * .3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = iris;
        ctx.beginPath();
        ctx.ellipse(0, -4, radius * .2, radius * .27, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#262238';
        ctx.fillRect(-1.8, -radius * .28, 3.6, radius * .48);
      } else if (enemy.face === 0) {
        ctx.beginPath();
        ctx.arc(-radius * .28, -4, 3.4, 0, Math.PI * 2);
        ctx.arc(radius * .28, -4, 3.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#37404d';
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(side * radius * .38, -8);
          ctx.lineTo(side * radius * .14, -3);
          ctx.stroke();
        }
      }

      ctx.strokeStyle = '#37404d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (enemy.kind === 'depth') ctx.arc(0, radius * .3, radius * .2, Math.PI, 0);
      else if (enemy.kind === 'meteor') ctx.arc(0, radius * .34, radius * .2, Math.PI, 0);
      else ctx.arc(0, radius * .22, radius * .18, 0, Math.PI);
      ctx.stroke();

      if (enemy.kind === 'flyer') {
        ctx.strokeStyle = '#37404d';
        ctx.lineWidth = 2.5;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(side * radius * .35, -radius * .68);
          ctx.quadraticCurveTo(side * radius * .72, -radius * 1.12, side * radius * .92, -radius * .9);
          ctx.stroke();
          ctx.fillStyle = '#ffe96b';
          ctx.beginPath();
          ctx.arc(side * radius * .93, -radius * .9, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    function drawParticles() {
      for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.life * 9) % Math.PI);
        if (p.star) drawStar(0, 0, p.size, p.size * .45);
        else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      for (const f of floaters) {
        const alpha = Math.min(1, f.life * 3);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `1000 ${f.small ? 18 : 24}px "Arial Rounded MT Bold", sans-serif`;
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(255,255,255,.92)';
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
      }
    }

    function drawStar(x, y, outer, inner) {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5;
        const r = i % 2 ? inner : outer;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }

    function drawBiteZone() {
      if (state !== 'playing' || elapsed > 4.8) return;
      const alpha = Math.min(.72, Math.max(0, (4.8 - elapsed) / 1.2));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.setLineDash([8, 9]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.arc(PLAYER_X + 23, GROUND_Y - 55, 205, -.88, .88);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#19404a';
      ctx.font = '900 17px "Arial Rounded MT Bold", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ここまで来たらクリック！', PLAYER_X + 122, 270);
      ctx.restore();
    }

    function drawWaveNotice() {
      if (waveNotice <= 0 || state !== 'playing') return;
      const p = Math.min(1, (1.35 - waveNotice) * 5);
      const alpha = Math.min(1, waveNotice * 3) * p;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(W / 2, 105);
      ctx.scale(.8 + p * .2, .8 + p * .2);
      const isMeteorNotice = waveText.startsWith('METEOR');
      const noticeWidth = isMeteorNotice ? 370 : waveText.length > 13 ? 310 : 212;
      roundRect(ctx, -noticeWidth / 2, -24, noticeWidth, 48, 24);
      ctx.fillStyle = 'rgba(139,86,199,.9)';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `1000 ${isMeteorNotice ? 19 : 22}px "Arial Rounded MT Bold", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(waveText, 0, 1);
      ctx.restore();
    }

    function drawClearScene() {
      const t = clearTime;
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#35256f');
      sky.addColorStop(.52, '#6c78d9');
      sky.addColorStop(1, '#79dce3');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // A deep, celebratory sky filled with code-drawn stars.
      for (let i = 0; i < 35; i++) {
        const x = (i * 137 + 43) % W;
        const y = 30 + (i * 73) % 330;
        const twinkle = .4 + Math.sin(t * 4 + i * 1.7) * .25;
        ctx.save();
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = i % 4 === 0 ? '#ffe973' : '#fff';
        ctx.translate(x, y);
        ctx.rotate(t * .15 + i);
        drawStar(0, 0, 3 + (i % 3), 1.4 + (i % 2));
        ctx.restore();
      }

      ctx.save();
      ctx.globalAlpha = .18;
      ctx.fillStyle = '#fff';
      drawCloud(85 - t * 12, 350, 1.4);
      drawCloud(750 - t * 8, 410, 1.1);
      drawCloud(430 - t * 5, 95, .7);
      ctx.restore();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '1000 28px "Arial Rounded MT Bold", sans-serif';
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(50,37,111,.55)';
      ctx.strokeText('おなかいっぱい、そらいっぱい！', W / 2, 58);
      ctx.fillStyle = '#fff8c7';
      ctx.fillText('おなかいっぱい、そらいっぱい！', W / 2, 58);

      const flyP = Math.max(0, Math.min(1, t / 2.15));
      const flyEase = 1 - Math.pow(1 - flyP, 3);
      const playerX = 178 + (565 - 178) * flyEase;
      const playerY = 350 + (178 - 350) * flyEase - Math.sin(flyP * Math.PI) * 58;
      const swallowP = Math.max(0, Math.min(1, (t - 2.15) / 1.05));
      const swallowEase = swallowP * swallowP;
      const starX = 730 + (playerX + 28 - 730) * swallowEase;
      const starY = 150 + (playerY + 8 - 150) * swallowEase;
      const starScale = Math.max(0, 1 - swallowP * .82);

      // Flight trail.
      ctx.save();
      ctx.globalAlpha = .42 * (1 - swallowP);
      ctx.strokeStyle = '#bafbe7';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.setLineDash([4, 17]);
      ctx.beginPath();
      ctx.moveTo(128, 396);
      ctx.quadraticCurveTo(310, 310, playerX - 42, playerY + 28);
      ctx.stroke();
      ctx.restore();

      if (swallowP < 1) {
        ctx.save();
        ctx.translate(starX, starY);
        ctx.scale(starScale, starScale);
        ctx.rotate(t * 2.5);
        ctx.shadowColor = '#fff07b';
        ctx.shadowBlur = 28;
        ctx.fillStyle = '#ffec58';
        drawStar(0, 0, 49, 22);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ef9f3d';
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.fillStyle = '#574162';
        ctx.beginPath();
        ctx.arc(-12, -3, 3.5, 0, Math.PI * 2);
        ctx.arc(12, -3, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#574162';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 7, 9, 0, Math.PI);
        ctx.stroke();
        ctx.restore();
      }

      // Flying marimo: wing-like arms, soft fuzz and an intentionally cute face.
      ctx.save();
      ctx.translate(playerX, playerY + Math.sin(t * 5) * 4);
      ctx.rotate(Math.sin(t * 4) * .07 * (1 - swallowP));
      const gulp = t > 3.15 && t < 3.9 ? Math.sin((t - 3.15) / .75 * Math.PI) : 0;
      ctx.scale(1 + gulp * .14, 1 - gulp * .08);

      const flap = Math.sin(t * 11) * .38;
      ctx.strokeStyle = '#88572e';
      ctx.lineWidth = 15;
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.rotate(-.35 + flap * side);
        ctx.beginPath();
        ctx.moveTo(39, -3);
        ctx.quadraticCurveTo(70, -27, 84, -54);
        ctx.stroke();
        ctx.fillStyle = '#e7a057';
        ctx.beginPath();
        ctx.ellipse(87, -57, 18, 11, -.62, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      const clearBody = ctx.createRadialGradient(-18, -22, 5, 0, 0, 65);
      clearBody.addColorStop(0, '#ffe9a0');
      clearBody.addColorStop(.5, '#efa14f');
      clearBody.addColorStop(1, '#c07136');
      ctx.fillStyle = clearBody;
      ctx.strokeStyle = '#88572e';
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const a = i / 40 * Math.PI * 2;
        const r = 58 + (i % 2 ? 4 : 0) + Math.sin(i * 5.3) * 1.5;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#173f45';
      ctx.fillStyle = '#173f45';
      if (swallowP > .92) {
        ctx.lineWidth = 4;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(side * 18, -9, 8, .15 * Math.PI, .85 * Math.PI);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(0, 9, 17, .08 * Math.PI, .92 * Math.PI);
        ctx.stroke();
        ctx.fillStyle = '#ff809e';
        ctx.beginPath();
        ctx.ellipse(0, 23, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(-18, -9, 5.5, 7, 0, 0, Math.PI * 2);
        ctx.ellipse(18, -9, 5.5, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        const mouthOpen = Math.sin(swallowP * Math.PI) * 18;
        ctx.fillStyle = '#31233f';
        ctx.beginPath();
        ctx.ellipse(8, 10, 6 + mouthOpen, 5 + mouthOpen * .68, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      drawParticles();
    }

    function draw() {
      const sx = canvas.width / W;
      const sy = canvas.height / H;
      ctx.setTransform(sx, 0, 0, sy, 0, 0);
      ctx.clearRect(0, 0, W, H);

      ctx.save();
      if (shake > 0) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
      if (state === 'clearing') {
        drawClearScene();
      } else {
        drawBackground();
        drawBiteZone();
        const depthSortedEnemies = [...enemies].sort((a, b) => (a.renderScale || 1) - (b.renderScale || 1));
        for (const enemy of depthSortedEnemies) drawEnemy(enemy);
        drawPlayer();
        drawParticles();
        drawWaveNotice();
      }
      ctx.restore();

      if (flash > 0) {
        ctx.globalAlpha = flash * .26;
        ctx.fillStyle = state === 'gameover' ? '#ff5264' : '#fff';
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }
    }

    function frame(now) {
      const dt = Math.min(.04, Math.max(0, (now - lastFrame) / 1000));
      lastFrame = now;
      update(dt);
      draw();
      requestAnimationFrame(frame);
    }

    function onCanvasInput(event) {
      if (event.type === 'pointerdown') event.preventDefault();
      bite();
    }

    startButton.addEventListener('click', resetGame);
    retryButton.addEventListener('click', resetGame);
    replayButton.addEventListener('click', resetGame);
    resumeButton.addEventListener('click', togglePause);
    soundButton.addEventListener('click', toggleSound);
    canvas.addEventListener('pointerdown', onCanvasInput);
    MarimoControls.connect({bite,start:resetGame,pause:togglePause,getState:()=>state});
    window.addEventListener('resize', resize);

    bestTitleEl.textContent = `BEST ${best}`;
    resize();
    requestAnimationFrame(frame);

    // Tiny test hook for local smoke testing; it has no effect on normal play.
    if(location.hash==='#test'&&['127.0.0.1','localhost'].includes(location.hostname))window.__MARIMO_GAME__ = {
      getState: () => ({
        state,
        score,
        best,
        combo,
        elapsed,
        enemyCount: enemies.length,
        enemyKinds: enemies.map(enemy => enemy.kind),
        bitesLeft,
        fullness,
        formStage,
        clearTime
      }),
      start: resetGame,
      bite,
      togglePause,
      fillStage: () => { fullness = 100; updateProgressHud(); advanceForm(); },
      spawnNear: () => spawnEnemy({ x: PLAYER_X + 150, radius: 28 }),
      forceGameOver: endGame
    };
  })();
  

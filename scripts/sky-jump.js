(() => {
  'use strict';

  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const ui = {
    hud: document.querySelector('#hud'), stage: document.querySelector('#stage-value'),
    climb: document.querySelector('#climb-value'), goal: document.querySelector('#goal-value'),
    time: document.querySelector('#time-value'), timeCard: document.querySelector('#time-card'),
    progress: document.querySelector('#progress-fill'), combo: document.querySelector('#combo'),
    toast: document.querySelector('#toast'), startScreen: document.querySelector('#start-screen'),
    resultScreen: document.querySelector('#result-screen'), startButton: document.querySelector('#start-btn'),
    nextButton: document.querySelector('#next-btn'), resultKicker: document.querySelector('#result-kicker'),
    resultTitle: document.querySelector('#result-title'), resultValue: document.querySelector('#result-value'),
    resultMessage: document.querySelector('#result-message'), best: document.querySelector('#best-value'),
    bestCombo: document.querySelector('#best-combo-value')
  };

  const STATES = Object.freeze({ MENU: 'menu', READY: 'ready', PLAYING: 'playing', WON: 'won', LOST: 'lost' });
  const SPRITE = Object.freeze({ width: 384, height: 342, columns: 4 });
  const FRAME = Object.freeze({ IDLE: 0, IDLE_BLINK: 1, ANTICIPATION: 2, TAKEOFF: 3, RISE_TUCK: 4, RISE_STRETCH: 5, APEX: 6, FALL_EARLY: 7, FALL_FAST: 8, LAND: 9, RECOVER: 10, HURT: 11 });
  const COLORS = ['#78b94c', '#efb342', '#e26f3d', '#5aa9a4', '#9b6b4b'];
  const TAU = Math.PI * 2;
  const sprite = new Image();
  sprite.src = 'assets/sky-jump/goat-sprite-sheet-v1.png';

  let width = 0, height = 0, dpr = 1;
  let state = STATES.MENU, stage = 1, mission = null, player = null;
  let platforms = [], particles = [], clouds = [];
  let cameraX = 0, lastPlatformX = 0, lastPlatformY = 0;
  let remaining = 30, climbed = 0, combo = 0, bestCombo = 0, shake = 0;
  let readyUntil = 0, toastTimer = 0, lastTimestamp = performance.now(), audioContext = null;
  let nextAction = 'retry';
  const storedBest = Number(localStorage.getItem('goatSkyJumpBest') || 0);
  let allTimeBest = Number.isFinite(storedBest) ? storedBest : 0;

  function stageMission(number) {
    return {
      goal: 10 + (number - 1) * 2,
      seconds: Math.max(22, 30 - (number - 1) * 2),
      platformSpeed: 0.9 + (number - 1) * 0.16,
      gap: Math.min(215, 166 + (number - 1) * 7)
    };
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initClouds();
  }

  function initClouds() {
    clouds = Array.from({ length: Math.max(7, Math.ceil(width / 150)) }, (_, index) => ({
      x: index * 190 + Math.random() * 90,
      y: 70 + Math.random() * Math.max(100, height * 0.52),
      scale: 0.6 + Math.random() * 0.8,
      depth: 0.08 + Math.random() * 0.16
    }));
  }

  function roundRect(context, x, y, rectWidth, rectHeight, radius) {
    const r = Math.min(radius, rectWidth / 2, rectHeight / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + rectWidth, y, x + rectWidth, y + rectHeight, r);
    context.arcTo(x + rectWidth, y + rectHeight, x, y + rectHeight, r);
    context.arcTo(x, y + rectHeight, x, y, r);
    context.arcTo(x, y, x + rectWidth, y, r);
    context.closePath();
  }

  class Platform {
    constructor(x, y, platformWidth, index, isStart = false) {
      this.baseX = x; this.baseY = y; this.x = x; this.y = y;
      this.previousX = x; this.previousY = y;
      this.width = platformWidth; this.height = 18; this.index = index;
      this.color = COLORS[index % COLORS.length];
      this.visited = isStart; this.isStart = isStart;
      this.phase = Math.random() * TAU;
      this.axis = isStart ? 'none' : (index % 3 === 0 ? 'x' : 'y');
      this.amplitude = isStart ? 0 : (this.axis === 'x' ? 22 + Math.random() * 26 : 18 + Math.random() * 34);
      this.speedTier = index % 4;
      this.speed = isStart ? 0 : mission.platformSpeed * (0.72 + this.speedTier * 0.18 + Math.random() * 0.12);
      this.dx = 0; this.dy = 0;
    }

    update(time) {
      this.previousX = this.x; this.previousY = this.y;
      if (this.axis === 'x') this.x = this.baseX + Math.sin(time * this.speed + this.phase) * this.amplitude;
      if (this.axis === 'y') this.y = this.baseY + Math.sin(time * this.speed + this.phase) * this.amplitude;
      this.dx = this.x - this.previousX; this.dy = this.y - this.previousY;
    }

    draw() {
      const screenX = this.x - cameraX;
      if (screenX + this.width < -50 || screenX > width + 50) return;
      ctx.save();
      ctx.translate(screenX, this.y);
      if (!this.visited && !this.isStart) {
        ctx.globalAlpha = 0.24; ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.ellipse(this.width / 2, 9, this.width * 0.62, 19, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
      roundRect(ctx, 0, 0, this.width, this.height, 8); ctx.fillStyle = '#59362a'; ctx.fill();
      roundRect(ctx, 3, -3, this.width - 6, 12, 6); ctx.fillStyle = this.color; ctx.fill();
      roundRect(ctx, 10, -1, Math.max(12, this.width * 0.36), 3, 2); ctx.fillStyle = 'rgba(255,255,255,.42)'; ctx.fill();
      if (this.axis !== 'none') {
        ctx.fillStyle = 'rgba(65,39,28,.58)'; ctx.font = '900 9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`${this.axis === 'x' ? '↔' : '↕'}${'›'.repeat(this.speedTier + 1)}`, this.width / 2, 15);
      }
      ctx.restore();
    }
  }

  class Particle {
    constructor(x, y, color, powerful = false) {
      this.x = x; this.y = y;
      this.vx = (Math.random() - 0.5) * (powerful ? 310 : 210);
      this.vy = -50 - Math.random() * (powerful ? 230 : 130);
      this.gravity = 480; this.life = 0.45 + Math.random() * 0.35; this.maxLife = this.life;
      this.radius = 2 + Math.random() * 4; this.color = color;
    }
    update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.vy += this.gravity * dt; this.life -= dt; }
    draw() {
      if (this.life <= 0) return;
      ctx.globalAlpha = Math.max(0, this.life / this.maxLife); ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.arc(this.x - cameraX, this.y, this.radius, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
  }

  function startStage(nextStage = stage) {
    stage = nextStage; mission = stageMission(stage); remaining = mission.seconds;
    climbed = 0; combo = 0; bestCombo = 0; cameraX = 0; shake = 0;
    particles = []; platforms = [];
    const floorY = Math.min(height - 96, Math.max(330, height * 0.76));
    const start = new Platform(70, floorY, 150, 0, true);
    platforms.push(start); lastPlatformX = start.x; lastPlatformY = start.y;
    for (let index = 1; index <= mission.goal + 8; index += 1) generatePlatform(index, floorY);
    player = {
      x: start.x + 55, y: start.y - 36, width: 92, height: 72,
      vx: 125, vy: 0, grounded: true, platform: start, airJumps: 1,
      coyote: 0.1, jumpBuffer: 0, landingTime: 0, takeoffTime: 0,
      hurtTime: 0, lastLandingAt: performance.now()
    };
    state = STATES.READY; readyUntil = performance.now() + 1900;
    ui.startScreen.hidden = true; ui.resultScreen.hidden = true; ui.hud.hidden = false;
    updateHud(); showToast('3');
    setTimeout(() => state === STATES.READY && showToast('2'), 600);
    setTimeout(() => state === STATES.READY && showToast('1'), 1200);
    setTimeout(() => state === STATES.READY && showToast('GO!'), 1800);
  }

  function generatePlatform(index, floorY) {
    lastPlatformX += mission.gap + Math.random() * 48;
    const wave = Math.sin(index * 1.35) * Math.min(86, height * 0.12);
    const jitter = (Math.random() - 0.5) * 66;
    lastPlatformY = clamp(floorY - 34 + wave + jitter, Math.max(150, height * 0.27), floorY + 34);
    const platformWidth = Math.max(92, 142 - stage * 4 - Math.random() * 30);
    platforms.push(new Platform(lastPlatformX, lastPlatformY, platformWidth, index));
  }

  function requestJump() {
    if (state !== STATES.READY && state !== STATES.PLAYING) return;
    ensureAudio(); player.jumpBuffer = 0.12;
  }

  function performJump(isAirJump) {
    player.vy = -535 - Math.min(35, (stage - 1) * 4);
    player.vx = Math.max(player.vx, 245 + Math.min(stage * 8, 40));
    player.grounded = false; player.platform = null; player.coyote = 0;
    player.jumpBuffer = 0; player.takeoffTime = 0.16;
    if (isAirJump) player.airJumps -= 1;
    burst(player.x - 22, player.y + player.height / 2, isAirJump ? '#fff0a8' : '#e9c56d', 8, false);
    sound(isAirJump ? 610 : 430, 0.08, 'sine', 0.045);
  }

  function updateGame(dt, timestamp) {
    const time = timestamp / 1000;
    platforms.forEach(platform => platform.update(time));
    if (state === STATES.READY) {
      if (player.platform) { player.x += player.platform.dx; player.y += player.platform.dy; }
      if (timestamp >= readyUntil) state = STATES.PLAYING;
      return;
    }
    if (state !== STATES.PLAYING) return;
    remaining = Math.max(0, remaining - dt);
    if (remaining <= 0) { endStage(false, 'time'); return; }
    player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
    player.coyote = Math.max(0, player.coyote - dt);
    player.landingTime = Math.max(0, player.landingTime - dt);
    player.takeoffTime = Math.max(0, player.takeoffTime - dt);
    if (player.grounded && player.platform) {
      player.x += player.platform.dx; player.y += player.platform.dy; player.coyote = 0.11;
    }
    if (player.jumpBuffer > 0) {
      if (player.grounded || player.coyote > 0) performJump(false);
      else if (player.airJumps > 0) performJump(true);
    }
    const previousBottom = player.y + player.height / 2;
    player.vy += 1320 * dt;
    player.vx += (205 - player.vx) * Math.min(1, dt * 1.65);
    player.x += player.vx * dt; player.y += player.vy * dt;
    player.grounded = false; player.platform = null;
    const currentBottom = player.y + player.height / 2;
    if (player.vy >= 0) {
      for (const platform of platforms) {
        const overlapsX = player.x + player.width * 0.27 > platform.x && player.x - player.width * 0.27 < platform.x + platform.width;
        const crossedTop = previousBottom <= platform.y + 8 && currentBottom >= platform.y && currentBottom <= platform.y + platform.height + 18;
        if (!overlapsX || !crossedTop) continue;
        player.y = platform.y - player.height / 2; player.vy = 0; player.grounded = true;
        player.platform = platform; player.airJumps = 1; player.landingTime = 0.18;
        const quickLanding = timestamp - player.lastLandingAt < 2300;
        player.lastLandingAt = timestamp;
        if (!platform.visited) registerLanding(platform, quickLanding);
        break;
      }
    }
    if (!player.grounded && player.y > height + 130) { player.hurtTime = 1; endStage(false, 'fall'); }
    const targetCamera = Math.max(0, player.x - width * 0.28);
    cameraX += (targetCamera - cameraX) * Math.min(1, dt * 4.6);
    platforms = platforms.filter(platform => platform.x + platform.width > cameraX - 260);
    particles.forEach(particle => particle.update(dt));
    particles = particles.filter(particle => particle.life > 0);
    shake = Math.max(0, shake - dt * 28); updateHud();
  }

  function registerLanding(platform, quickLanding) {
    platform.visited = true; climbed += 1; combo = quickLanding ? combo + 1 : 1;
    bestCombo = Math.max(bestCombo, combo); shake = 6;
    burst(player.x, platform.y, platform.color, 14, true);
    sound(180 + Math.min(360, climbed * 22), 0.09, 'triangle', 0.055);
    if (combo >= 3) { ui.combo.textContent = `COMBO ×${combo}`; ui.combo.hidden = false; }
    else ui.combo.hidden = true;
    if (climbed === Math.ceil(mission.goal / 2)) showToast('HALFWAY!');
    if (climbed >= mission.goal) endStage(true, 'goal');
  }

  function burst(x, y, color, amount, powerful) {
    for (let i = 0; i < amount; i += 1) particles.push(new Particle(x, y, color, powerful));
  }

  function endStage(won, reason) {
    if (state !== STATES.PLAYING) return;
    state = won ? STATES.WON : STATES.LOST; ui.hud.hidden = true; ui.combo.hidden = true;
    allTimeBest = Math.max(allTimeBest, climbed); localStorage.setItem('goatSkyJumpBest', String(allTimeBest));
    ui.resultValue.textContent = String(climbed); ui.best.textContent = String(allTimeBest); ui.bestCombo.textContent = String(bestCombo);
    if (won) {
      ui.resultKicker.textContent = 'STAGE CLEAR!'; ui.resultTitle.textContent = `ステージ ${stage} クリア`;
      ui.resultMessage.textContent = `残り ${remaining.toFixed(1)}秒！ 次は足場がさらに速くなる。`;
      ui.nextButton.textContent = `ステージ ${stage + 1} へ`; nextAction = 'next';
      sound(660, 0.12, 'sine', 0.06); setTimeout(() => sound(880, 0.18, 'sine', 0.06), 120);
    } else {
      ui.resultKicker.textContent = reason === 'time' ? 'TIME UP' : 'KEEP CLIMBING';
      ui.resultTitle.textContent = reason === 'time' ? 'タイムアップ！' : '落ちちゃった！';
      ui.resultMessage.textContent = `あと ${Math.max(0, mission.goal - climbed)}本。動きの遅い足場から狙おう。`;
      ui.nextButton.textContent = 'もう一度'; nextAction = 'retry'; sound(150, 0.2, 'sawtooth', 0.045);
    }
    const finishedState = state;
    window.setTimeout(() => {
      if (state === finishedState) ui.resultScreen.hidden = false;
    }, 420);
  }

  function updateHud() {
    ui.stage.textContent = String(stage); ui.climb.textContent = String(climbed); ui.goal.textContent = String(mission.goal);
    ui.time.textContent = remaining.toFixed(1); ui.progress.style.width = `${Math.min(100, climbed / mission.goal * 100)}%`;
    ui.timeCard.classList.toggle('is-danger', remaining <= 8);
  }

  function showToast(message) {
    window.clearTimeout(toastTimer); ui.toast.textContent = message; ui.toast.hidden = false;
    ui.toast.style.animation = 'none'; void ui.toast.offsetWidth; ui.toast.style.animation = '';
    toastTimer = window.setTimeout(() => { ui.toast.hidden = true; }, 520);
  }

  function selectFrame(timestamp) {
    if (!player) return FRAME.IDLE;
    if (state === STATES.LOST && player.hurtTime > 0) return FRAME.HURT;
    if (player.landingTime > 0.09) return FRAME.LAND;
    if (player.landingTime > 0) return FRAME.RECOVER;
    if (player.takeoffTime > 0.08) return FRAME.TAKEOFF;
    if (player.takeoffTime > 0) return FRAME.RISE_TUCK;
    if (player.grounded) return Math.floor(timestamp / 520) % 5 === 4 ? FRAME.IDLE_BLINK : FRAME.IDLE;
    if (player.vy < -260) return FRAME.RISE_STRETCH;
    if (player.vy < -45) return FRAME.RISE_TUCK;
    if (player.vy < 100) return FRAME.APEX;
    if (player.vy < 390) return FRAME.FALL_EARLY;
    return FRAME.FALL_FAST;
  }

  function drawSprite(timestamp) {
    if (!player || !sprite.complete || !sprite.naturalWidth) return;
    const frame = selectFrame(timestamp), sx = frame % SPRITE.columns * SPRITE.width;
    const sy = Math.floor(frame / SPRITE.columns) * SPRITE.height;
    const drawWidth = Math.min(128, Math.max(94, width * 0.105));
    const drawHeight = drawWidth * SPRITE.height / SPRITE.width;
    const rotation = state === STATES.LOST ? Math.min(0.55, player.vy / 900) : clamp(player.vy / 3200, -0.12, 0.16);
    ctx.save(); ctx.translate(player.x - cameraX, player.y - 5); ctx.rotate(rotation);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sprite, sx, sy, SPRITE.width, SPRITE.height, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  }

  function drawCloud(x, y, scale) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.fillStyle = 'rgba(255,249,215,.62)';
    ctx.beginPath(); ctx.arc(-30, 8, 24, 0, TAU); ctx.arc(0, -2, 34, 0, TAU); ctx.arc(34, 9, 23, 0, TAU); ctx.rect(-30, 8, 64, 25); ctx.fill(); ctx.restore();
  }

  function drawMountains(baseY, color, parallax, peakWidth) {
    const scrollX = cameraX * parallax;
    const firstPeakIndex = Math.floor(scrollX / peakWidth) - 1;
    const firstPeakX = firstPeakIndex * peakWidth - scrollX;
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, height); ctx.lineTo(0, baseY);
    let peakIndex = firstPeakIndex;
    for (let x = firstPeakX; x < width + peakWidth; x += peakWidth, peakIndex += 1) {
      const peak = baseY - 45 - ((Math.abs(peakIndex) % 2) * 35);
      ctx.lineTo(x + peakWidth * 0.5, peak); ctx.lineTo(x + peakWidth, baseY);
    }
    ctx.lineTo(width, height); ctx.closePath(); ctx.fill();
  }

  function drawBackground(timestamp) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#f78348'); gradient.addColorStop(0.48, '#ffc467'); gradient.addColorStop(1, '#fff0b3');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255,248,205,.58)'; ctx.beginPath(); ctx.arc(width * 0.76, height * 0.22, Math.min(88, width * 0.1), 0, TAU); ctx.fill();
    clouds.forEach((cloud, index) => {
      const loopWidth = width + 380;
      const x = ((cloud.x - cameraX * cloud.depth + timestamp * 0.004 * (index % 2 ? 1 : -1)) % loopWidth + loopWidth) % loopWidth - 180;
      drawCloud(x, cloud.y, cloud.scale);
    });
    drawMountains(height * 0.67, '#d78351', 0.08, 150);
    drawMountains(height * 0.79, '#72905b', 0.15, 112);
    const ground = height * 0.88, spacing = 72, treeScrollX = cameraX * 0.28;
    const firstTreeIndex = Math.floor(treeScrollX / spacing) - 1;
    const firstTreeX = firstTreeIndex * spacing - treeScrollX;
    let treeIndex = firstTreeIndex;
    for (let x = firstTreeX; x < width + spacing; x += spacing, treeIndex += 1) {
      const size = 36 + (Math.abs(treeIndex) % 3) * 10;
      ctx.fillStyle = '#416c4f'; ctx.beginPath(); ctx.moveTo(x, ground); ctx.lineTo(x + size / 2, ground - size * 1.65); ctx.lineTo(x + size, ground); ctx.fill();
    }
  }

  function drawTargetHint() {
    if (state !== STATES.PLAYING || !player || player.grounded) return;
    const target = platforms.find(platform => !platform.visited && platform.x + platform.width >= player.x - 30);
    if (!target) return;
    const targetX = target.x + target.width / 2 - cameraX;
    if (targetX < 0 || targetX > width) return;
    ctx.save(); ctx.globalAlpha = 0.62; ctx.fillStyle = '#fff8cb'; ctx.beginPath();
    ctx.moveTo(targetX, target.y - 22); ctx.lineTo(targetX - 7, target.y - 34); ctx.lineTo(targetX + 7, target.y - 34); ctx.closePath(); ctx.fill(); ctx.restore();
  }

  function draw(timestamp) {
    drawBackground(timestamp);
    if (!player) return;
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    platforms.forEach(platform => platform.draw()); particles.forEach(particle => particle.draw());
    drawTargetHint(); drawSprite(timestamp); ctx.restore();
  }

  function ensureAudio() {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
  }

  function sound(frequency, duration, type, volume) {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
    oscillator.type = type; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
  }

  function handlePrimaryAction(event) {
    if (event) event.preventDefault();
    ensureAudio();
    if (state === STATES.MENU) startStage(1);
    else if (state === STATES.WON || state === STATES.LOST) startStage(nextAction === 'next' ? stage + 1 : stage);
  }

  canvas.addEventListener('pointerdown', event => { event.preventDefault(); requestJump(); });
  ui.startButton.addEventListener('click', handlePrimaryAction);
  ui.nextButton.addEventListener('click', handlePrimaryAction);
  window.addEventListener('keydown', event => {
    if (!['Space', 'ArrowUp', 'KeyW'].includes(event.code)) return;
    event.preventDefault();
    if (state === STATES.MENU || state === STATES.WON || state === STATES.LOST) handlePrimaryAction();
    else if (!event.repeat) requestJump();
  });
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { lastTimestamp = performance.now(); });

  function loop(timestamp) {
    const dt = Math.min(0.034, Math.max(0, (timestamp - lastTimestamp) / 1000));
    lastTimestamp = timestamp; updateGame(dt, timestamp); draw(timestamp); requestAnimationFrame(loop);
  }

  resize();
  requestAnimationFrame(loop);
})();

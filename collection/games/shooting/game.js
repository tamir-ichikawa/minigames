// ============================================================
// ASTRA PATROL - HTML5 Shooting Game
// ============================================================

const CANVAS_W = 480, CANVAS_H = 720;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

// Scale canvas to fit screen
function resizeCanvas() {
  const ratio = CANVAS_W / CANVAS_H;
  let w = window.innerWidth, h = window.innerHeight;
  if (w / h > ratio) { canvas.style.height = h + 'px'; canvas.style.width = (h * ratio) + 'px'; }
  else { canvas.style.width = w + 'px'; canvas.style.height = (w / ratio) + 'px'; }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ============================================================
// Asset Loading
// ============================================================
const images = {};
let selectedShip = 0;
try { selectedShip = Math.floor(Math.max(0, Math.min(2, Number(localStorage.getItem('astra_ship')) || 0))); } catch {}
const shipDefinition = () => AstraFleet.players[selectedShip];
const practiceBoss = Math.floor(Math.max(0, Math.min(6, Number(new URLSearchParams(location.search).get('boss')) || 0)));
const inspecting = new URLSearchParams(location.search).has('inspect-player') || new URLSearchParams(location.search).has('inspect-fleet');
const PLAYER_SPRITES = new Set(AstraFleet.players.map(ship=>ship.id));
const assetList = [
  ['player', 'sprites/01_player_standard_clean.png'],
  ['player_speed', 'sprites/02_player_speed_clean.png'],
  ['player_power', 'sprites/03_player_power_clean.png'],
  ['enemy_core', 'sprites/04_enemy_core_fighter.png'],
  ['enemy_scout', 'sprites/05_enemy_scout_drone.png'],
  ['enemy_laser', 'sprites/06_enemy_laser_ship.png'],
  ['enemy_bat', 'sprites/07_enemy_fire_bat.png'],
  ['enemy_tank', 'sprites/08_enemy_armored_tank.png'],
  ['enemy_float', 'sprites/09_enemy_float_unit.png'],
  ['boss', 'sprites/10_boss_nebula_core.png'],
  ['boss_side', 'sprites/11_boss_side.png'],
  ['boss_explode', 'sprites/12_boss_explosion.png'],
  ['shot', 'sprites/13_shot_blue.png'],
  ['shot_wide', 'sprites/14_shot_wide.png'],
  ['laser', 'sprites/15_laser_blue.png'],
  ['missile', 'sprites/16_missile_blue.png'],
  ['burst', 'sprites/17_burst_blue.png'],
  ['thruster', 'sprites/18_thruster_blue.png'],
  ['bullet_red', 'sprites/19_bullet_red.png'],
  ['bullet_purple', 'sprites/20_bullet_purple.png'],
  ['bullet_orange', 'sprites/21_bullet_orange.png'],
  ['bullet_cyan', 'sprites/22_bullet_cyan.png'],
  ['missile_pink', 'sprites/23_missile_pink.png'],
  ['orb', 'sprites/24_orb_purple.png'],
  ['sm_core', 'sprites/25_small_core_fighter.png'],
  ['sm_scout', 'sprites/26_small_scout_drone.png'],
  ['sm_laser', 'sprites/27_small_laser_ship.png'],
  ['sm_bat', 'sprites/28_small_fire_bat.png'],
  ['sm_tank', 'sprites/29_small_armored_tank.png'],
  ['sm_float', 'sprites/30_small_float_unit.png'],
  ['atk_radial', 'sprites/31_attack_radial.png'],
  ['atk_ring', 'sprites/32_attack_ring.png'],
  ['laser_purple', 'sprites/33_laser_purple.png'],
  ['impact', 'sprites/34_impact_pink.png'],
  ['explosion', 'sprites/35_explosion_orange.png'],
  ['player_small', 'sprites/36_player_small.png'],
];
for (const [id, entry] of Object.entries(AstraAtlas.ships)) assetList.push(['sheet_'+id, entry.file]);
for (const [id, entry] of Object.entries(AstraAtlas.effects)) assetList.push(['fx_'+id, entry.file]);

let loaded=0;
async function loadAssets() {
  await Promise.all(assetList.map(([name,src])=>new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{
      images[name]=PLAYER_SPRITES.has(name)?PlayerGeometry.trim(img):img;
      loaded++;document.getElementById('loadbar').style.width=loaded/assetList.length*100+'%';resolve();
    };
    img.onerror=()=>reject(new Error('画像を読み込めません: '+src));img.src=src;
  })));
  SpriteAnimation.prepare(images);Explosions.prepare(images);
  document.getElementById('loading').hidden=true;
}

// ============================================================
// Input
// ============================================================
const keys = {};
const touch = { active: false, x: 0, y: 0, prevX: 0, prevY: 0, shoot: false };
let clickedThisFrame = false;

document.addEventListener('keydown', e => {
  if (e.target.matches('input, button, select, textarea')) return;
  keys[e.code] = true;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyZ'].includes(e.code)) e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_W / rect.width;
  const scaleY = CANVAS_H / rect.height;
  touch.active = true;
  touch.x = (e.touches[0].clientX - rect.left) * scaleX;
  touch.y = (e.touches[0].clientY - rect.top) * scaleY;
  touch.prevX = touch.x;
  touch.prevY = touch.y;
  touch.shoot = true;
  clickedThisFrame = true;
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_W / rect.width;
  const scaleY = CANVAS_H / rect.height;
  touch.prevX = touch.x;
  touch.prevY = touch.y;
  touch.x = (e.touches[0].clientX - rect.left) * scaleX;
  touch.y = (e.touches[0].clientY - rect.top) * scaleY;
}, { passive: false });

canvas.addEventListener('touchend', e => { e.preventDefault(); touch.active = false; touch.shoot = false; }, { passive: false });

// Mouse support
let mouseDown = false;
canvas.addEventListener('mousedown', e => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_W / rect.width;
  const scaleY = CANVAS_H / rect.height;
  mouseDown = true;
  touch.active = true;
  clickedThisFrame = true;
  touch.x = (e.clientX - rect.left) * scaleX;
  touch.y = (e.clientY - rect.top) * scaleY;
  touch.prevX = touch.x;
  touch.prevY = touch.y;
  touch.shoot = true;
});
canvas.addEventListener('mousemove', e => {
  if (!mouseDown) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_W / rect.width;
  const scaleY = CANVAS_H / rect.height;
  touch.prevX = touch.x;
  touch.prevY = touch.y;
  touch.x = (e.clientX - rect.left) * scaleX;
  touch.y = (e.clientY - rect.top) * scaleY;
});
canvas.addEventListener('mouseup', () => { mouseDown = false; touch.active = false; touch.shoot = false; });

// ============================================================
// Sound (simple web audio synth)
// ============================================================
let audioCtx;
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(type) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const t = audioCtx.currentTime;

  if (type === 'shoot') {
    osc.type = 'square'; osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.05);
    gain.gain.setValueAtTime(0.08, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.start(t); osc.stop(t + 0.08);
  } else if (type === 'hit') {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.15);
    gain.gain.setValueAtTime(0.12, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.start(t); osc.stop(t + 0.15);
  } else if (type === 'explode') {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.4);
    gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.start(t); osc.stop(t + 0.4);
  } else if (type === 'powerup') {
    osc.type = 'sine'; osc.frequency.setValueAtTime(523, t);
    osc.frequency.setValueAtTime(659, t + 0.08);
    osc.frequency.setValueAtTime(784, t + 0.16);
    gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.start(t); osc.stop(t + 0.3);
  } else if (type === 'boss') {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.6);
    gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.start(t); osc.stop(t + 0.6);
  } else if (type === 'death') {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.8);
    gain.gain.setValueAtTime(0.2, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    osc.start(t); osc.stop(t + 0.8);
  }
}

// ============================================================
// Stars background
// ============================================================
const stars = [];
for (let i = 0; i < 150; i++) {
  stars.push({
    x: Math.random() * CANVAS_W,
    y: Math.random() * CANVAS_H,
    speed: 0.3 + Math.random() * 2,
    size: 0.5 + Math.random() * 1.5,
    brightness: 0.3 + Math.random() * 0.7
  });
}

function updateStars() {
  stars.forEach(s => {
    s.y += s.speed;
    if (s.y > CANVAS_H) { s.y = 0; s.x = Math.random() * CANVAS_W; }
  });
}

function drawStars() {
  stars.forEach(s => {
    ctx.fillStyle = `rgba(180, 200, 255, ${s.brightness})`;
    ctx.fillRect(s.x, s.y, s.size, s.size);
  });
}

// ============================================================
// Particles
// ============================================================
const particles = [];

function spawnParticles(x, y, color, count, speed, life) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = Math.random() * speed;
    particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: life || 30,
      maxLife: life || 30,
      color,
      size: 1 + Math.random() * 3
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  particles.forEach(p => {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  });
  ctx.globalAlpha = 1;
}

// ============================================================
// Draw sprite helper
// ============================================================
function drawSprite(img, x, y, w, h, rot) {
  if (!img) return;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

// ============================================================
// Game State
// ============================================================
let gameState = 'title'; // title, playing, gameover, victory
let score = 0, highScore = 0;
try { highScore = Math.max(0,parseInt(localStorage.getItem('astra_hi'))||0); } catch {}
let lives = 3;
let maxLives = 3;
let weaponLevel = 1;
let weaponType = 0; // 0=normal, 1=wide, 2=laser, 3=missile
const weaponNames = ['NORMAL', 'WIDE', 'LASER', 'MISSILE'];
let shakeTimer = 0;
let wave = 0;
let waveTimer = 0;
let bossActive = false;
let gameTime = 0;
let invincibleTimer = 0;
let comboCount = 0;
let comboTimer = 0;
let showWaveText = 0;
let waveTextStr = '';
let hitFlashTimer = 0;  // Red flash on hit
let deathAnimTimer = 0; // Death explosion animation

// ============================================================
// Player
// ============================================================
const player = { x: CANVAS_W / 2, y: CANVAS_H - 100, w: 48, h: 55, shootCD: 0, lean:0 };

function playerFrame() {
  return SpriteAnimation.frame(shipDefinition().id, player.lean, player.x, player.y, player.h);
}

// Gameplay collision uses a forgiving core circle, independent of wing pixels
// and animation bounds. Banking never shifts or enlarges this circle.
function playerHitbox() {
  const radius=shipDefinition().hitRadius;
  return {x:player.x,y:player.y,w:radius*2,h:radius*2,radius};
}
function drawPlayerHitbox(context,filled=false,body=playerHitbox(),color=shipDefinition().color) {
  context.save();context.beginPath();context.arc(body.x,body.y,body.radius,0,Math.PI*2);
  if(filled){context.fillStyle='rgba(255,70,100,.55)';context.fill();}
  context.strokeStyle=filled?'#ff8da5':color;
  context.globalAlpha=filled?1:.65;context.lineWidth=.8;context.stroke();
  context.fillStyle='#fff';context.globalAlpha=.9;context.beginPath();context.arc(body.x,body.y,1.2,0,Math.PI*2);context.fill();context.restore();
}

function clampPlayer() {
  const body = playerFrame();
  player.w = body.w;
  player.x += Math.max(0, body.w/2-body.x) - Math.max(0, body.x+body.w/2-CANVAS_W);
  player.y += Math.max(0, body.h/2-body.y) - Math.max(0, body.y+body.h/2-CANVAS_H);
}

function updatePlayer(dt) {
  if (lives <= 0) return;
  const speed = shipDefinition().speed;
  const oldX = player.x;

  // Keyboard
  if (keys['ArrowLeft'] || keys['KeyA']) player.x -= speed;
  if (keys['ArrowRight'] || keys['KeyD']) player.x += speed;
  if (keys['ArrowUp'] || keys['KeyW']) player.y -= speed;
  if (keys['ArrowDown'] || keys['KeyS']) player.y += speed;

  // Touch / Mouse
  if (touch.active) {
    const dx = touch.x - touch.prevX;
    const dy = touch.y - touch.prevY;
    player.x += dx;
    player.y += dy;
    touch.prevX = touch.x;
    touch.prevY = touch.y;
  }

  // The cropped hull keeps its aspect ratio, including after a weapon change.
  clampPlayer();
  const targetLean = Math.max(-1, Math.min(1, (player.x-oldX)/speed));
  player.lean += (targetLean-player.lean)*.25;
  clampPlayer();

  // Shooting
  player.shootCD--;
  const shooting = keys['Space'] || keys['KeyZ'] || touch.active;
  if (shooting && player.shootCD <= 0) {
    firePlayerBullet();
    player.shootCD = weaponType === 2 ? 6 : weaponType === 3 ? 15 : 8;
    playSound('shoot');
  }

  if (invincibleTimer > 0) invincibleTimer--;
  if (comboTimer > 0) { comboTimer--; if (comboTimer <= 0) comboCount = 0; }
}

function drawPlayer() {
  if (lives <= 0) return;
  if (invincibleTimer > 0 && Math.floor(invincibleTimer / 3) % 2 === 0) return;

  const body = playerFrame();
  PlayerGeometry.drawExhaust(ctx, body, body.nozzles, gameTime);

  // Damage tint based on lives
  if (lives <= 1) {
    // Heavy damage: red tint + smoke particles
    ctx.globalAlpha = 0.9;
    SpriteAnimation.draw(ctx, body, true);
    ctx.globalAlpha = 1;

  } else if (lives <= 2) {
    // Light damage: slight tint + occasional sparks
    SpriteAnimation.draw(ctx, body);

  } else {
    // Full health: normal
    SpriteAnimation.draw(ctx, body);
  }
  drawPlayerHitbox(ctx);
}

// ============================================================
// Player Bullets
// ============================================================
const playerBullets = [];

function firePlayerBullet() {
  const x = player.x, y = player.y - player.h / 2;

  if (weaponType === 0) { // Normal
    const lvl = weaponLevel;
    playerBullets.push({ x, y, vx: 0, vy: -10, w: 24, h: 42, dmg: 2, img: 'shot' });
    if (lvl >= 2) {
      playerBullets.push({ x: x - 14, y: y + 5, vx: -0.5, vy: -10, w: 40, h: 64, dmg: 1, img: 'shot' });
      playerBullets.push({ x: x + 14, y: y + 5, vx: 0.5, vy: -10, w: 40, h: 64, dmg: 1, img: 'shot' });
    }
    if (lvl >= 3) {
      playerBullets.push({ x: x - 24, y: y + 10, vx: -1.5, vy: -9, w: 40, h: 64, dmg: 1, img: 'shot' });
      playerBullets.push({ x: x + 24, y: y + 10, vx: 1.5, vy: -9, w: 40, h: 64, dmg: 1, img: 'shot' });
    }
  } else if (weaponType === 1) { // Wide
    const spread = weaponLevel >= 3 ? 7 : weaponLevel >= 2 ? 5 : 3;
    for (let i = 0; i < spread; i++) {
      const angle = -Math.PI / 2 + (i - (spread - 1) / 2) * 0.15;
      playerBullets.push({ x, y, vx: Math.cos(angle) * 9, vy: Math.sin(angle) * 9, w: 48, h: 52, dmg: 0.8, img: 'shot_wide' });
    }
  } else if (weaponType === 2) { // Laser - much thicker beam
    const w = weaponLevel >= 3 ? 100 : weaponLevel >= 2 ? 76 : 56;
    playerBullets.push({ x, y, vx: 0, vy: -15, w, h: 110, dmg: 1, img: 'laser', pierce: true });
  } else if (weaponType === 3) { // Missile - larger and more visible
    const cnt = weaponLevel >= 3 ? 4 : weaponLevel >= 2 ? 3 : 2;
    for (let i = 0; i < cnt; i++) {
      const ox = (i - (cnt - 1) / 2) * 22;
      playerBullets.push({ x: x + ox, y, vx: ox * 0.1, vy: -6, w: 56, h: 88, dmg: 3, img: 'missile', homing: true });
    }
  }
}

function updatePlayerBullets() {
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    const b = playerBullets[i];

    if (b.homing && (enemies.length > 0 || boss)) {
      let closest = null, minD = Infinity;
      [...enemies, ...(boss && !boss.entering ? [boss] : [])].forEach(e => {
        const d = Math.hypot(e.x - b.x, e.y - b.y);
        if (d < minD) { minD = d; closest = e; }
      });
      if (closest && minD < 300) {
        const angle = Math.atan2(closest.y - b.y, closest.x - b.x);
        b.vx += Math.cos(angle) * 0.5;
        b.vy += Math.sin(angle) * 0.5;
        const spd = Math.hypot(b.vx, b.vy);
        if (spd > 8) { b.vx = b.vx / spd * 8; b.vy = b.vy / spd * 8; }
      }
    }

    b.x += b.vx;
    b.y += b.vy;
    if (b.y < -30 || b.y > CANVAS_H + 30 || b.x < -30 || b.x > CANVAS_W + 30) {
      playerBullets.splice(i, 1);
    }
  }
}

function drawPlayerBullets() {
  playerBullets.forEach(b => {
    const img = images[b.img];
    if (img) {
      const rot = b.img === 'missile' ? Math.atan2(b.vy, b.vx) + Math.PI / 2 : 0;
      drawSprite(img, b.x, b.y, b.w, b.h, rot);
    } else {
      ctx.fillStyle = '#4af';
      ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
    }
  });
}

// ============================================================
// Enemies
// ============================================================
const enemies = [];
const enemyBullets = [];
const enemySerial = {};
const spawnQueue = [];

const ENEMY_TYPES = {
  core: { img: 'enemy_core', w: 44, h: 40, hp: 3, score: 100, speed: 1.8, shootRate: 150, bulletImg: 'bullet_red' },
  scout: { img: 'enemy_scout', w: 40, h: 42, hp: 2, score: 80, speed: 3, shootRate: 220, bulletImg: 'bullet_cyan' },
  laser_ship: { img: 'enemy_laser', w: 42, h: 48, hp: 5, score: 150, speed: 1.3, shootRate: 100, bulletImg: 'bullet_purple' },
  bat: { img: 'enemy_bat', w: 48, h: 38, hp: 4, score: 120, speed: 2.2, shootRate: 120, bulletImg: 'bullet_orange' },
  tank: { img: 'enemy_tank', w: 50, h: 46, hp: 8, score: 200, speed: 0.8, shootRate: 80, bulletImg: 'bullet_red' },
  float: { img: 'enemy_float', w: 36, h: 40, hp: 3, score: 90, speed: 1.8, shootRate: 180, bulletImg: 'bullet_cyan' },
};

function spawnEnemy(type, x, y, pattern) {
  const et = ENEMY_TYPES[type];
  const variants = AstraFleet.enemyGroups[type];
  const spawnX = x ?? Math.random() * (CANVAS_W - 60) + 30;
  const variant = (enemySerial[type] || 0) % variants.length;
  const attack = EnemyAttacks.profiles[variants[variant]];
  enemySerial[type] = (enemySerial[type] || 0) + 1;
  enemies.push({
    type, skin:variants[variant], lean:0, explosion:Explosions.types[(Object.keys(ENEMY_TYPES).indexOf(type)+variant)%5],
    x: spawnX, y: y ?? -50,
    w: et.w, h: et.h, hp: et.hp + Math.floor(wave * 0.5),
    maxHp: et.hp + Math.floor(wave * 0.5),
    score: et.score, speed: et.speed,
    shootRate: attack.interval, shootCD: 45+Math.random()*75,
    attack, attackRound:0, pendingShots:[], warning:0, aim:Math.PI/2,
    bulletImg: et.bulletImg, img: et.img,
    pattern: pattern || 'straight',
    time: 0, startX: spawnX,
    dropItem: Math.random() < 0.15
  });
}

function updateEnemies() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const oldX = e.x;
    e.time++;

    // Movement patterns
    if (e.pattern === 'straight') {
      e.y += e.speed;
    } else if (e.pattern === 'sine') {
      e.y += e.speed;
      e.x = e.startX + Math.sin(e.time * 0.03) * 80;
    } else if (e.pattern === 'zigzag') {
      e.y += e.speed * 0.8;
      e.x += Math.sin(e.time * 0.05) * 3;
    } else if (e.pattern === 'swoop') {
      if (e.time < 60) { e.y += e.speed * 1.5; }
      else if (e.time < 120) { e.x += (e.x < CANVAS_W / 2 ? -1 : 1) * -2; e.y += 0.5; }
      else { e.y += e.speed; }
    } else if (e.pattern === 'hover') {
      if (e.y < 120) e.y += e.speed;
      else e.x += Math.sin(e.time * 0.02) * 1.5;
    }

    e.lean += (Math.max(-1,Math.min(1,(e.x-oldX)/2))-e.lean)*.2;
    // Lock the aim during a visible wind-up; destroyed ships lose pending bursts.
    for(let si=e.pendingShots.length-1;si>=0;si--){
      const shot=e.pendingShots[si];
      if(--shot.remaining<=0){enemyBullets.push(EnemyAttacks.emit(shot,e.x,e.y+e.h*.4));e.pendingShots.splice(si,1);}
    }
    if(e.warning>0){
      if(--e.warning===0){
        e.pendingShots=EnemyAttacks.plan(e.skin,e.aim,e.attackRound++).map(shot=>({...shot,remaining:shot.delay+1}));
      }
    }
    e.shootCD--;
    if (e.shootCD <= 0 && e.y > 25 && e.y < Math.min(CANVAS_H-120,player.y-65)) {
      e.shootCD = e.shootRate;
      e.aim=Math.atan2(player.y-e.y,player.x-e.x);e.warning=e.attack.warning;
    }

    // Remove if off screen
    if (e.y > CANVAS_H + 60 || e.x < -60 || e.x > CANVAS_W + 60) {
      enemies.splice(i, 1);
    }
  }
}

function drawEnemies() {
  enemies.forEach(e => {
    if(e.warning>0){
      ctx.save();ctx.strokeStyle=e.attack.color;ctx.globalAlpha=.45;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(e.x,e.y,Math.max(e.w,e.h)*.55+e.warning*.12,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    SpriteAnimation.draw(ctx, enemyFrame(e));

    // HP bar
    if (e.hp < e.maxHp) {
      const bw = e.w * 0.8;
      ctx.fillStyle = '#300';
      ctx.fillRect(e.x - bw / 2, e.y - e.h / 2 - 8, bw, 3);
      ctx.fillStyle = '#f44';
      ctx.fillRect(e.x - bw / 2, e.y - e.h / 2 - 8, bw * (e.hp / e.maxHp), 3);
    }
  });
}

function enemyFrame(enemy) {
  if (!enemy.skin) return { ...enemy, image:images[enemy.img], flipped:true };
  return SpriteAnimation.frame(enemy.skin,-enemy.lean,enemy.x,enemy.y,enemy.h,true);
}

// ============================================================
// Enemy Bullets
// ============================================================
function updateEnemyBullets() {
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    const children=EnemyAttacks.step(b,player);
    if(children){enemyBullets.splice(i,1);enemyBullets.push(...children);continue;}
    if (b.y > CANVAS_H + 20 || b.y < -20 || b.x < -20 || b.x > CANVAS_W + 20) {
      enemyBullets.splice(i, 1);
    }
  }
}

function drawEnemyBullets() {
  enemyBullets.forEach(b => {
    if(b.kind){EnemyAttacks.draw(ctx,b);return;}
    const img = images[b.img];
    if (img) drawSprite(img, b.x, b.y, b.w, b.h);
    else { ctx.fillStyle = '#f44'; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill(); }
  });
}

// ============================================================
// Boss
// ============================================================
let boss = null;

function spawnBoss() {
  const definition = AstraFleet.bosses[Math.min(wave,AstraFleet.bosses.length-1)];
  bossActive = true;
  enemies.length = 0; enemyBullets.length = 0; spawnQueue.length = 0;
  playSound('boss');
  waveTextStr = 'WARNING — ' + definition.name; showWaveText = 150;
  boss = {
    x:CANVAS_W/2, y:-120, w:140, h:definition.height,
    hp:definition.hp, maxHp:definition.hp, skin:definition.id, name:definition.name,
    phase:0, time:0, entering:true, attackPattern:0, lean:0, aim:Math.PI/2, warning:0,
    plannedShots:[], pendingShots:[]
  };
}
function bossFrame() {
  return SpriteAnimation.frame(boss.skin,-boss.lean,boss.x,boss.y,boss.h,true);
}
function updateBoss() {
  if (!boss) return;
  if (boss.entering) {
    boss.y += 1.2;
    if(boss.y>=155){boss.entering=false;boss.time=0;}
    return;
  }
  boss.time++;
  for(let i=boss.pendingShots.length-1;i>=0;i--){
    const shot=boss.pendingShots[i];
    if(--shot.remaining<=0){enemyBullets.push(EnemyAttacks.emit(shot,boss.x,boss.y+boss.h*.4));boss.pendingShots.splice(i,1);}
  }
  const oldX=boss.x;
  boss.x=CANVAS_W/2+Math.sin(boss.time*.009)*100;
  boss.y=155+Math.sin(boss.time*.006)*15;
  boss.lean+=(Math.max(-1,Math.min(1,(boss.x-oldX)/1.5))-boss.lean)*.15;
  const ratio=boss.hp/boss.maxHp;
  boss.phase=ratio>.66?0:ratio>.33?1:2;
  const cycle=boss.time%240;
  boss.attackPattern=Math.floor(boss.time/240)%4;
  if(cycle===1||(boss.phase===2&&cycle===66)){
    boss.aim=Math.atan2(player.y-boss.y,player.x-boss.x);
    boss.plannedShots=EnemyAttacks.bossPlan(boss);
  }
  boss.warning=cycle<54 ? (54-cycle)/54 : boss.phase===2&&cycle>=66&&cycle<90?(90-cycle)/24:0;
  if(cycle!==54 && !(boss.phase===2&&cycle===90))return;
  boss.pendingShots.push(...boss.plannedShots.map(shot=>({...shot,remaining:shot.delay+1})));
}
function drawBoss() {
  if (!boss) return;
  if(boss.warning>0){
    ctx.save();ctx.globalAlpha=.18+Math.sin(gameTime*.2)*.08;ctx.strokeStyle='#ffab79';ctx.lineWidth=5;
    ctx.setLineDash([12,12]);
    for(const shot of boss.plannedShots){
      const x=boss.x+(shot.x||0), y=boss.y+boss.h*.4;
      ctx.beginPath();ctx.moveTo(x,y);
      ctx.lineTo(x+Math.cos(shot.angle)*650,y+Math.sin(shot.angle)*650);ctx.stroke();
    }
    ctx.restore();
  }
  SpriteAnimation.draw(ctx,bossFrame());
  const ratio=Math.max(0,boss.hp/boss.maxHp),bw=CANVAS_W*.76,bx=(CANVAS_W-bw)/2;
  ctx.fillStyle='#171b32';ctx.fillRect(bx,77,bw,8);
  ctx.fillStyle=ratio>.33?'#b97dff':'#ff7f92';ctx.fillRect(bx,77,bw*ratio,8);
  ctx.strokeStyle='#80739d';ctx.strokeRect(bx,77,bw,8);
  ctx.textAlign='center';ctx.fillStyle='#dccfff';ctx.font='10px monospace';
  ctx.fillText(boss.name+'   '+Math.ceil(boss.hp)+' / '+boss.maxHp,CANVAS_W/2,70);
  ctx.fillStyle=boss.warning>0?'#ffc097':'#91cadb';
  ctx.fillText(boss.entering?'APPROACHING':boss.warning>0?'攻撃予告 — 射線から離れよう':'反撃のチャンス',CANVAS_W/2,102);
}

// ============================================================
// Power-ups
// ============================================================
const powerups = [];

function spawnPowerup(x, y) {
  const type = Math.random() < 0.4 ? 'weapon' : 'upgrade';
  powerups.push({
    x, y, w: 20, h: 20,
    vy: 1.5,
    type,
    weaponType: Math.floor(Math.random() * 4),
    time: 0
  });
}

function updatePowerups() {
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.y += p.vy;
    p.time++;
    if (p.y > CANVAS_H + 30) { powerups.splice(i, 1); continue; }

    // Collision with player
    if (Math.abs(p.x - player.x) < 25 && Math.abs(p.y - player.y) < 25) {
      if (p.type === 'weapon') {
        weaponType = p.weaponType;
        clampPlayer();
        weaponLevel = 1;
      } else {
        weaponLevel = Math.min(3, weaponLevel + 1);
      }
      playSound('powerup');
      spawnParticles(p.x, p.y, '#4f4', 10, 3, 20);
      powerups.splice(i, 1);
    }
  }
}

function drawPowerups() {
  powerups.forEach(p => {
    const pulse = Math.sin(p.time * 0.1) * 3;
    const colors = ['#44aaff', '#44ff44', '#ff44ff', '#ffaa44'];
    ctx.save();
    ctx.translate(p.x, p.y);

    // Glow
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = p.type === 'weapon' ? colors[p.weaponType] : '#ff4';
    ctx.beginPath();
    ctx.arc(0, 0, 14 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Icon
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.fillRect(-6, -6, 12, 12);
    ctx.fillStyle = p.type === 'weapon' ? colors[p.weaponType] : '#ff4';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.type === 'weapon' ? 'W' : '▲', 0, 0);
    ctx.restore();
  });
}

// ============================================================
// Collisions
// ============================================================
function projectileCanDamage(bullet,target) {
  if(!bullet.pierce)return true;
  bullet.hitTimes ||= new WeakMap();
  if(gameTime-(bullet.hitTimes.get(target)??-Infinity)<12)return false;
  bullet.hitTimes.set(target,gameTime);return true;
}
function destroyEnemy(enemy) {
  score+=enemy.score*(1+Math.floor(comboCount/5)*.5);
  comboCount++;comboTimer=120;
  Explosions.spawn(enemy.x,enemy.y,Math.max(enemy.w,enemy.h)*1.8,enemy.explosion);
  spawnParticles(enemy.x,enemy.y,'#ffd6a0',6,3,20);
  playSound('explode');shakeTimer=4;
  if(enemy.dropItem)spawnPowerup(enemy.x,enemy.y);
}
function defeatBoss() {
  score+=5000*(wave+1);
  for(let i=0;i<7;i++){
    const angle=i/7*Math.PI*2;
    Explosions.spawn(boss.x+Math.cos(angle)*38,boss.y+Math.sin(angle)*32,110,Explosions.types[i%5],i*5);
  }
  playSound('explode');shakeTimer=18;
  boss=null;bossActive=false;enemyBullets.length=0;spawnQueue.length=0;
  lives=Math.min(maxLives,lives+1);invincibleTimer=150;
  wave++;waveTimer=0;
  if(practiceBoss||wave>=AstraFleet.bosses.length)endRound('victory');
}
function checkCollisions() {
  for(let bi=playerBullets.length-1;bi>=0;bi--){
    const bullet=playerBullets[bi];
    const shot={...bullet,image:images[bullet.img]};
    let consumed=false;
    for(let ei=enemies.length-1;ei>=0;ei--){
      const enemy=enemies[ei];
      if(!PlayerGeometry.overlaps(enemyFrame(enemy),shot)||!projectileCanDamage(bullet,enemy))continue;
      enemy.hp-=bullet.dmg;
      spawnParticles(bullet.x,bullet.y,'#8cf',2,2,8);
      if(enemy.hp<=0){destroyEnemy(enemy);enemies.splice(ei,1);}
      else playSound('hit');
      if(!bullet.pierce){playerBullets.splice(bi,1);consumed=true;break;}
    }
    // A bullet consumed by a mob must never be reused against the boss.
    if(consumed||!boss||boss.entering)continue;
    if(PlayerGeometry.overlaps(bossFrame(),shot)&&projectileCanDamage(bullet,boss)){
      boss.hp-=bullet.dmg;if(!bullet.pierce)playerBullets.splice(bi,1);
      spawnParticles(bullet.x,bullet.y,'#c4f',2,2,8);playSound('hit');
      if(boss.hp<=0)defeatBoss();
    }
  }
  if(invincibleTimer>0||lives<=0)return;
  const body=playerHitbox();
  for(let i=enemyBullets.length-1;i>=0;i--){
    const bullet=enemyBullets[i];
    if(PlayerGeometry.overlaps(body,{...bullet,image:images[bullet.img]})){
      playerHit();enemyBullets.splice(i,1);break;
    }
  }
  if(invincibleTimer>0)return;
  for(let i=enemies.length-1;i>=0;i--){
    const enemy=enemies[i];
    if(PlayerGeometry.overlaps(body,enemyFrame(enemy))){
      playerHit();enemy.hp-=5;
      if(enemy.hp<=0){destroyEnemy(enemy);enemies.splice(i,1);}break;
    }
  }
}

function playerHit() {
  if (lives <= 0 || invincibleTimer > 0) return;
  lives--;
  playSound('death');
  spawnParticles(player.x, player.y, '#f84', 25, 5, 30);
  spawnParticles(player.x, player.y, '#fff', 15, 4, 20);
  shakeTimer = 15;
  hitFlashTimer = 15; // Red screen flash
  invincibleTimer = 120;
  weaponLevel = Math.max(1, weaponLevel - 1);

  if (lives <= 0) {
    // Death explosion sequence
    deathAnimTimer = 90;
    spawnParticles(player.x, player.y, '#fa4', 40, 7, 50);
    spawnParticles(player.x, player.y, '#ff0', 30, 6, 40);
    spawnParticles(player.x, player.y, '#fff', 20, 5, 35);
    spawnParticles(player.x - 15, player.y + 10, '#f44', 15, 5, 30);
    spawnParticles(player.x + 15, player.y - 10, '#f84', 15, 5, 30);
    playSound('explode');
    shakeTimer = 30;
    Explosions.spawn(player.x,player.y,105,'nova');
  }
}

// ============================================================
// Wave System
// ============================================================
const wavePatterns = [
  // Wave 1: Intro — boss at ~45 sec (2700 frames)
  [
    { time: 120, type: 'core', count: 4, pattern: 'straight' },
    { time: 300, type: 'scout', count: 5, pattern: 'sine' },
    { time: 500, type: 'core', count: 5, pattern: 'zigzag' },
    { time: 700, type: 'float', count: 4, pattern: 'hover' },
    { time: 900, type: 'scout', count: 6, pattern: 'sine' },
    { time: 1100, type: 'core', count: 6, pattern: 'straight' },
    { time: 1300, type: 'bat', count: 4, pattern: 'swoop' },
    { time: 1500, type: 'float', count: 5, pattern: 'zigzag' },
    { time: 1700, type: 'core', count: 7, pattern: 'sine' },
    { time: 1900, type: 'scout', count: 6, pattern: 'straight' },
    { time: 2100, type: 'bat', count: 5, pattern: 'swoop' },
    { time: 2300, type: 'core', count: 8, pattern: 'zigzag' },
    { time: 2700, type: 'boss' },
  ],
  // Wave 2: Medium — boss at ~50 sec (3000 frames)
  [
    { time: 60, type: 'scout', count: 6, pattern: 'sine' },
    { time: 240, type: 'bat', count: 5, pattern: 'swoop' },
    { time: 420, type: 'laser_ship', count: 4, pattern: 'hover' },
    { time: 600, type: 'core', count: 8, pattern: 'zigzag' },
    { time: 800, type: 'tank', count: 3, pattern: 'straight' },
    { time: 1000, type: 'scout', count: 7, pattern: 'sine' },
    { time: 1200, type: 'float', count: 6, pattern: 'hover' },
    { time: 1400, type: 'bat', count: 6, pattern: 'swoop' },
    { time: 1600, type: 'core', count: 8, pattern: 'straight' },
    { time: 1800, type: 'laser_ship', count: 5, pattern: 'sine' },
    { time: 2000, type: 'tank', count: 4, pattern: 'hover' },
    { time: 2200, type: 'scout', count: 8, pattern: 'zigzag' },
    { time: 2500, type: 'bat', count: 7, pattern: 'swoop' },
    { time: 3000, type: 'boss' },
  ],
  // Wave 3: Hard — boss at ~55 sec (3300 frames)
  [
    { time: 60, type: 'bat', count: 6, pattern: 'swoop' },
    { time: 200, type: 'tank', count: 4, pattern: 'straight' },
    { time: 380, type: 'laser_ship', count: 5, pattern: 'hover' },
    { time: 560, type: 'scout', count: 8, pattern: 'sine' },
    { time: 720, type: 'float', count: 6, pattern: 'zigzag' },
    { time: 900, type: 'core', count: 10, pattern: 'sine' },
    { time: 1100, type: 'bat', count: 7, pattern: 'swoop' },
    { time: 1300, type: 'tank', count: 4, pattern: 'hover' },
    { time: 1500, type: 'laser_ship', count: 6, pattern: 'sine' },
    { time: 1700, type: 'scout', count: 8, pattern: 'zigzag' },
    { time: 1900, type: 'float', count: 7, pattern: 'hover' },
    { time: 2100, type: 'core', count: 10, pattern: 'straight' },
    { time: 2400, type: 'tank', count: 5, pattern: 'hover' },
    { time: 2700, type: 'bat', count: 8, pattern: 'swoop' },
    { time: 3300, type: 'boss' },
  ],
  // Wave 4: Very Hard — boss at ~60 sec (3600 frames)
  [
    { time: 40, type: 'tank', count: 5, pattern: 'straight' },
    { time: 200, type: 'bat', count: 8, pattern: 'swoop' },
    { time: 380, type: 'laser_ship', count: 6, pattern: 'hover' },
    { time: 560, type: 'core', count: 10, pattern: 'zigzag' },
    { time: 720, type: 'float', count: 8, pattern: 'sine' },
    { time: 900, type: 'scout', count: 10, pattern: 'sine' },
    { time: 1100, type: 'tank', count: 5, pattern: 'hover' },
    { time: 1300, type: 'bat', count: 8, pattern: 'swoop' },
    { time: 1500, type: 'laser_ship', count: 7, pattern: 'sine' },
    { time: 1700, type: 'core', count: 12, pattern: 'zigzag' },
    { time: 1900, type: 'float', count: 8, pattern: 'hover' },
    { time: 2100, type: 'scout', count: 10, pattern: 'straight' },
    { time: 2400, type: 'tank', count: 6, pattern: 'hover' },
    { time: 2700, type: 'bat', count: 10, pattern: 'swoop' },
    { time: 3000, type: 'laser_ship', count: 7, pattern: 'sine' },
    { time: 3600, type: 'boss' },
  ],
  // Wave 5: Final — boss at ~60 sec (3600 frames)
  [
    { time: 40, type: 'tank', count: 6, pattern: 'hover' },
    { time: 180, type: 'laser_ship', count: 8, pattern: 'sine' },
    { time: 360, type: 'bat', count: 10, pattern: 'swoop' },
    { time: 540, type: 'core', count: 12, pattern: 'zigzag' },
    { time: 700, type: 'float', count: 8, pattern: 'hover' },
    { time: 880, type: 'scout', count: 10, pattern: 'sine' },
    { time: 1060, type: 'tank', count: 6, pattern: 'straight' },
    { time: 1240, type: 'bat', count: 10, pattern: 'swoop' },
    { time: 1420, type: 'laser_ship', count: 8, pattern: 'hover' },
    { time: 1600, type: 'core', count: 12, pattern: 'sine' },
    { time: 1800, type: 'float', count: 8, pattern: 'zigzag' },
    { time: 2000, type: 'scout', count: 12, pattern: 'straight' },
    { time: 2300, type: 'tank', count: 7, pattern: 'hover' },
    { time: 2600, type: 'bat', count: 12, pattern: 'swoop' },
    { time: 2900, type: 'laser_ship', count: 8, pattern: 'sine' },
    { time: 3200, type: 'core', count: 14, pattern: 'zigzag' },
    { time: 3600, type: 'boss' },
  ],
];

function updateWaves() {
  if(gameState!=='playing'||lives<=0)return;
  if(bossActive)return;
  waveTimer++;
  const pattern=wavePatterns[Math.min(wave,wavePatterns.length-1)];
  for(const spawn of pattern){
    if(waveTimer!==spawn.time)continue;
    if(spawn.type==='boss'){spawnBoss();return;}
    waveTextStr='WAVE '+(wave+1);if(waveTimer<=120)showWaveText=100;
    for(let i=0;i<spawn.count;i++)spawnQueue.push({due:gameTime+i*12,type:spawn.type,pattern:spawn.pattern});
  }
  for(let i=spawnQueue.length-1;i>=0;i--){
    const spawn=spawnQueue[i];
    if(gameTime>=spawn.due){spawnEnemy(spawn.type,60+Math.random()*(CANVAS_W-120),-40,spawn.pattern);spawnQueue.splice(i,1);}
  }
}

// ============================================================
// UI / HUD
// ============================================================
function drawHUD() {
  // Score
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE: ${Math.floor(score).toLocaleString()}`, 10, 30);

  // Hi Score
  ctx.font = '11px monospace';
  ctx.fillStyle = '#8af';
  ctx.fillText(`HI: ${highScore.toLocaleString()}`, 10, 46);

  // Lives — ship icons + HP bar
  ctx.textAlign = 'right';
  for (let i = 0; i < lives; i++) {
    if (images.player) {
      const icon = PlayerGeometry.frame(images[shipDefinition().id], CANVAS_W - 30 - i * 28, 35, 25);
      drawSprite(icon.image, icon.x, icon.y, icon.w, icon.h);
    }
  }
  // Player HP bar under lives
  const hpBarW = 80, hpBarH = 6;
  const hpBarX = CANVAS_W - 10 - hpBarW, hpBarY = 52;
  ctx.fillStyle = '#400';
  ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
  const hpColors = ['#f00', '#f80', '#4f4'];
  ctx.fillStyle = lives >= 3 ? hpColors[2] : lives === 2 ? hpColors[1] : hpColors[0];
  ctx.fillRect(hpBarX, hpBarY, hpBarW * (lives / maxLives), hpBarH);
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);
  ctx.fillStyle = '#ccc';
  ctx.font = '9px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`HP ${lives}/${maxLives}`, CANVAS_W - 10, hpBarY + hpBarH + 11);

  // Weapon
  ctx.textAlign = 'left';
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#4f4';
  ctx.fillText(`${weaponNames[weaponType]} Lv.${weaponLevel}`, 10, CANVAS_H - 15);

  // Wave
  ctx.textAlign = 'right';
  ctx.fillStyle = '#aaa';
  ctx.font = '11px monospace';
  ctx.fillText(`${practiceBoss?'PRACTICE · ':''}WAVE ${wave + 1}`, CANVAS_W - 10, CANVAS_H - 15);

  // Combo
  if (comboCount > 2) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = `hsl(${comboCount * 20}, 100%, 70%)`;
    ctx.globalAlpha = Math.min(1, comboTimer / 30);
    ctx.fillText(`${comboCount} COMBO! x${(1 + Math.floor(comboCount / 5) * 0.5).toFixed(1)}`, CANVAS_W / 2, CANVAS_H - 40);
    ctx.globalAlpha = 1;
  }

  // Wave text
  if (showWaveText > 0) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px monospace';
    const alpha = showWaveText > 100 ? 1 : showWaveText / 100;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = waveTextStr.includes('WARNING') ? '#f44' : '#fff';
    ctx.fillText(waveTextStr, CANVAS_W / 2, CANVAS_H / 2 - 50, CANVAS_W-32);
    ctx.globalAlpha = 1;
  }
}

// ============================================================
// Title Screen
// ============================================================
function drawTitle() {
  ctx.fillStyle='#0a0e1a';ctx.fillRect(0,0,CANVAS_W,CANVAS_H);drawStars();
}
function renderHangar() {
  const options=document.getElementById('ship-options');
  options.replaceChildren();
  AstraFleet.players.forEach((ship,index)=>{
    const button=document.createElement('button');button.type='button';button.className='ship-option';
    button.style.setProperty('--ship-color',ship.color);button.setAttribute('aria-pressed',String(index===selectedShip));
    button.innerHTML='<img src="sprites/fleet/'+ship.id+'.png" alt=""><strong>'+ship.name+'</strong><small>'+ship.label+'</small>';
    button.onclick=()=>{selectedShip=index;try{localStorage.setItem('astra_ship',String(index));}catch{}renderHangar();options.children[index].focus();};
    options.append(button);
  });
  document.getElementById('ship-description').textContent=shipDefinition().description;
}
function showHangar() {
  gameState='title';spawnQueue.length=0;enemyBullets.length=0;
  if(practiceBoss)document.querySelector('.hangar-intro').textContent='BOSS PRACTICE · '+AstraFleet.bosses[practiceBoss-1].name;
  document.getElementById('hangar').hidden=false;document.getElementById('round-actions').hidden=true;renderHangar();
}
function launchGame(){
  initAudio();audioCtx?.resume().catch(()=>{});
  resetGame();document.getElementById('hangar').hidden=true;document.getElementById('round-actions').hidden=true;canvas.focus();
}
function endRound(state) {
  gameState=state;spawnQueue.length=0;
  if(!practiceBoss&&!inspecting&&score>highScore){highScore=score;try{localStorage.setItem('astra_hi',String(highScore));}catch{}}
  document.getElementById('round-actions').hidden=false;
}
document.getElementById('launch').onclick=launchGame;
document.getElementById('retry').onclick=launchGame;
document.getElementById('change-ship').onclick=showHangar;

function drawGameOver() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.textAlign = 'center';
  ctx.font = 'bold 36px monospace';
  ctx.fillStyle = '#f44';
  ctx.fillText('GAME OVER', CANVAS_W / 2, 280);

  ctx.font = '18px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText(`SCORE: ${Math.floor(score).toLocaleString()}`, CANVAS_W / 2, 340);

  if (score >= highScore) {
    ctx.fillStyle = '#ff4';
    ctx.fillText('NEW HIGH SCORE!', CANVAS_W / 2, 370);
  }

  ctx.font = '14px monospace';
  ctx.fillStyle = '#aaa';
  ctx.fillText(`Wave Reached: ${wave + 1}`, CANVAS_W / 2, 410);

}

function drawVictory() {
  ctx.fillStyle = 'rgba(0, 0, 20, 0.7)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.textAlign = 'center';
  ctx.font = 'bold 32px monospace';
  ctx.fillStyle = '#4f4';
  ctx.fillText('MISSION COMPLETE', CANVAS_W / 2, 250);

  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = '#4af';
  ctx.fillText('Stars Protected!', CANVAS_W / 2, 290);

  ctx.font = '18px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText(`FINAL SCORE: ${Math.floor(score).toLocaleString()}`, CANVAS_W / 2, 350);

  if (score >= highScore) {
    ctx.fillStyle = '#ff4';
    ctx.fillText('NEW HIGH SCORE!', CANVAS_W / 2, 380);
  }

}

// ============================================================
// Game Reset
// ============================================================
function resetGame() {
  score = 0;
  maxLives = shipDefinition().hp;
  lives = maxLives;
  weaponLevel = 1;
  weaponType = shipDefinition().weapon;
  wave = 0;
  waveTimer = 0;
  bossActive = false;
  boss = null;
  invincibleTimer = 180;
  comboCount = 0;
  comboTimer = 0;
  hitFlashTimer = 0;
  deathAnimTimer = 0;
  shakeTimer=0;showWaveText=0;
  player.x = CANVAS_W / 2;
  player.y = CANVAS_H - 100;
  player.lean = 0; player.shootCD = 0;
  gameTime = 0; spawnQueue.length = 0; Explosions.clear();
  for(const code of Object.keys(keys))delete keys[code];
  touch.active=false;touch.shoot=false;clickedThisFrame=false;
  for(const type of Object.keys(enemySerial))delete enemySerial[type];
  enemies.length = 0;
  enemyBullets.length = 0;
  playerBullets.length = 0;
  powerups.length = 0;
  particles.length = 0;
  gameState = 'playing';
  if(practiceBoss){wave=practiceBoss-1;spawnBoss();}
}

// ============================================================
// Main Loop
// ============================================================
function update() {
  gameTime++;updateStars();Explosions.update();
  if(shakeTimer>0)shakeTimer--;
  if(hitFlashTimer>0)hitFlashTimer--;
  if(showWaveText>0)showWaveText--;
  if(gameState==='title'){
    if(keys.Space||keys.KeyZ)launchGame();
  }else if(gameState==='playing'){
    updateParticles();
    if(lives<=0){if(--deathAnimTimer<=0)endRound('gameover');return;}
    updatePlayer();updatePlayerBullets();updateEnemies();updateEnemyBullets();
    updateBoss();updatePowerups();checkCollisions();updateWaves();
    if(lives<maxLives&&gameTime%8===0)spawnParticles(player.x,player.y+12,'#8795ab',1,1,15);
  }else{
    updateParticles();
    if(keys.Space||keys.KeyZ||clickedThisFrame)launchGame();
  }
}

function postUpdate() { clickedThisFrame = false; }

function draw() {
  // Screen shake
  ctx.save();
  if (shakeTimer > 0) {
    ctx.translate((Math.random() - 0.5) * shakeTimer * 2, (Math.random() - 0.5) * shakeTimer * 2);
  }

  // Background
  ctx.fillStyle = '#0a0e1a';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  drawStars();

  if (gameState === 'title') {
    ctx.restore();
    drawTitle();
    return;
  }

  // Game objects
  drawPowerups();
  drawPlayerBullets();
  drawEnemyBullets();
  drawEnemies();
  drawBoss();
  drawPlayer();
  drawParticles();
  Explosions.draw(ctx);

  ctx.restore();

  // Red hit flash overlay
  if (hitFlashTimer > 0) {
    ctx.globalAlpha = hitFlashTimer / 15 * 0.4;
    ctx.fillStyle = '#f00';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.globalAlpha = 1;
  }

  drawHUD();

  if (gameState === 'gameover') drawGameOver();
  if (gameState === 'victory') drawVictory();
}

// Advance frame-based game rules at exactly 60 Hz on 30/60/120/144 Hz displays.
function createFixedStepper(step) {
  let accumulated=0;
  return { reset(){accumulated=0;}, advance(delta){
    accumulated+=Math.min(100,Math.max(0,delta));
    let count=0;
    while(accumulated+1e-7>=1000/60 && count<6){step();accumulated-=1000/60;count++;}
    return count;
  }};
}
let previousFrame=null, suspended=false;
const fixedStepper=createFixedStepper(()=>{update();postUpdate();});
function gameLoop(now) {
  if(previousFrame===null)previousFrame=now;
  if(!suspended)fixedStepper.advance(now-previousFrame);
  previousFrame=now;draw();requestAnimationFrame(gameLoop);
}
function releaseControls(){
  for(const key of Object.keys(keys))delete keys[key];
  touch.active=false;touch.shoot=false;mouseDown=false;clickedThisFrame=false;
}
window.addEventListener('mouseup',()=>{touch.active=false;touch.shoot=false;mouseDown=false;});
canvas.addEventListener('touchcancel',releaseControls,{passive:true});
window.addEventListener('blur',()=>{suspended=true;releaseControls();});
window.addEventListener('focus',()=>{suspended=false;previousFrame=null;fixedStepper.reset();});
document.addEventListener('visibilitychange',()=>{suspended=document.hidden;releaseControls();previousFrame=null;fixedStepper.reset();});

// Start
loadAssets().then(()=>{
  const query=new URLSearchParams(location.search);
  if(query.has('inspect-player')||query.has('inspect-fleet')){
    const script=document.createElement('script');
    script.src=query.has('inspect-fleet')?'checks/fleet.js':'checks/player.js';
    document.body.append(script);return;
  }
  showHangar();requestAnimationFrame(gameLoop);
}).catch(error=>{
  document.getElementById('loading').replaceChildren();
  const message=document.createElement('p');message.textContent=error.message;
  document.getElementById('loading').append(message);console.error(error);
});

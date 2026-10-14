import Phaser from 'phaser';
import type { GameContext, GameModule, Score, Settings } from '../../src/core/types';
import { Combat } from './model';
import { PitScene } from './scene';
import { UPGRADE_INFO, WAVE_NAMES, type Upgrade } from './data';
import { styles } from './styles';

const BEST_KEY = 'ballpit:best-kills:v1';
const BALLS_KEY = 'ballpit:balls:v1';

export function createGame(): GameModule {
  let context: GameContext, game: Phaser.Game | undefined, scene: PitScene;
  let mount: HTMLDivElement, root: ShadowRoot, pit: HTMLElement;
  let observer: ResizeObserver | undefined, audio: AudioContext | undefined;
  let muted = true, best = 0, initialBalls = 3, overlayKey = '', lastPhase = '', lastScore = -1, lastFx = 0, lastSound = 0;
  let hostPaused = false, resumeAfterHost = false, destroyed = false;
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const score = (): Score | null => scene && scene.combat.phase !== 'ready'
    ? { value: scene.combat.stats.kills, unit: '撃破', direction: 'higher' } : null;
  function sound(kind: string) {
    if (muted || hostPaused || destroyed) return;
    try {
      audio ??= new AudioContext();
      if (audio.state === 'suspended') void audio.resume().catch(() => {});
      const tone = audio.createOscillator(), gain = audio.createGain();
      const hz = ({ hurt: 130, hit: 430, death: 660, collect: 860, warning: 190 } as Record<string, number>)[kind] ?? 310;
      tone.frequency.setValueAtTime(hz, audio.currentTime);
      tone.frequency.exponentialRampToValueAtTime(hz * .7, audio.currentTime + .09);
      gain.gain.setValueAtTime(.025, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .1);
      tone.connect(gain).connect(audio.destination); tone.start(); tone.stop(audio.currentTime + .11);
      tone.onended = () => { tone.disconnect(); gain.disconnect(); };
    } catch { /* Audio is optional on restricted browsers. */ }
  }
  function restart(start = false) {
    scene.restartCombat(new Combat({ balls: initialBalls }));
    overlayKey = ''; lastFx = 0; lastSound = 0; lastScore = -1;
    if (start) { scene.combat.start(); sound('collect'); }
    render();
  }
  function togglePause() {
    if (hostPaused) return;
    if (scene.combat.phase === 'paused') scene.combat.resume(); else scene.combat.pause();
    scene.clearInput(); render();
  }
  function overlay() {
    const m = scene.combat;
    const key = `${m.phase}:${m.level}:${m.pending}:${m.choices.join(',')}`;
    if (key === overlayKey) return;
    overlayKey = key;
    const el = $('overlay');
    el.hidden = !['ready', 'paused', 'upgrade', 'dead', 'clear'].includes(m.phase);
    if (el.hidden) { el.replaceChildren(); return; }
    let content = '';
    if (m.phase === 'ready') content = `<div class="hero" aria-hidden="true">♜</div><div class="eyebrow">THE LITTLE CASTLE DEFENDER</div><h2>小さな鼻で、大きな一撃。</h2><p>跳ねるボールで、城門から迫る敵を迎え撃とう。<br>3つのウェーブを越えたら、守護ゴーレムとの決戦。</p><div class="count">はじめの球数 ${[3,5,8].map(n => `<button data-count="${n}" aria-pressed="${n === initialBalls}">${n}球</button>`).join('')}</div><div><button id="begin" class="primary">冒険をはじめる →</button></div><p class="tip">A・D / ← → で移動、マウスで狙い、長押しで連射。<br>スマホは下の矢印で移動、戦場を長押しで発射。</p>`;
    else if (m.phase === 'paused') content = `<div class="eyebrow">TAKE A BREATH</div><h2>ひとやすみ</h2><p>壁で跳ね返して連続ヒット。青い結晶でレベルアップ。</p><button id="continue" class="primary">冒険に戻る →</button><button id="title" class="secondary">タイトルへ</button>`;
    else if (m.phase === 'upgrade') content = `<div class="eyebrow">LEVEL ${m.level} · CHOOSE YOUR GIFT</div><h2>次の一撃を、育てよう。</h2><p>強化をひとつ選んでください${m.pending > 1 ? `（あと${m.pending}回）` : ''}</p><div class="choices">${m.choices.map(id => `<button class="card" data-upgrade="${id}"><span>${UPGRADE_INFO[id].icon}</span><div><b>${UPGRADE_INFO[id].name}</b><small>${UPGRADE_INFO[id].description}</small></div></button>`).join('')}</div>`;
    else content = `<div class="eyebrow">${m.phase === 'clear' ? 'PIT CONQUERED' : 'END OF RUN'}</div><h2>${m.phase === 'clear' ? '城塞、突破！' : 'もう一度、城門へ。'}</h2><div class="stats"><div><b>${m.stats.kills}</b>撃破</div><div><b>${m.level}</b>レベル</div><div><b>${Math.floor(m.time)}s</b>戦闘時間</div></div><p>最高記録 ${best} 撃破</p><button id="again" class="primary">もう一度あそぶ →</button><button id="title" class="secondary">タイトルへ</button>`;
    el.innerHTML = `<section class="dialog" aria-labelledby="dialog-title">${content}</section>`;
    el.querySelector('h2')!.id = 'dialog-title';
    $('begin')?.addEventListener('click', () => restart(true));
    $('again')?.addEventListener('click', () => restart(true));
    $('title')?.addEventListener('click', () => restart());
    $('continue')?.addEventListener('click', togglePause);
    for (const button of el.querySelectorAll<HTMLButtonElement>('[data-count]')) button.onclick = () => {
      initialBalls = Number(button.dataset.count); context.platform.storage.write(BALLS_KEY, initialBalls);
      for (const b of el.querySelectorAll<HTMLElement>('[data-count]')) b.setAttribute('aria-pressed', String(Number(b.dataset.count) === initialBalls));
    };
    for (const button of el.querySelectorAll<HTMLButtonElement>('[data-upgrade]')) button.onclick = () => {
      m.choose(button.dataset.upgrade as Upgrade); scene.clearInput(); sound('collect'); render();
    };
    el.querySelector<HTMLButtonElement>('.primary, .card')?.focus({ preventScroll: true });
  }
  function render() {
    if (destroyed) return;
    const m = scene.combat;
    if (lastPhase !== m.phase) { scene.clearInput(); lastPhase = m.phase; }
    pit.dataset.phase = m.phase;
    $('hp').textContent = `${Math.ceil(m.hp)} / ${m.maxHP}`;
    $('hp-bar').style.width = `${Math.max(0,m.hp / m.maxHP * 100)}%`;
    $('level').textContent = `LV. ${m.level}`; $('exp').textContent = `${m.exp} / ${m.need}`;
    $('exp-bar').style.width = `${Math.min(100,m.exp / m.need * 100)}%`;
    $('wave').textContent = m.wave === 3 ? 'BOSS' : `WAVE 0${m.wave + 1}`;
    $('timer').textContent = `${String(Math.floor(m.time / 60)).padStart(2,'0')}:${String(Math.floor(m.time % 60)).padStart(2,'0')}`;
    $('balls').textContent = `${m.ready} / ${m.total}`;
    $('pit-pause').textContent = m.phase === 'paused' ? '再開' : '休憩';
    const boss = m.boss; $('boss').hidden = !boss;
    if (boss) { $('boss').classList.toggle('open', boss.open); $('boss-state').textContent = boss.open ? '弱点露出！' : '装甲ガード'; $('boss-bar').style.width = `${Math.max(0,boss.hp / boss.maxHP * 100)}%`; }
    const banner = $('banner'); banner.hidden = m.phase !== 'intermission';
    $('banner-title').textContent = m.transitionKind === 'final' ? 'PIT CLEAR' : m.transitionKind === 'wave' && m.transitionElapsed < 2.4 ? 'WAVE CLEAR' : m.wave === 3 ? 'BOSS INCOMING' : 'WAVE START';
    $('banner-detail').textContent = WAVE_NAMES[m.wave];
    if (lastScore !== m.stats.kills) {
      lastScore = m.stats.kills; context.reportScore(score());
      if (lastScore > best) { best = lastScore; context.platform.storage.write(BEST_KEY, best); }
      $('best').textContent = `撃破 ${lastScore}　 /　 最高 ${best}`;
    }
    const fresh = m.effects.filter(f => f.id > lastFx);
    if (fresh.length) {
      lastFx = Math.max(...fresh.map(f => f.id));
      if (m.time - lastSound > .075) { sound((fresh.find(f => f.kind === 'hurt' || f.kind === 'warning') ?? fresh[fresh.length - 1]).kind); lastSound = m.time; }
    }
    overlay();
  }
  async function dispose() {
    destroyed = true; observer?.disconnect(); observer = undefined;
    scene?.clearInput();
    if (scene) scene.onFrame = () => {};
    if (audio) { await audio.close().catch(() => {}); audio = undefined; }
    const current = game; game = undefined;
    if (current) await new Promise<void>(resolve => {
      current.events.once(Phaser.Core.Events.DESTROY, resolve);
      current.resume(); current.loop.wake(); current.destroy(true);
    });
    if (new URLSearchParams(location.search).has('debug')) delete (window as Window & { __ballpit?: unknown }).__ballpit;
    mount?.remove();
  }
  return {
    async init(ctx) {
      context = ctx; muted = ctx.settings.muted; destroyed = false;
      const savedBest = ctx.platform.storage.read<number>(BEST_KEY, 0);
      best = Number.isFinite(savedBest) && savedBest >= 0 ? Math.floor(savedBest) : 0;
      const savedBalls = ctx.platform.storage.read<number>(BALLS_KEY, 3); initialBalls = [3,5,8].includes(savedBalls) ? savedBalls : 3;
      mount = document.createElement('div'); mount.style.cssText = 'width:100%;height:100%;min-height:0;container-type:size';
      root = mount.attachShadow({ mode: 'open' });
      root.innerHTML = `<style>${styles}</style><div class="pit"><div class="heading"><div class="wordmark">♜ BALL &amp; PIT <small>城塞の小さな守り手</small></div><div class="tools"><button id="pit-pause">休憩</button><button id="fullscreen" aria-label="全画面表示">⛶</button></div></div><div class="hud"><div class="meter"><label>♥ HP <span id="hp"></span></label><div class="track"><i id="hp-bar"></i></div></div><div class="meter xp"><label><span id="level"></span><span id="exp"></span></label><div class="track"><i id="exp-bar"></i></div></div><div class="wave"><span id="wave"></span><small id="timer"></small></div></div><div class="battle" id="battle"><div class="arena" id="arena"><div class="stage" id="pit-stage"></div><div class="boss" id="boss" hidden><label>守護ゴーレム <span id="boss-state"></span></label><div class="track"><i id="boss-bar"></i></div></div><div class="banner" id="banner" hidden><b id="banner-title"></b><span id="banner-detail"></span></div></div></div><div class="controls"><button id="left" aria-label="左へ移動">←</button><div class="status"><span>発射できる球 <b id="balls"></b></span><div class="hint">戦場を長押しして連射</div></div><button id="right" aria-label="右へ移動">→</button></div><div class="best" id="best"></div><div class="overlay" id="overlay" role="dialog" aria-modal="true"></div><div class="notice" id="notice" role="status"></div></div>`;
      ctx.container.append(mount); pit = root.querySelector('.pit')!;
      scene = new PitScene(ctx.assetUrl); scene.combat = new Combat({ balls: initialBalls }); scene.onFrame = render;
      // Escape is owned by the common player. The in-game button also works in fullscreen.
      scene.onPause = () => {};
      $('pit-pause').onclick = togglePause;
      $('fullscreen').onclick = async () => {
        try { if (document.fullscreenElement) await document.exitFullscreen(); else await pit.requestFullscreen(); }
        catch { $('notice').textContent = 'このブラウザでは全画面表示を利用できません。'; }
      };
      for (const [id, direction] of [['left', -1], ['right', 1]] as const) {
        const button = $(id);
        button.onpointerdown = event => { event.preventDefault(); button.setPointerCapture(event.pointerId); scene.controls.move = direction; };
        button.onpointerup = button.onpointercancel = button.onlostpointercapture = () => { if (scene.controls.move === direction) scene.controls.move = 0; };
      }
      observer = new ResizeObserver(([entry]) => {
        const scale = Math.max(0, Math.min(entry.contentRect.width / 560, entry.contentRect.height / 660));
        $('arena').style.width = `${560 * scale}px`; $('arena').style.height = `${660 * scale}px`;
        game?.scale.refresh();
      }); observer.observe($('battle'));
      render();
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('BALL＆PITの読み込みがタイムアウトしました。')), 30000);
        scene.onReady = () => { clearTimeout(timeout); resolve(); };
        scene.onLoadError = () => { clearTimeout(timeout); reject(new Error('BALL＆PITの素材を読み込めませんでした。')); };
        game = new Phaser.Game({ type: Phaser.AUTO, parent: $('pit-stage'), width: 560, height: 660,
          backgroundColor: '#101e29', pixelArt: true, roundPixels: true, scene: [scene],
          scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
          input: { activePointers: 3 }, audio: { noAudio: true } });
      });
      if (new URLSearchParams(location.search).has('debug')) Object.assign(window, { __ballpit: { scene, game, get audio() { return audio; } } });
    },
    start() { render(); },
    async pause() {
      hostPaused = true; resumeAfterHost = scene.combat.phase !== 'paused';
      scene.combat.pause(); scene.clearInput(); game?.pause();
      await audio?.suspend(); render();
    },
    resume() {
      hostPaused = false;
      if (resumeAfterHost) scene.combat.resume();
      scene.clearInput(); game?.resume(); render();
    },
    reset() { hostPaused = false; resumeAfterHost = false; game?.resume(); restart(); },
    destroy: dispose,
    getScore: score,
    setSettings(settings: Settings) { muted = settings.muted; if (muted) void audio?.suspend(); }
  };
}

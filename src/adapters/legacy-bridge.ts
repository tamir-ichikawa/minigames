/** Executed BEFORE a legacy game's scripts, and only inside its managed iframe.
 * Compatibility shims are confined to that browsing context, never the launcher.
 */
import type { Score, Settings } from '../core/types';
declare global {
  interface Window {
    GameShell?: { pause(force: boolean): void };
    MinigameScore?: () => Score | null;
  }
}
if (window.parent !== window && new URL(location.href).searchParams.has('minigame')) install();
function install() {
  const session = new URL(location.href).searchParams.get('minigame');
  const send = (type: string, extra = {}) => parent.postMessage({ channel: 'minigames-v1', session, type, ...extra }, location.origin);
  const script = document.currentScript as HTMLScriptElement;
  const usesShell = script?.dataset.shell === 'true';
  const appBase = new URL('../', script.src);
  const launcherPaths = ['', 'index.html', 'collection/', 'collection/index.html'].map(path => new URL(path, appBase).pathname);
  const nativeRAF = requestAnimationFrame.bind(window), nativeTimeout = setTimeout.bind(window);
  const realNow = performance.now.bind(performance);
  const epoch = Date.now() - realNow();
  let time = realNow(), last = time, paused = false, accumulator = 0;
  let settings: Settings = { muted: false };
  const jobs = new Map<number, FrameRequestCallback>();
  const timers = new Map<number, { fn: TimerHandler; args: unknown[]; due: number; interval: number }>();
  let serial = 0;
  if (!usesShell) {
    window.requestAnimationFrame = fn => { jobs.set(++serial, fn); return serial; };
    window.cancelAnimationFrame = id => { jobs.delete(id); };
    const schedule = (fn: TimerHandler, delay = 0, interval = false, args: unknown[]) => {
      const ms = Math.max(interval ? 1 : 0, Number(delay) || 0);
      timers.set(++serial, { fn, args, due: time + ms, interval: interval ? ms : 0 }); return serial;
    };
    window.setTimeout = ((fn: TimerHandler, delay?: number, ...args: unknown[]) => schedule(fn, delay, false, args)) as typeof window.setTimeout;
    window.setInterval = ((fn: TimerHandler, delay?: number, ...args: unknown[]) => schedule(fn, delay, true, args)) as typeof window.setInterval;
    window.clearTimeout = window.clearInterval = id => { if (id !== undefined) timers.delete(id); };
    Date.now = () => epoch + time;
    Object.defineProperty(performance, 'now', { configurable: true, value: () => time });
    function step() {
      time += 1000 / 60;
      for (const [id, timer] of [...timers]) {
        if (timer.due > time || !timers.has(id)) continue;
        if (timer.interval) timer.due = time + timer.interval; else timers.delete(id);
        // No evaluated timer strings: existing games use functions only.
        if (typeof timer.fn === 'function') try { timer.fn(...timer.args); } catch (error) { console.error(error); }
      }
      const callbacks = [...jobs.values()]; jobs.clear();
      for (const callback of callbacks) try { callback(time); } catch (error) { console.error(error); }
    }
    nativeRAF(function tick(now) {
      const dt = Math.min(100, now - last); last = now;
      if (!paused) { accumulator += dt; while (accumulator >= 1000 / 60) { accumulator -= 1000 / 60; step(); } }
      nativeRAF(tick);
    });
  }
  // Route legacy Web Audio to one gain per context. Muting must NOT stop a rhythm clock.
  const outputs = new Map<AudioContext, GainNode>(), suspended = new Set<AudioContext>();
  const contexts = new Set<AudioContext>();
  const NativeContext = window.AudioContext;
  const ContextProxy = new Proxy(NativeContext, { construct(target, args) {
    const context = Reflect.construct(target, args) as AudioContext;
    contexts.add(context);
    const resume = context.resume.bind(context);
    context.resume = () => {
      if (paused) { suspended.add(context); return Promise.resolve(); }
      return resume();
    };
    return context;
  }});
  window.AudioContext = ContextProxy;
  if ('webkitAudioContext' in window) (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext = ContextProxy;
  const animations = new Set<Animation>();
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (this: AudioNode, ...args: unknown[]) {
    if (args[0] === this.context.destination && this.context instanceof AudioContext) {
      const context = this.context;
      let gain = outputs.get(context);
      if (!gain) {
        gain = context.createGain(); gain.gain.value = settings.muted || paused ? 0 : 1;
        Reflect.apply(connect, gain, [context.destination]); outputs.set(context, gain);
      }
      args[0] = gain;
    }
    return Reflect.apply(connect, this, args);
  } as typeof connect;
  const media = new Set<HTMLMediaElement>(), playing = new Set<HTMLMediaElement>();
  const NativeAudio = window.Audio;
  window.Audio = new Proxy(NativeAudio, { construct(target, args) {
    const audio = Reflect.construct(target, args) as HTMLAudioElement; media.add(audio); audio.muted = settings.muted; return audio;
  }});
  function applySettings(next: Settings) {
    settings = next;
    for (const gain of outputs.values()) gain.gain.value = settings.muted || paused ? 0 : 1;
    document.querySelectorAll('audio,video').forEach(el => media.add(el as HTMLMediaElement));
    for (const el of media) el.muted = settings.muted;
  }
  async function pause(force: boolean) {
    if (paused === force) return;
    paused = force;
    // Let existing games clear held keys / active drag state before blocking inputs.
    if (force) {
      document.dispatchEvent(new Event('gamepause'));
      for (const code of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyA','KeyD']) document.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    }
    window.GameShell?.pause(force);
    applySettings(settings);
    if (force) {
      for (const animation of document.getAnimations()) if (animation.playState === 'running') { animations.add(animation); animation.pause(); }
    } else {
      for (const animation of animations) animation.play(); animations.clear();
    }
    if (force) {
      for (const context of contexts) if (context.state === 'running') { suspended.add(context); await context.suspend().catch(() => {}); }
      for (const el of media) if (!el.paused) { playing.add(el); el.pause(); }
    } else {
      for (const context of suspended) if (context.state !== 'closed') await context.resume().catch(() => {});
      suspended.clear();
      for (const el of playing) el.play().catch(() => {});
      playing.clear();
    }
  }
  for (const type of ['pointerdown','pointermove','pointerup','click','touchstart','touchmove','touchend','keydown']) document.addEventListener(type, event => {
    if (paused) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, { capture: true, passive: false });
  let scoreConfig: { selector: string; unit: string; direction: 'higher' | 'lower' } | undefined;
  function report() {
    let score: Score | null = null;
    try {
      score = window.MinigameScore?.() ?? null;
      if (!score && scoreConfig) {
        const text = document.querySelector(scoreConfig.selector)?.textContent?.trim();
        if (text && /^-?[\d,]+(?:\.\d+)?$/.test(text)) score = { value: Number(text.replaceAll(',', '')), unit: scoreConfig.unit, direction: scoreConfig.direction };
      }
      if (score && (!Number.isFinite(score.value) || !['higher', 'lower'].includes(score.direction))) score = null;
    } catch { /* A title screen need not expose a score. */ }
    send('score', { score });
    nativeTimeout(report, 250);
  }
  window.addEventListener('message', async event => {
    const msg = event.data;
    if (event.source !== parent || event.origin !== location.origin || msg?.channel !== 'minigames-v1' || msg.session !== session) return;
    if (msg.type === 'configure') { scoreConfig = msg.score; applySettings(msg.settings); }
    if (msg.type === 'settings') applySettings(msg.settings);
    if (msg.type === 'pause') await pause(true);
    if (msg.type === 'resume') await pause(false);
    if (msg.type === 'destroy') { await pause(true); await Promise.all([...contexts].map(context => context.close().catch(() => {}))); }
    send('ack', { request: msg.request });
  });
  document.addEventListener('click', event => {
    const anchor = (event.target as Element).closest?.('a');
    if (!anchor) return;
    const url = new URL(anchor.href);
    if (url.origin === location.origin && launcherPaths.includes(url.pathname)) {
      event.preventDefault(); send('exit');
    }
  });
  document.addEventListener('DOMContentLoaded', () => { send('ready'); report(); });
}

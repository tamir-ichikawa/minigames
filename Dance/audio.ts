import { audibleContextTime, eventPerformanceTime } from './rhythm';
export class DanceAudio {
  context: AudioContext;
  gain: GainNode;
  source?: AudioBufferSourceNode;
  buffers = new Map<string, AudioBuffer>();
  pending = new Map<string, Promise<AudioBuffer>>();
  startAt = 0;
  chartShift = 0;
  frozen = 0;
  paused = false;
  started = false;
  destroyed = false;
  constructor() {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.context = new Ctor({ latencyHint: 'interactive' });
    this.gain = this.context.createGain(); this.gain.connect(this.context.destination);
  }
  async load(url: string) {
    const cached = this.buffers.get(url); if (cached) return cached;
    let promise = this.pending.get(url);
    if (!promise) {
      promise = (async () => {
        const response = await fetch(url); if (!response.ok) throw new Error(`音声の読み込みに失敗しました (${response.status})`);
        const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
        if (!this.destroyed) this.buffers.set(url,buffer); return buffer;
      })();
      this.pending.set(url,promise);
    }
    try { return await promise; } finally { this.pending.delete(url); }
  }
  async unlock() {
    await this.context.resume();
    if (this.context.state !== 'running') throw new Error('音声を開始できませんでした。もう一度スタートを押してください。');
  }
  play(buffer: AudioBuffer) {
    this.stop(); this.paused = false;
    this.source = this.context.createBufferSource(); this.source.buffer = buffer; this.source.connect(this.gain);
    this.startAt = this.context.currentTime + .35; this.source.start(this.startAt); this.started = true;
  }
  time(calibrationMs = 0, eventStamp?: number) {
    if (!this.started) return 0;
    if (this.paused) return this.frozen-calibrationMs/1000;
    const now = performance.now(), at = eventStamp === undefined ? now : eventPerformanceTime(eventStamp,now,performance.timeOrigin);
    const c = this.context;
    return audibleContextTime({ currentTime: c.currentTime, baseLatency: c.baseLatency, outputLatency: c.outputLatency,
      timestamp: c.getOutputTimestamp?.() },at,now)-this.startAt-this.chartShift-calibrationMs/1000;
  }
  async pause() {
    if (this.paused || this.destroyed) return;
    this.frozen = this.time(); this.paused = true;
    await this.context.suspend();
  }
  async resume() {
    if (this.destroyed) return;
    await this.unlock(); this.paused = false;
  }
  mute(muted: boolean) { this.gain.gain.value = muted ? 0 : 1; }
  stop() {
    if (this.source) { try { this.source.stop(); } catch {} this.source.disconnect(); this.source = undefined; }
    this.started = false;
  }
  async destroy() { this.destroyed = true; this.stop(); this.buffers.clear(); this.gain.disconnect(); await this.context.close(); }
}

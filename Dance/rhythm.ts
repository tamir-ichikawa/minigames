import type { AudioSignature } from './alignment';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type Judgment = 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS';
export type ChartNote = [number, number, number];
export interface Song { id: string; title: string; note: string; bpm: number; offset: number; dur: number; audio: string; sync: AudioSignature; charts: Record<Difficulty, number[][]>; }
export const DIFFICULTIES = { easy: { name: 'やさしい', approach: 1.65 }, normal: { name: 'ふつう', approach: 1.30 }, hard: { name: 'むずかしい', approach: 1.05 } };
export const WINDOWS = { PERFECT: .045, GREAT: .090, GOOD: .135 };
const WEIGHTS = { PERFECT: 1, GREAT: .6, GOOD: .2, MISS: 0 };
export interface Note { time: number; lane: number; sub: number; result: Judgment | null; }
export class RhythmRound {
  notes: Note[];
  counts: Record<Judgment, number> = { PERFECT: 0, GREAT: 0, GOOD: 0, MISS: 0 };
  combo = 0; maxCombo = 0; judged = 0; weight = 0;
  last: { result: Judgment; error: number; lane: number; time: number } | null = null;
  constructor(chart: number[][]) { this.notes = chart.map(([time, lane, sub]) => ({ time, lane, sub, result: null })).sort((a,b) => a.time-b.time); }
  get score() { return this.notes.length ? Math.round(this.weight / this.notes.length * 1_000_000) : 0; }
  judge(note: Note, result: Judgment, time: number) {
    if (note.result) return;
    note.result = result; this.counts[result]++; this.judged++; this.weight += WEIGHTS[result];
    this.combo = result === 'MISS' ? 0 : this.combo + 1; this.maxCombo = Math.max(this.combo, this.maxCombo);
    this.last = { result, error: time-note.time, lane: note.lane, time };
  }
  press(lane: number, time: number) {
    // Overlapping windows on fast passages must select the closest note, not the oldest.
    let nearest: Note | undefined, distance = WINDOWS.GOOD + 1e-8;
    for (const note of this.notes) {
      if (note.time > time + WINDOWS.GOOD + 1e-8) break;
      if (note.result || note.lane !== lane) continue;
      const d = Math.abs(note.time-time);
      if (d < distance) { nearest = note; distance = d; }
    }
    if (!nearest) return null;
    const result = distance <= WINDOWS.PERFECT+1e-8 ? 'PERFECT' : distance <= WINDOWS.GREAT+1e-8 ? 'GREAT' : 'GOOD';
    this.judge(nearest, result, time); return result;
  }
  advance(time: number) {
    // Brief grace lets queued DOM events retain their original timestamps after a slow frame.
    for (const note of this.notes) {
      if (note.time >= time-WINDOWS.GOOD-.1) break;
      if (!note.result) this.judge(note, 'MISS', time);
    }
  }
}
export interface AudioClockSnapshot { currentTime: number; baseLatency: number; outputLatency: number; timestamp?: { contextTime?: number; performanceTime?: number }; }
export function eventPerformanceTime(stamp: number, now: number, origin: number) {
  if (stamp > 1e12) stamp -= origin; // Older WebKit uses epoch milliseconds.
  return Number.isFinite(stamp) && stamp > 0 && stamp <= now+1 ? Math.max(now-250, Math.min(now, stamp)) : now;
}
export function audibleContextTime(clock: AudioClockSnapshot, at: number, now: number) {
  const ts = clock.timestamp;
  // Output timestamps already include latency. Do not subtract it a second time.
  if (ts?.contextTime && ts.performanceTime && now-ts.performanceTime >= -50 && now-ts.performanceTime < 500) {
    return ts.contextTime + (at-ts.performanceTime)/1000;
  }
  return clock.currentTime - Math.max(0,clock.baseLatency||0) - Math.max(0,clock.outputLatency||0) + (at-now)/1000;
}
export function rank(score: number) { return score >= 950000 ? 'S' : score >= 850000 ? 'A' : score >= 700000 ? 'B' : score >= 500000 ? 'C' : 'D'; }
export function layout(width: number, height: number) {
  const wide = width / Math.max(1,height) >= 1.2;
  const w = wide ? 1000 : 520, h = wide ? 600 : 900;
  return { wide, width: w, height: h, scale: Math.max(0, Math.min(width/w, height/h)) };
}

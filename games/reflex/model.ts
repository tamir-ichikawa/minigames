export type Phase = 'title' | 'wait' | 'go' | 'feedback' | 'result';
export class ReflexRound {
  phase: Phase = 'title';
  results: (number | null)[] = [];
  greenAt = 0;
  begin() { this.results = []; this.phase = 'wait'; }
  green(now: number) { if (this.phase === 'wait') { this.phase = 'go'; this.greenAt = now; } }
  tap(now: number): number | null | undefined {
    if (this.phase !== 'go' && this.phase !== 'wait') return undefined;
    const value = this.phase === 'wait' ? null : Math.max(0, Math.round(now - this.greenAt));
    this.results.push(value); this.phase = 'feedback'; return value;
  }
  next() { this.phase = this.results.length >= 5 ? 'result' : 'wait'; }
  get summary() {
    const valid = this.results.filter((n): n is number => n !== null);
    return valid.length ? { average: Math.round(valid.reduce((sum, n) => sum + n, 0) / valid.length), best: Math.min(...valid), worst: Math.max(...valid) } : null;
  }
}

export interface Score {
  value: number;
  unit: string;
  direction: 'higher' | 'lower';
}
export interface Settings { muted: boolean; }
export interface Platform {
  storage: {
    read<T>(key: string, fallback: T): T;
    write<T>(key: string, value: T): boolean;
  };
  /** Read-only compatibility path for migrating an existing save key. */
  readLegacyNumber(key: string): number | null;
  onSuspend(callback: () => void): () => void;
}
export interface GameContext {
  container: HTMLElement;
  platform: Platform;
  settings: Settings;
  assetUrl(path: string): string;
  reportScore(score: Score | null): void;
  requestExit(): void;
}
export interface GameModule {
  init(context: GameContext): Promise<void> | void;
  /** Opens the game's title screen; a round may still need the game's start button. */
  start(): Promise<void> | void;
  pause(): Promise<void> | void;
  resume(): Promise<void> | void;
  /** Resets to title, preserving best scores and preferences. */
  reset(): Promise<void> | void;
  destroy(): Promise<void> | void;
  getScore(): Score | null;
  setSettings(settings: Settings): void;
}
export interface GameDefinition {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  category: 'action' | 'puzzle' | 'brain' | 'other';
  enabled: boolean;
  engine: 'legacy' | 'phaser' | 'canvas' | 'webgl';
  module: string;
  order: number;
  color: string;
  icon: string;
  legacyUrl?: string;
  score?: { selector: string; unit: string; direction: 'higher' | 'lower' };
}
export interface RegisteredGame extends GameDefinition {
  load(): Promise<{ createGame(): GameModule }>;
}

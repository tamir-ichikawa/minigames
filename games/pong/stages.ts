/** Stage content is independent of the rally rules. Add a stage here and its assets. */
export interface StarStage {
  id: string;
  title: string;
  subtitle: string;
  rival: string;
  background: string;
  sprites: Record<'idle' | 'sad' | 'happy' | 'return', string>;
  colors: { player: number; opponent: number; accent: number };
  difficulty: { initialSpeed: number; maxSpeed: number; opponentSpeed: number };
  bonus: { firstAfter: number; intervalMin: number; intervalMax: number; ufoPoints: number; cometPoints: number };
}
export const STAR_STAGES: StarStage[] = [{
  id: 'lumi-orbit', title: 'ルミの星めぐり', subtitle: 'きらめく宇宙で、気ままなラリー。', rival: 'ルミ',
  background: 'games/pong/assets/space-background.png',
  sprites: { idle: 'alien-idle.png', sad: 'alien-sad.png', happy: 'alien-happy.png', return: 'alien-return.png' },
  colors: { player: 0xff77ba, opponent: 0xa2f7ad, accent: 0xc9ffa2 },
  difficulty: { initialSpeed: 280, maxSpeed: 470, opponentSpeed: 175 },
  bonus: { firstAfter: 5, intervalMin: 8, intervalMax: 13, ufoPoints: 250, cometPoints: 150 }
}];
export const STAR_COLORS = [0xff71b5, 0x6ce5ff, 0xffdf62, 0xb896ff, 0x9affaa];

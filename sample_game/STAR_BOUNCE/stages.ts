import type { Character } from './content';
export type BackgroundMode = 'layered' | 'still';
export interface StageTheme {
  name:string; file:string; kind:'stars'|'embers'|'fireflies'|'mist';
  tint:number; accent:number; foreground:number; foreground2:number; speed:number;
}
// Home environments belong to the opponent, independently of chapter order or route.
export const STAGES:Record<string,StageTheme>={
  popo:{name:'星便の宇宙船港',file:'assets/stage-harbor.png',kind:'embers',tint:0xffe1b7,accent:0xffcc8c,foreground:1,foreground2:2,speed:5},
  merry:{name:'メリーの船内カフェ',file:'assets/stage-cafe.png',kind:'mist',tint:0xffebd9,accent:0xffd6b5,foreground:5,foreground2:2,speed:3},
  kuro:{name:'夜ふかしドック',file:'assets/stage-harbor.png',kind:'stars',tint:0x9cb7f5,accent:0x95baff,foreground:2,foreground2:1,speed:7},
  neneko:{name:'ひみつの艦橋',file:'assets/stage-bridge.png',kind:'stars',tint:0xe6c9ff,accent:0xd6aaff,foreground:2,foreground2:0,speed:4},
  akane:{name:'キャンディー環の展望台',file:'assets/candy-orbit.png',kind:'stars',tint:0xffd7d0,accent:0xffb1bd,foreground:0,foreground2:6,speed:6},
  tokori:{name:'風わたる水の惑星',file:'assets/stage-coast.png',kind:'mist',tint:0xd2f0ff,accent:0xb4e5ed,foreground:4,foreground2:7,speed:8},
  mokkul:{name:'木の実と蛍の森',file:'assets/stage-forest.png',kind:'fireflies',tint:0xd9ffe3,accent:0xdaf39a,foreground:3,foreground2:3,speed:3}
};
export const stageFor=(id:string)=>STAGES[id]??STAGES.popo;
export type BarPattern='ribbon'|'pearl'|'fang'|'crescent'|'ember'|'feather'|'leaf';
export const BAR_PATTERNS:Record<string,BarPattern>={popo:'ribbon',merry:'pearl',kuro:'fang',neneko:'crescent',akane:'ember',tokori:'feather',mokkul:'leaf'};
export function barStyle(c:Character){return {pattern:BAR_PATTERNS[c.id]??'ribbon',color:c.color,dark:c.side==='DARK'};}

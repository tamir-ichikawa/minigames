export const FIELD = { width:560, height:660, left:28, right:532, top:76, playerY:590, collectY:628, playerRadius:18 };
export const DEFAULTS = { balls:3, speed:430, interval:.15, lifetime:5, playerSpeed:270, enemySpeed:1, enemyHP:1, contactDamage:10, spawnInterval:.65, pushback:64, baseExp:50, growth:1.25, seed:1206, practice:0, prediction:0 };
export type Settings = typeof DEFAULTS;
export type EnemyKind = 'slime'|'skeleton'|'bat'|'ghost'|'golem';
export const ENEMIES:Record<EnemyKind,{hp:number;speed:number;radius:number;exp:number;row:number;size:number;name:string}> = {
  slime:{hp:10,speed:22,radius:17,exp:5,row:2,size:48,name:'スライム'},
  skeleton:{hp:40,speed:16,radius:19,exp:15,row:3,size:54,name:'スケルトン'},
  bat:{hp:10,speed:39,radius:12,exp:5,row:4,size:40,name:'コウモリ'},
  ghost:{hp:20,speed:27,radius:15,exp:10,row:5,size:45,name:'ゴースト'},
  golem:{hp:260,speed:0,radius:48,exp:100,row:6,size:140,name:'城塞の守護ゴーレム'}
};
export const WAVES:EnemyKind[][] = [
  Array(10).fill('slime'),
  ['slime','slime','skeleton','slime','bat','slime','skeleton','slime','bat','skeleton','slime','skeleton'],
  ['slime','bat','ghost','skeleton','slime','bat','ghost','slime','skeleton','bat','slime','ghost','bat','skeleton','slime'],
  ['golem']
];
export const WAVE_NAMES = ['城門の向こうから','骨の行進','宵闇の翼','城塞の守護ゴーレム'];
export const UPGRADE_IDS = ['damage','speed','count','health','pierce','heal'] as const;
export type Upgrade = typeof UPGRADE_IDS[number];
export const UPGRADE_INFO:Record<Upgrade,{name:string;icon:string;description:string}> = {
  damage:{name:'力のしずく',icon:'✦',description:'球ダメージ ＋20％'},
  speed:{name:'追い風の加護',icon:'»',description:'球の速さ ＋15％'},
  count:{name:'もうひとつの球',icon:'●',description:'総球数 ＋1'},
  health:{name:'ぶたのおまもり',icon:'♥',description:'最大HP・現在HP ＋20'},
  pierce:{name:'つらぬく光',icon:'↟',description:'貫通回数 ＋1'},
  heal:{name:'休息の光',icon:'♡',description:'HPを20回復（上限時の代替報酬）'}
};
export const LIMITS={balls:24,enemies:40,effects:80};
export const UPGRADE_CAPS:Record<Upgrade,number>={damage:10,speed:3,count:24,health:6,pierce:3,heal:Infinity};

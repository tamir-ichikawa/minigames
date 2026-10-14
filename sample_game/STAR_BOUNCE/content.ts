export type Side = 'GOOD' | 'DARK';
export type Skill = 'wide' | 'slow' | 'shot' | 'sleep' | 'fever' | 'guard' | 'charge';
export interface Character {
  id: string; name: string; side: Side; file: string; color: number;
  role: string; trait: string; skill: Skill; skillName: string; skillText: string;
  width: number; speed: number; charge: number;
  atlas: 'good'|'dark'; row: number;
}
export const CHARACTERS: Character[] = [
  {id:'popo',atlas:'good',row:0,name:'ポポ',side:'GOOD',file:'sozai/B4469AC7-9484-43AC-8575-5A1CCE9E430D.png',color:0xffbb7a,role:'星の配達屋',trait:'少し広いバーで、返球しやすい。',skill:'wide',skillName:'もふもふワイド',skillText:'6秒間、バーが大きくなる。',width:118,speed:460,charge:20},
  {id:'merry',atlas:'good',row:1,name:'メリー',side:'GOOD',file:'sozai/94884962-652E-4BE9-B929-8ED8E5E1C5C4.png',color:0xffdceb,role:'お茶会の案内役',trait:'安定した広さ。ゆっくり派に。',skill:'slow',skillName:'ふわふわタイム',skillText:'5秒間、ボールがゆっくりになる。',width:110,speed:430,charge:20},
  {id:'kuro',atlas:'dark',row:0,name:'クロ',side:'DARK',file:'sozai/583FEC36-0CF7-4008-A7B2-01F1A1FFD66B.png',color:0xa9bfff,role:'夜ふかし見張り番',trait:'少し細いバー。移動は速め。',skill:'shot',skillName:'わんぱくショット',skillText:'次の返球を速いパワーショットに。',width:96,speed:510,charge:20},
  {id:'neneko',atlas:'dark',row:1,name:'ネネコ',side:'DARK',file:'sozai/577A7DEF-F543-4F5E-B3AB-4F922BE7522D.png',color:0xdaa8ff,role:'おやつ独占団の会長',trait:'扱いやすい、バランス型。',skill:'sleep',skillName:'うとうとビーム',skillText:'5秒間、相手の動きがゆっくりに。',width:106,speed:460,charge:20},
  {id:'akane',atlas:'dark',row:2,name:'アカネ',side:'DARK',file:'sozai/4F037391-5B6A-42B1-84C3-D527F423B293.png',color:0xff9588,role:'おやつの収集家',trait:'細いバーと、いちばん速い移動。',skill:'fever',skillName:'おやつフィーバー',skillText:'7秒間、得点が2倍になる。',width:88,speed:550,charge:20},
  {id:'tokori',atlas:'good',row:2,name:'トコリ',side:'GOOD',file:'sozai/D15FE97B-3C07-4435-9875-FBFD9F166F20.png',color:0x91dcf5,role:'銀河の小さな偵察隊',trait:'小回りが利き、必殺ゲージが早くたまる。',skill:'charge',skillName:'つばさのエール',skillText:'6秒間、返球の得点が3倍になる。',width:98,speed:540,charge:25},
  {id:'mokkul',atlas:'good',row:3,name:'モックル',side:'GOOD',file:'sozai/67906500-D5C2-4827-ABB9-4F97C1509D66.png',color:0xb0d98e,role:'木の実の森の守り手',trait:'広めのバーで、じっくり守る。',skill:'guard',skillName:'このはのおまもり',skillText:'8秒以内のミスを1回だけ防ぐ。',width:122,speed:400,charge:20}
];
export interface Chapter { title: string; location: string; rival: string; intro: string; reply: string; after: string; color: number; ai: number; }
export const STORIES: Record<Side, {name: string; description: string; ending: string; chapters: Chapter[]}> = {
  GOOD: {name:'銀河のおやつ配達団',description:'独占団より先に、みんなへおやつを届けよう。',ending:'独占団の倉庫を開くと、クッキーが山ほど！ でもひとりで食べるより、みんなで交換する方がおいしい。銀河のおやつ交換会が始まりました。',chapters:[
    {title:'クッキー便の発着場',location:'MINT HARBOR',rival:'kuro',intro:'星まつりのクッキー便を、クロが通せんぼ。独占団の倉庫へ運びたいらしい。',reply:'この香り、ぜんぶ取っておきたい！ ラリーで勝ったら道をあけるよ。',after:'クロは一枚だけ味見して道をあけた。焼きたての香りを、次の星にも届けよう。',color:0x84e3ce,ai:148},
    {title:'キャンディーの環を抜けて',location:'CANDY ORBIT',rival:'akane',intro:'おやつ航路でアカネが待っている。全種類のキャンディーを集めるつもりだ。',reply:'最後の一粒までコレクションしたいの！ でも交換なら…ちょっと考える。',after:'アカネと味を交換した。集める楽しみも、分ける楽しみも増えた！',color:0xffb48d,ai:174},
    {title:'おやつ独占団のひみつ基地',location:'MIDNIGHT PANTRY',rival:'neneko',intro:'巨大な倉庫の前でネネコが得意顔。銀河のおやつを独り占めする最後の作戦だ！',reply:'ぜんぶ私たちのおやつにするの！ …でも、ひとりのお茶会って少し静かね。',after:'最後のラリーで倉庫が開いた。独占団も配達団も、同じテーブルに集合！',color:0xc9b4ff,ai:198}
  ]},
  DARK: {name:'銀河のおやつ独占計画',description:'銀河じゅうのおやつを、ひみつの倉庫に集めよう！',ending:'銀河じゅうのおやつが集まった！ でも山ほどのクッキーは食べきれないし、感想を言い合う仲間がほしい。独占団は今日だけ「おやつ交換団」に。明日こそ独占…するかは、お茶のあと！',chapters:[
    {title:'焼きたて工房をねらえ',location:'COOKIE WORKSHOP',rival:'merry',intro:'作戦その1。メリーの工房の焼きたてクッキーを、まるごといただこう！',reply:'ぜんぶはだめ。でもラリーしてくれたら、とっておきを一箱あげる！',after:'とっておきの一箱を獲得！ メリーの分まで食べるのは、また今度にしよう。',color:0xc9b4ff,ai:148},
    {title:'木の実の宝庫をさがせ',location:'ACORN ORBIT',rival:'mokkul',intro:'作戦その2。モックルの森に、銀河一おいしい木の実タルトがあるらしい。',reply:'森の仲間の分は残してね。勝負のあとは、一緒に焼こう！',after:'秘密のレシピも教えてもらった。作った方がいっぱい食べられるかもしれない。',color:0xffbd95,ai:174},
    {title:'最後の配達便をつかまえろ',location:'SWEET VAULT',rival:'tokori',intro:'最後の作戦！ トコリの配達便が来る前に、巨大なおやつ倉庫を完成させよう。',reply:'独り占めより味くらべ！ 最後のラリーで、どちらが楽しいか決めよう。',after:'倉庫は満杯！ トコリが持ってきたのは、みんなを招くお茶会の招待状だった。',color:0x97decf,ai:198}
  ]}
};
export const byId = (id: string) => CHARACTERS.find(c=>c.id===id) ?? CHARACTERS[0];
export const HP_COLORS = [0xff86bd,0x78e5ff,0xffdf7b,0xc4a2ff,0x99edb2];

// Visual and collision dimensions share the same coordinate system.
export const BONUSES = {
  falcon: {name:'ファルコン号', atlas:'falcon', originX:.5, row:0, width:150, height:150, radiusX:56, radiusY:42, points:350, speed:74},
  fighter: {atlas:'bonus', originX:.56, name:'星便インターセプター', row:0, width:140, height:140, radiusX:42, radiusY:38, points:150, speed:88},
  freighter: {atlas:'bonus', originX:.59, name:'おやつ輸送船', row:1, width:150, height:150, radiusX:48, radiusY:42, points:250, speed:58},
  probe: {atlas:'bonus', originX:.62, name:'小型探査艇', row:2, width:120, height:120, radiusX:34, radiusY:38, points:200, speed:100},
  cruiser: {atlas:'bonus', originX:.57, name:'星まつり護衛艦', row:3, width:164, height:164, radiusX:50, radiusY:32, points:300, speed:66}
} as const;

export type Difficulty = 'easy'|'normal'|'hard';
export const DIFFICULTIES = {
  easy: {label:'イージー', description:'これまでの遊び心地。ゆっくり練習。', serve:270, gain:8, cap:485, ai:0, reaction:.16, threshold:10000},
  normal: {label:'通常', description:'相手はしっかり返球。加速ラリーで突破！', serve:300, gain:22, cap:950, ai:420, reaction:.10, threshold:480},
  hard: {label:'難しい', description:'速い球にも強い相手。長いラリーに挑戦。', serve:330, gain:28, cap:1250, ai:590, reaction:.065, threshold:730}
} as const;
export const ATLASES = {good:{file:'assets/good-sheet.png',cols:6,rows:4},dark:{file:'assets/dark-sheet.png',cols:6,rows:3},bonus:{file:'assets/fleet-sheet.png',cols:4,rows:4},falcon:{file:'assets/falcon-sheet.png',cols:2,rows:2}} as const;

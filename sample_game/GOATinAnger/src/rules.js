export const VIEW = { width:540, height:960 };
export const WORLD = { width:540, height:2880 };
export const PLAYER_START = { x:270, y:2660 };
export const EXTRACTION = { x:190, y:115, width:160, height:85 };
export const SECTORS = [
  {name:'森林入口',top:1920,gate:2050,color:0x899768},
  {name:'渓谷の橋',top:960,gate:1090,color:0x728b79},
  {name:'北の前哨地',top:0,gate:130,color:0x9a9476},
];
export const SPAWN_LANES=[90,180,270,360,450];
export function reinforcementDelay(wave){return Math.max(1300,1900-wave*200);}
export function reinforcementPosition(index,wave,cameraTop=0){return {x:SPAWN_LANES[(index*2+wave-1)%SPAWN_LANES.length],y:cameraTop-16};}
export function directionFromAngle(angle){
  const directions=[
    {name:'right',sheet:'right',flip:false},{name:'down-right',sheet:'down-right',flip:false},
    {name:'down',sheet:'down',flip:false},{name:'down-left',sheet:'down-right',flip:true},
    {name:'left',sheet:'right',flip:true},{name:'up-left',sheet:'up-right',flip:true},
    {name:'up',sheet:'up',flip:false},{name:'up-right',sheet:'up-right',flip:false},
  ];
  return directions[(Math.round(angle/(Math.PI/4))%8+8)%8];
}
export function cameraTopFor(y){return Math.max(0,Math.min(WORLD.height-VIEW.height,y-690));}
export function canEnterNextSector(wave,cleared,y){return wave>0&&wave<SECTORS.length&&cleared>=wave&&y<=SECTORS[wave-1].top+60;}
export const BULLET_RANGE = 320;
export const WAVES = [6, 8, 10];
export const UNITS = {
  leader: { name: '小隊長', english: 'LEADER', role: 'SQUAD LEADER', description: '前線を切り拓く、頼れるリーダー。', speed: 205, fireRate: 170, health: 5, speedDots: '●●●○', fireDots: '●●●○' },
  scout: { name: '斥候', english: 'SCOUT', role: 'RECON SPECIALIST', description: '素早い足取りで、敵の側面に回り込む。', speed: 255, fireRate: 200, health: 4, speedDots: '●●●●', fireDots: '●●○○' },
  medic: { name: '衛生兵', english: 'MEDIC', role: 'FIELD MEDIC', description: '打たれ強さで、小隊を最後まで支える。', speed: 185, fireRate: 200, health: 7, speedDots: '●●○○', fireDots: '●●○○' },
  rifleman: { name: '歩兵', english: 'RIFLEMAN', role: 'RIFLE SPECIALIST', description: '絶え間ない援護射撃で、敵を押し返す。', speed: 190, fireRate: 125, health: 5, speedDots: '●●○○', fireDots: '●●●●' },
};
export function movementVector(left, right, up, down, speed) {
  let x = Number(right) - Number(left), y = Number(down) - Number(up);
  const length = Math.hypot(x, y);
  return length ? { x: x / length * speed, y: y / length * speed } : { x: 0, y: 0 };
}
export function withinRange(x, y, originX, originY, range) {
  return (x - originX) ** 2 + (y - originY) ** 2 < range ** 2;
}
export function padScore(score) { return String(score).padStart(5, '0'); }

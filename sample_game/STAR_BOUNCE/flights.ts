import { BONUSES } from './content';

export type FlightMotion='straight'|'diagonal'|'wave'|'arc';
export const FLIGHT_MOTIONS:FlightMotion[]=['diagonal','wave','arc','straight'];
export interface Target {
  id:number;kind:keyof typeof BONUSES;x:number;y:number;vx:number;vy?:number;
  flight?:{motion:FlightMotion;age:number;duration:number;fromX:number;toX:number;fromY:number;toY:number;amplitude:number};
}

export function spawnFlight(id:number,height:number,random:()=>number):Target {
  const kinds=Object.keys(BONUSES) as (keyof typeof BONUSES)[];
  const kind=kinds[(id-1)%kinds.length];
  const motion=FLIGHT_MOTIONS[(id-1)%FLIGHT_MOTIONS.length],right=random()<.5;
  const fromX=right?-100:580,toX=right?580:-100,direction=random()<.5?1:-1;
  let fromY=height*(.32+random()*.36),toY=fromY,amplitude=0;
  if(motion==='diagonal'){fromY=height*(direction>0?.28:.72);toY=height*(direction>0?.72:.28);}
  if(motion==='wave'){fromY=toY=height*.5;amplitude=height*.09*direction;}
  if(motion==='arc'){fromY=toY=height*.5;amplitude=height*.18*direction;}
  const target:Target={id,kind,x:fromX,y:fromY,vx:0,vy:0,flight:{motion,age:0,duration:680/BONUSES[kind].speed,fromX,toX,fromY,toY,amplitude}};
  advanceFlight(target,0);return target;
}

export function advanceFlight(t:Target,dt:number){
  const f=t.flight;if(!f){t.x+=t.vx*dt;t.y+=(t.vy??0)*dt;return;}
  f.age+=dt;const progress=f.age/f.duration;
  const frequency=f.motion==='wave'?Math.PI*2:f.motion==='arc'?Math.PI:0;
  t.x=f.fromX+(f.toX-f.fromX)*progress;
  t.y=f.fromY+(f.toY-f.fromY)*progress+Math.sin(progress*frequency)*f.amplitude;
  t.vx=(f.toX-f.fromX)/f.duration;
  t.vy=(f.toY-f.fromY+Math.cos(progress*frequency)*frequency*f.amplitude)/f.duration;
}

export function resizeFlight(t:Target,ratio:number){
  t.y*=ratio;if(t.vy!==undefined)t.vy*=ratio;
  if(t.flight){t.flight.fromY*=ratio;t.flight.toY*=ratio;t.flight.amplitude*=ratio;}
}

export const flightAngle=(t:Target)=>Math.atan2(t.vy??0,t.vx||.00001);

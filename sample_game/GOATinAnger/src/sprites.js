import { directionFromAngle } from './rules.js';
export const FACINGS = ['right','up-right','up','down-right','down'];
export const ACTIONS = {
  idle:{frames:[0,6],fps:2},walk:{frames:[1,0,2,0],fps:10},
  shoot:{frames:[3,4],fps:16},walkShoot:{frames:[1,4,2,3],fps:13},
  hurt:{frames:[5,6,5],fps:12,hold:true},down:{frames:[7,8,9],fps:7,hold:true},
  victory:{frames:[0,6],fps:3},
};
// Generated atlases have small variations in row spacing. Find transparent
// gutters near the nominal grid instead of allowing a neighbour's feet to bleed.
function gutterCuts(length,count,measure){
  const step=length/count,cuts=[0];
  for(let i=1;i<count;i++){
    const center=i*step;let best=Math.round(center),score=Infinity;
    for(let p=Math.round(center-step*.20);p<=center+step*.20;p++){
      const value=measure(p)*100+Math.abs(p-center);
      if(value<score){score=value;best=p;}
    }
    cuts.push(best);
  }
  return [...cuts,length];
}
export function installActionFrames(scene) {
  for(const faction of ['goat','fox'])for(const facing of FACINGS){
    const key=`${faction}-${facing}`,raw=scene.textures.get(key).getSourceImage();
    const rows=faction==='goat'?4:6;
    const source=document.createElement('canvas');source.width=raw.width;source.height=raw.height;
    const sourceContext=source.getContext('2d',{willReadFrequently:true});sourceContext.drawImage(raw,0,0);
    const pixels=sourceContext.getImageData(0,0,raw.width,raw.height).data;
    const opaque=(x,y)=>pixels[(y*raw.width+x)*4+3]>64?1:0;
    const ys=gutterCuts(raw.height,rows,y=>{let n=0;for(let x=0;x<raw.width;x++)n+=opaque(x,y);return n;});
    const packed=scene.textures.createCanvas(`${key}-packed`,1280,128*rows),ctx=packed.context;
    for(let row=0;row<rows;row++){
      const y=ys[row],h=ys[row+1]-y;
      const xs=gutterCuts(raw.width,10,x=>{let n=0;for(let yy=y;yy<y+h;yy++)n+=opaque(x,yy);return n;});
      let top=y+h,bottom=y;
      for(let yy=y;yy<y+h;yy++)for(let x=xs[0];x<xs[1];x++)if(opaque(x,yy)){top=Math.min(top,yy);bottom=Math.max(bottom,yy);}
      const scale=104/Math.max(1,bottom-top+1);
      for(let col=0;col<10;col++){
        const x=xs[col],w=xs[col+1]-x;
        ctx.save();ctx.beginPath();ctx.rect(col*128,row*128,128,128);ctx.clip();
        ctx.drawImage(raw,x,y,w,h,col*128+64-w*scale/2,row*128+120-(bottom-y)*scale,w*scale,h*scale);
        ctx.restore();packed.add(`${row}:${col}`,0,col*128,row*128,128,128);
      }
    }
    packed.refresh();
  }
  // Use the same proportions in the selectable character portraits.
  document.querySelectorAll('.unit-choice').forEach((button,row)=>{
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
    canvas.getContext('2d').drawImage(scene.textures.get('goat-down-packed').getSourceImage(),0,row*128,128,128,0,0,128,128);
    const portrait=canvas.toDataURL();
    button.querySelector('img').src=portrait;
    if(button.classList.contains('selected'))document.getElementById('unit-portrait').src=portrait;
  });
}
export function animateActor(actor,clock,animationClock) {
  const moving=actor.body?.enable&&actor.body.velocity.lengthSq()>4;
  const shooting=clock<actor.shotUntil;
  const action=actor.dead?'down':actor.victory?'victory':clock<actor.hurtUntil?'hurt':shooting?(moving?'walkShoot':'shoot'):moving?'walk':'idle';
  const direction=directionFromAngle(actor.facing??Math.PI/2);
  if(actor.action!==action){actor.action=action;actor.actionAt=animationClock;}
  actor.direction=direction.name;
  const spec=ACTIONS[action],step=Math.floor((animationClock-actor.actionAt)*spec.fps/1000);
  let frame=spec.frames[spec.hold?Math.min(step,spec.frames.length-1):step%spec.frames.length];
  // The side-view fox's closed-eye resting pose is column 8.
  if(action==='down'&&actor.faction==='fox'&&['right','down-right'].includes(direction.sheet))frame=[7,9,8][Math.min(step,2)];
  actor.art.setTexture(`${actor.faction}-${direction.sheet}-packed`,`${actor.spriteRow}:${frame}`).setFlipX(direction.flip);
}

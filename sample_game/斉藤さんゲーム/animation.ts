import type Phaser from 'phaser';
import type { Point } from './model';

export type Facing='down'|'left'|'right'|'up';
export type Actor='maro'|'spike'|'knuckle';
export const DIRECTIONS:Facing[]=['down','left','right','up'];
import atlasBounds from './assets/walk-bounds-v2.json';
export const SHEET_DIRECTIONS=['down','left','up'] as const;
const bounds=atlasBounds as Record<string,number[][]>;
export const sheetKey=(actor:Actor,direction:Facing)=>`${actor}-${direction==='right'?'left':direction}-walk`;
/** Split generated sheets at load time, retaining only each character's connected
 * silhouette. Tight source rectangles may overlap neighboring tails/noses; a
 * plain rectangular cut would leak those pixels into the game. Source PNGs stay intact. */
export function registerWalkFrames(scene:Phaser.Scene){
  for(const actor of ['maro','spike','knuckle'] as Actor[])for(const direction of SHEET_DIRECTIONS){
    const key=sheetKey(actor,direction),source=scene.textures.get(key+'-source').getSourceImage() as HTMLImageElement;
    const scratch=document.createElement('canvas');scratch.width=source.width;scratch.height=source.height;
    const context=scratch.getContext('2d',{willReadFrequently:true})!;context.drawImage(source,0,0);
    const pixels=context.getImageData(0,0,source.width,source.height),rectangles=bounds[`${actor}-${direction}`];
    const texture=scene.textures.createCanvas(key,1024,512)!,c=texture.context;
    const average=rectangles.reduce((sum,b)=>sum+b[3]-b[1],0)/8,scale=176/average;
    rectangles.forEach(([left,top,right,bottom],i)=>{
      const w=right-left,h=bottom-top,labels=new Int32Array(w*h),queue=new Int32Array(w*h);
      let label=0,biggest=0,biggestSize=0;
      const alpha=(n:number)=>pixels.data[((top+Math.floor(n/w))*source.width+left+n%w)*4+3];
      for(let n=0;n<w*h;n++){
        if(labels[n]||alpha(n)<=100)continue;
        label++;let head=0,tail=1;queue[0]=n;labels[n]=label;
        while(head<tail){
          const p=queue[head++],x=p%w;
          const visit=(q:number)=>{if(q>=0&&q<w*h&&!labels[q]&&alpha(q)>100){labels[q]=label;queue[tail++]=q;}};
          if(x)visit(p-1);if(x<w-1)visit(p+1);visit(p-w);visit(p+w);
        }
        if(tail>biggestSize){biggest=label;biggestSize=tail;}
      }
      const cut=document.createElement('canvas');cut.width=w;cut.height=h;const cc=cut.getContext('2d')!,isolated=cc.createImageData(w,h);
      for(let n=0;n<w*h;n++){
        const x=n%w;
        const belongs=labels[n]===biggest||(x>0&&labels[n-1]===biggest)||(x<w-1&&labels[n+1]===biggest)||labels[n-w]===biggest||labels[n+w]===biggest;
        if(belongs){const original=((top+Math.floor(n/w))*source.width+left+x)*4;isolated.data.set(pixels.data.subarray(original,original+4),n*4);}
      }
      cc.putImageData(isolated,0,0);
      const x=(i%4)*256,y=Math.floor(i/4)*256;
      c.drawImage(cut,x+128-w*scale/2,y+232-h*scale,w*scale,h*scale);
      texture.add(`${direction}-${i}`,0,x,y,256,256);
      if(direction==='left')texture.add(`right-${i}`,0,x,y,256,256);
    });
    texture.refresh();scene.textures.remove(key+'-source');
  }
}
export const WALK_FRAMES=8, STRIDE_DISTANCE=56, TURN_DISTANCE=12;
export class WalkCycle {
  facing:Facing='up'; phase=0; moving=false;
  private pending:Point={x:0,y:0};
  reset(facing:Facing='up'){this.facing=facing;this.phase=0;this.moving=false;this.pending={x:0,y:0};}
  advance(before:Point,after:Point,active:boolean){
    const dx=after.x-before.x,dy=after.y-before.y,d=Math.hypot(dx,dy);
    this.moving=active&&d>1e-8&&d<40;
    // Keep the traveled fraction through idle frames and pointer-event gaps.
    // Slow drags then use exactly the same gait as fast drags of equal length.
    if(!this.moving)return;
    this.phase=(this.phase+d/STRIDE_DISTANCE*WALK_FRAMES)%WALK_FRAMES;
    const horizontal=this.facing==='left'||this.facing==='right';
    const along=this.facing==='right'?dx:this.facing==='left'?-dx:this.facing==='up'?-dy:dy;
    const across=horizontal?Math.abs(dy):Math.abs(dx);
    if(along>0&&along>=across*.8){this.pending={x:0,y:0};return;}
    this.pending.x+=dx;this.pending.y+=dy;
    const x=Math.abs(this.pending.x),y=Math.abs(this.pending.y);
    let next:Facing|undefined;
    if(x>=TURN_DISTANCE&&x>y*1.4)next=this.pending.x<0?'left':'right';
    if(y>=TURN_DISTANCE&&y>x*1.4)next=this.pending.y<0?'up':'down';
    if(next&&next!==this.facing){this.facing=next;this.pending={x:0,y:0};}
  }
  get frame(){return `${this.facing}-${Math.floor(this.phase+1e-9)%WALK_FRAMES}`;}
}
export function pose(sprite:Phaser.GameObjects.Sprite,actor:Actor,walk:WalkCycle){
  sprite.setTexture(sheetKey(actor,walk.facing),walk.frame).setOrigin(.5,232/256).setFlipX(walk.facing==='right');
  const height=actor==='maro'?(walk.facing==='down'?56:walk.facing==='up'?58:52):actor==='spike'?88:74;
  sprite.setScale(height/176);
}

import Phaser from 'phaser';
import type { Character } from './content';
import { barStyle } from './stages';

/** Cosmetic energy blades. Their solid core always follows the model's paddle dimensions. */
export function drawEnergyBar(g:Phaser.GameObjects.Graphics,x:number,y:number,width:number,c:Character,time:number,hit:number){
  const {pattern,color,dark}=barStyle(c),left=x-width/2,right=x+width/2;
  const pulse=.5+.5*Math.sin(time*(dark?7:2.5));
  g.fillStyle(color,.07+pulse*.035).fillRoundedRect(left-7,y-14,width+14,28,14)
    .fillStyle(color,.15+hit*.15).fillRoundedRect(left-3,y-8,width+6,16,8)
    .fillStyle(color,1).fillRoundedRect(left,y-5,width,10,dark?2:5)
    .fillStyle(0xffffff,.9).fillRoundedRect(left+4,y-1.5,width-8,3,1.5);
  if(dark){
    for(let i=0;i<6;i++){const px=left+8+i*(width-16)/5,wave=Math.sin(time*8+i*2);g.lineStyle(1,color,.25+pulse*.2).lineBetween(px,y-7,px+3,y-10-Math.abs(wave)*4);}
  }else{
    for(let i=0;i<5;i++){const px=left+5+((time*9+i*width/5)%width);g.fillStyle(color,.15+pulse*.12).fillCircle(px,y+Math.sin(time*2+i*2)*10,1.3);}
  }
  g.lineStyle(1,color,.8);
  switch(pattern){
    case 'ribbon':g.strokeRoundedRect(left+3,y-6,width-6,12,6).lineBetween(left+10,y+4,right-10,y+4);break;
    case 'pearl':for(let i=0;i<5;i++)g.fillStyle(0xfff5ed,.7).fillCircle(left+9+i*(width-18)/4,y,2.7);break;
    case 'feather':for(const sign of [-1,1])for(let i=0;i<3;i++)g.lineBetween(x+sign*(width/2-8-i*5),y,x+sign*(width/2-3-i*5),y-7+i);break;
    case 'leaf':for(const sign of [-1,1])g.fillStyle(color,.75).fillEllipse(x+sign*(width/2-7),y-5,11,5);break;
    case 'fang':for(const sign of [-1,1])g.fillStyle(color,.8).fillTriangle(x+sign*width/2,y-7,x+sign*(width/2-10),y,x+sign*width/2,y+7);break;
    case 'crescent':g.beginPath().arc(left+5,y,7,-Math.PI/2,Math.PI/2).strokePath().beginPath().arc(right-5,y,7,Math.PI/2,Math.PI*1.5).strokePath();break;
    case 'ember':for(let i=0;i<4;i++)g.fillStyle(0xffdf9d,.5+pulse*.4).fillTriangle(left+12+i*(width-24)/3,y-3,left+8+i*(width-24)/3,y+3,left+16+i*(width-24)/3,y+3);break;
  }
  if(hit>0)g.lineStyle(2,color,hit*.7).strokeEllipse(x,y,width+14+(1-hit)*18,14+(1-hit)*24);
}

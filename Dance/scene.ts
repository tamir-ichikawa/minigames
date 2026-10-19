import Phaser from 'phaser';
import { DIFFICULTIES } from './rhythm';
import type { DanceController } from './index';
const angles = [-Math.PI/2,Math.PI,0,Math.PI/2];
export class DanceScene extends Phaser.Scene {
  ink!: Phaser.GameObjects.Graphics;
  judgeLabel!: Phaser.GameObjects.Text;
  comboLabel!: Phaser.GameObjects.Text;
  readyLabel!: Phaser.GameObjects.Text;
  constructor(public controller: DanceController, private ready: () => void) { super('dance'); }
  create() {
    this.ink = this.add.graphics();
    const style = { fontFamily: 'system-ui, sans-serif', fontStyle:'bold', color:'#ffffff', stroke:'#10081e', strokeThickness:5 };
    this.judgeLabel = this.add.text(0,0,'',{...style,fontSize:'32px'}).setOrigin(.5);
    this.comboLabel = this.add.text(0,0,'',{...style,fontSize:'44px'}).setOrigin(.5);
    this.readyLabel = this.add.text(0,0,'',{...style,fontSize:'24px',align:'center'}).setOrigin(.5);
    this.ready();
  }
  arrow(x:number,y:number,lane:number,size:number,fill:number,alpha=1,outline=false) {
    const g=this.ink, a=angles[lane], points=[[0,-size],[size,0],[size*.42,0],[size*.42,size*.92],[-size*.42,size*.92],[-size*.42,0],[-size,0]];
    const p=points.map(([px,py])=>new Phaser.Geom.Point(x+px*Math.cos(a)-py*Math.sin(a),y+px*Math.sin(a)+py*Math.cos(a)));
    g.fillStyle(fill,outline ? .12 : alpha);g.fillPoints(p,true);g.lineStyle(outline?2:1.5,outline?0xe4cfff:0xffe8fa,alpha);g.strokePoints(p,true);
  }
  update() {
    const c=this.controller;if(!c.surface)return;
    c.tick();
    const {width:w,height:h,wide}=c.geometry,g=this.ink;g.clear();
    g.fillGradientStyle(0x211039,0x100b26,0x080717,0x130a24,1);g.fillRect(0,0,w,h);
    g.lineStyle(1,0x724195,.15);
    for(let x=-h;x<w+h;x+=65){g.lineBetween(x,0,x+h,h);g.lineBetween(x,0,x-h,h);}
    this.judgeLabel.setVisible(false);this.comboLabel.setVisible(false);this.readyLabel.setVisible(false);
    if(c.phase!=='playing')return;
    const t=c.audio?.time(c.calibration)??0, round=c.round!;
    const fx=wide?240:16,fw=wide?520:w-32,lw=fw/4,top=wide?84:198,bottom=h-70;
    const receptor=c.reverse?bottom-34:top+34,far=c.reverse?top:bottom,speed=Math.abs(far-receptor)/DIFFICULTIES[c.difficulty].approach;
    const sign=c.reverse?-1:1,size=wide?35:32,beat=60/c.song.bpm;
    const phase=((t-c.song.offset)/beat%1+1)%1,pulse=Math.pow(1-phase,3);
    for(let lane=0;lane<4;lane++){
      const x=fx+lane*lw,down=c.held(lane),flash=Math.max(0,1-(t-c.flashes[lane])/.2);
      g.fillStyle(lane%2?0x21172f:0x191126,.94);g.fillRect(x,top,lw,bottom-top);
      g.fillStyle(0xed6cb8,(down ? .2 : 0)+flash*.22);g.fillRect(x+2,top,lw-4,bottom-top);
      g.lineStyle(1,0xb886cf,.18);g.lineBetween(x,top,x,bottom);
      this.arrow(x+lw/2,receptor,lane,size,0xe3c8ff,.55+pulse*.4,true);
      this.arrow(x+lw/2,h-40,lane,12,down?0xffb9df:0xa089ba,.8,true);
    }
    g.lineStyle(1,0xe6b9ff,.28);g.lineBetween(fx,receptor,fx+fw,receptor);
    for(let b=Math.ceil((t-c.song.offset)/beat);b<(t-c.song.offset)/beat+6;b++){
      const y=receptor+sign*(c.song.offset+b*beat-t)*speed;
      if(y<top||y>bottom)continue;g.lineStyle(1,0xf3baff,b%4===0 ? .18 : .07);g.lineBetween(fx,y,fx+fw,y);
    }
    for(const n of round.notes){
      if(n.result)continue;const y=receptor+sign*(n.time-t)*speed;
      if(y<top-size||y>bottom+size)continue;
      // Clip arrows to the runway instead of drawing over controls/HUD.
      if(y<top+size||y>bottom-size)continue;
      this.arrow(fx+lw*(n.lane+.5),y,n.lane,size,n.sub?0x51c7ff:0xff5daf);
    }
    const judgeY=wide?h/2:(c.reverse?receptor-180:receptor+180);
    if(round.last&&t-round.last.time<.65){
      const last=round.last,colors={PERFECT:'#ffe28d',GREAT:'#7de8d4',GOOD:'#88cfff',MISS:'#ff879e'};
      this.judgeLabel.setPosition(w/2,judgeY).setText(last.result).setColor(colors[last.result]).setVisible(true);
      if(round.combo>0)this.comboLabel.setPosition(w/2,judgeY+54).setText(`${round.combo}`).setVisible(true);
    }
    const first=round.notes[0]?.time??0;
    if(t<first-beat*.5){
      const left=(first-t)/beat, text=left>4?'リズムを聴こう':`${Math.ceil(left)}`;
      this.readyLabel.setPosition(w/2,judgeY).setText(text).setColor(left>4?'#cdb8e1':'#ffe28d').setVisible(true);
    }
    g.fillStyle(0x47324f);g.fillRect(26,64,w-52,3);g.fillStyle(0xf16bb5);g.fillRect(26,64,(w-52)*Phaser.Math.Clamp(t/c.duration,0,1),3);
  }
}

import Phaser from 'phaser';
import { STAGES, stageFor, type BackgroundMode } from './stages';
import { DarkWakePipeline } from './dark-wake';

/** Exactly three visual planes. Still mode constructs a single image and has no per-frame work. */
export class StageBackdrop {
  readonly root:Phaser.GameObjects.Container;
  readonly far:Phaser.GameObjects.Image;
  private middle?:Phaser.GameObjects.TileSprite;
  private foreground?:Phaser.GameObjects.Container;
  private motes:Phaser.GameObjects.Arc[]=[];
  private frontImages:Phaser.GameObjects.Image[]=[];
  private elapsed=0;
  private glints?:Phaser.GameObjects.Graphics;
  private wake?:DarkWakePipeline;
  readonly theme;
  constructor(private scene:Phaser.Scene,readonly rival:string,private height:number,readonly mode:BackgroundMode){
    this.theme=stageFor(rival);this.root=scene.add.container();
    this.far=scene.add.image(240,height/2,`stage-${rival}`).setTint(this.theme.tint);
    const source=this.far.texture.getSourceImage();
    this.far.setScale(Math.max(480/source.width,height/source.height));
    this.root.add(this.far);
    if(mode==='still')return;
    // One tile for gently looping middle-distance light; additional bounded motes twinkle.
    this.middle=scene.add.tileSprite(240,height/2,480,height,`ambient-${this.theme.kind}`).setTint(this.theme.accent).setAlpha(.22);
    const middleLayer=scene.add.container();this.root.add(middleLayer);middleLayer.add(this.middle);
    for(let i=0;i<18;i++){
      const dot=scene.add.circle(20+(i*137)%440,20+(i*83)%Math.max(1,height-40),this.theme.kind==='fireflies'?2:1+i%3*.3, this.theme.accent,.25);
      this.motes.push(dot);middleLayer.add(dot);
    }
    this.glints=scene.add.graphics();middleLayer.add(this.glints);
    this.foreground=scene.add.container();this.root.add(this.foreground);
    // Decorations stay near the edges and never participate in ball collisions.
    for(const [i,frame] of [this.theme.foreground,this.theme.foreground2].entries()){
      const image=scene.add.image(i===0?14:466,i===0?height*.25:height*.83,'stage-decor',frame).setDisplaySize(150,150).setAlpha(.5).setFlipX(i===1);
      this.foreground.add(image);this.frontImages.push(image);
    }
  }
  update(delta:number,_playerX:number){
    if(this.mode==='still')return;
    this.elapsed+=Math.min(delta,100)/1000;const t=this.elapsed;
    // Keep architecture and planets anchored. Depth comes from faint ambient light,
    // not camera sway or scenery chasing the player's paddle.
    this.middle!.tilePositionX=t*this.theme.speed*.2;this.middle!.tilePositionY=-t*this.theme.speed*.45;
    this.motes.forEach((dot,i)=>{
      dot.alpha=.1+(Math.sin(t*(.5+i%3*.1)+i)*.5+.5)*.3;
      const drift=this.theme.kind==='fireflies'?5:0;
      dot.x=20+(i*137)%440+Math.sin(t*.3+i)*drift;
      dot.y=20+(i*83)%Math.max(1,this.height-40)+Math.cos(t*.25+i)*drift;
    });
    this.frontImages.forEach((image,i)=>{
      // Only leaves and clouds breathe slightly; planets, frames and shelves stay still.
      const frame=Number(image.frame.name),soft=frame===3||frame===7;
      image.y=this.height*(i===0?.25:.83)+(soft?Math.sin(t*.2+i)*2:0);
      image.rotation=frame===3?Math.sin(t*.18+i)*.012:0;
    });
    // Reuse one graphics object for passing light, never an unbounded particle emitter.
    const g=this.glints!;g.clear();
    const phase=t%24;
    if(this.theme.kind==='stars'&&phase>=18){
      const progress=(phase-18)/6,alpha=Math.sin(progress*Math.PI)*.15,x=-40+progress*560,y=this.height*.3;
      g.lineStyle(1,this.theme.accent,alpha).lineBetween(x-24,y-10,x,y).fillStyle(0xffffff,alpha).fillCircle(x,y,1.5);
    }
  }
  setDarkTrail(trail:readonly {x:number;y:number}[],time:number,enabled:boolean){
    if(this.mode==='still'||this.scene.game.renderer.type!==Phaser.WEBGL)return;
    if(!enabled){if(this.wake){this.root.resetPostPipeline(true);this.wake=undefined;}return;}
    if(!this.wake){this.root.setPostPipeline(DarkWakePipeline);this.wake=this.root.getPostPipeline(DarkWakePipeline) as DarkWakePipeline;}
    this.wake.setTrail(trail,this.height,time);
  }
  destroy(){this.root.destroy(true);}
}

export function preloadStages(scene:Phaser.Scene,url:(file:string)=>string){
  for(const [id,theme] of Object.entries(STAGES))scene.load.image(`stage-${id}`,url(theme.file));
  scene.load.image('stage-decor',url('assets/stage-decor.png'));
}
export function prepareStages(scene:Phaser.Scene){
  if(scene.game.renderer.type===Phaser.WEBGL)(scene.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines.addPostPipeline('sb-dark-wake',DarkWakePipeline);
  const texture=scene.textures.get('stage-decor'),source=texture.getSourceImage();
  for(let i=0;i<8;i++)texture.add(i,0,(i%4)*source.width/4,Math.floor(i/4)*source.height/2,source.width/4,source.height/2);
  for(const kind of ['stars','embers','fireflies','mist']){
    const g=scene.make.graphics({x:0,y:0});
    for(let i=0;i<28;i++){
      const x=12+(i*73)%232,y=12+(i*47)%232;
      g.fillStyle(0xffffff,kind==='mist'?.08:.35).fillCircle(x,y,kind==='mist'?8:kind==='fireflies'?2:1);
      if(kind==='stars'&&i%5===0)g.lineStyle(1,0xffffff,.3).lineBetween(x-3,y,x+3,y).lineBetween(x,y-3,x,y+3);
    }
    g.generateTexture(`ambient-${kind}`,256,256);g.destroy();
  }
}

import Phaser from 'phaser';

// Distort only the background: HUD, collision objects and the ball remain sharp.
// Eight localized lenses sample the actual background; no opaque smoke texture.
const fragment=`
precision mediump float;
uniform sampler2D uMainSampler;
uniform vec2 uWorld;
uniform vec3 uTrail[8];
uniform float uTime;
varying vec2 outTexCoord;
void main(){
  vec2 pixel=vec2(outTexCoord.x,1.0-outTexCoord.y)*uWorld;
  vec2 offset=vec2(0.0);
  for(int i=0;i<8;i++){
    vec2 d=pixel-uTrail[i].xy;
    float r=length(d), strength=uTrail[i].z;
    float envelope=1.0-smoothstep(3.0,30.0,r);
    float ripple=sin(r*.22-uTime*7.0+float(i)*.7);
    offset+=d/max(r,1.0)*ripple*envelope*strength*3.6;
  }
  offset=clamp(offset,vec2(-9.0),vec2(9.0));
  vec2 uv=outTexCoord+vec2(offset.x,-offset.y)/uWorld;
  gl_FragColor=texture2D(uMainSampler,clamp(uv,vec2(.001),vec2(.999)));
}`;
export class DarkWakePipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  worldHeight=760; time=0;
  readonly points=new Float32Array(24);
  constructor(game:Phaser.Game){super({game,fragShader:fragment});}
  setTrail(trail:readonly {x:number;y:number}[],height:number,time:number){
    this.worldHeight=height;this.time=time;this.points.fill(0);
    for(let i=0;i<8;i++){
      const point=trail[trail.length-2-i*2];if(!point)continue;
      this.points[i*3]=point.x;this.points[i*3+1]=point.y;this.points[i*3+2]=(8-i)/8;
    }
  }
  onPreRender(){this.set2f('uWorld',480,this.worldHeight);this.set1f('uTime',this.time);this.set3fv('uTrail',this.points);}
}

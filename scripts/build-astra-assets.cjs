// Usage: NODE_PATH=<bundled node_modules> node scripts/build-astra-assets.cjs
// Packs the imagegen cutouts into deterministic five-frame banking sheets.
const fs=require('node:fs/promises');
const path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'../collection/games/shooting');
require(path.join(root,'fleet-data.js'));
require(path.join(root,'sprite-animation.js'));
require(path.join(root,'explosions.js'));
const {AstraFleet,SpriteAnimation,Explosions}=globalThis;
const bounds=(canvas)=>{
  const {data}=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);
  let x0=canvas.width,y0=canvas.height,x1=-1,y1=-1;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
    if(data[(y*canvas.width+x)*4+3]<32)continue;
    x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
  }
  if(x1<0)throw Error('Empty cutout');
  return {x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};
};
const crop=(source,b)=>{
  const out=createCanvas(b.w,b.h);out.getContext('2d').drawImage(source,b.x,b.y,b.w,b.h,0,0,b.w,b.h);return out;
};
async function save(canvas,file){await fs.writeFile(path.join(root,file),canvas.toBuffer('image/png'));}
async function build(){
  await fs.mkdir(path.join(root,'sprites/fleet'),{recursive:true});
  await fs.mkdir(path.join(root,'sprites/sheets'),{recursive:true});
  const manifest={version:1,frameOrder:['left','left-soft','center','right-soft','right'],ships:{},effects:{}};
  const sources=[];
  for(const sheet of AstraFleet.sheets){
    const source=await loadImage(path.join(root,'sprites/atlases/'+sheet.id+'.png'));
    for(let i=0;i<sheet.names.length;i++){
      const col=i%sheet.columns,row=Math.floor(i/sheet.columns);
      const x=Math.round(col*source.width/sheet.columns),y=Math.round(row*source.height/sheet.rows);
      const cell=crop(source,{x,y,w:Math.round((col+1)*source.width/sheet.columns)-x,h:Math.round((row+1)*source.height/sheet.rows)-y});
      const hull=crop(cell,bounds(cell));
      const [id,label]=sheet.names[i];sources.push({id,label,hull,nozzles:[],source:sheet.id});
    }
  }
  for(const player of AstraFleet.players){
    const image=await loadImage(path.join(root,'sprites/'+player.source));
    const temp=createCanvas(image.width,image.height);temp.getContext('2d').drawImage(image,0,0);
    sources.push({...player,label:player.name,hull:crop(temp,bounds(temp)),source:player.source});
  }
  for(const item of sources){
    const scale=240/Math.max(item.hull.width,item.hull.height);
    const base=createCanvas(Math.round(item.hull.width*scale),Math.round(item.hull.height*scale));
    base.getContext('2d').drawImage(item.hull,0,0,base.width,base.height);
    await save(base,'sprites/fleet/'+item.id+'.png');
    const fit=92/Math.max(base.width,base.height),w=base.width*fit,h=base.height*fit;
    const sheet=createCanvas(640,128),frames=[];
    for(let i=0;i<5;i++){
      const lean=(i-2)/2,cell=createCanvas(128,128),context=cell.getContext('2d');
      context.translate(64,64);context.transform(...SpriteAnimation.matrix(lean),0,0);
      context.drawImage(base,-w/2,-h/2,w,h);
      if(lean!==0){
        // Alpha-clipped side shading adds a visible banking cue without moving the pivot.
        context.resetTransform();context.globalCompositeOperation='source-atop';
        const shade=context.createLinearGradient(20,0,108,0);
        shade.addColorStop(lean<0?0:1,'rgba(8,17,42,.34)');
        shade.addColorStop(lean<0?1:0,'rgba(195,226,255,.09)');
        context.fillStyle=shade;context.fillRect(0,0,128,128);
      }
      const b=bounds(cell);
      sheet.getContext('2d').drawImage(cell,i*128,0);
      const nozzles=(item.nozzles||[]).map(p=>{
        const q=SpriteAnimation.transformPoint((p[0]-.5)*w,(p[1]-.5)*h,lean);
        return [(q[0]+64-b.x)/b.w,(q[1]+64-b.y)/b.h];
      });
      frames.push({x:i*128+b.x,y:b.y,w:b.w,h:b.h,pivot:[64-b.x,64-b.y],nozzles});
    }
    const file='sprites/sheets/'+item.id+'.png';
    await save(sheet,file);
    manifest.ships[item.id]={file,label:item.label,source:item.source,baseHeight:h,baseWidth:w,frames};
  }
  for(const type of Explosions.types){
    const sheet=createCanvas(1024,128),context=sheet.getContext('2d');
    for(let i=0;i<8;i++){context.save();context.translate(i*128,0);Explosions.drawFrame(context,type,(i+.15)/8);context.restore();}
    const file='sprites/sheets/explosion_'+type+'.png';await save(sheet,file);manifest.effects[type]={file,frames:8,cell:128};
  }
  await fs.writeFile(path.join(root,'sprites/sheets/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  await fs.writeFile(path.join(root,'sprite-manifest.js'),'window.AstraAtlas = '+JSON.stringify(manifest)+';\n');
  console.log('Built',Object.keys(manifest.ships).length,'ship sheets and',Object.keys(manifest.effects).length,'explosion sheets.');
}
build().catch(error=>{console.error(error);process.exitCode=1;});

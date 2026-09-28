(function(root) {
  const frames = new Map();
  // One affine transform is shared by the sprite pixels and nozzle anchors.
  function matrix(bank) {
    const angle = bank * .14, sx = 1 - Math.abs(bank) * .24;
    return [Math.cos(angle)*sx, Math.sin(angle)*sx, -Math.sin(angle)+bank*.09, Math.cos(angle)];
  }
  function transformPoint(x,y,bank) {
    const [a,b,c,d] = matrix(bank);
    return [a*x+c*y,b*x+d*y];
  }
  function prepare(images) {
    frames.clear();
    for (const [id, entry] of Object.entries(AstraAtlas.ships)) {
      const sheet = images['sheet_'+id];
      frames.set(id,entry.frames.map(frame=>{
        const canvas = document.createElement('canvas');
        canvas.width=frame.w;canvas.height=frame.h;
        canvas.getContext('2d').drawImage(sheet,frame.x,frame.y,frame.w,frame.h,0,0,frame.w,frame.h);
        return { ...frame, image:canvas, damaged:PlayerGeometry.tint(canvas,'rgba(255,60,0,.35)'), baseHeight:entry.baseHeight };
      }));
    }
  }
  function frame(id,lean,x,y,height,flipped=false) {
    const index=Math.max(0,Math.min(4,Math.round(lean*2)+2));
    const cell=frames.get(id)[index], scale=height/cell.baseHeight;
    const sign=flipped?-1:1;
    return { image:cell.image, damaged:cell.damaged,
      x:x+sign*(cell.w/2-cell.pivot[0])*scale,
      y:y+sign*(cell.h/2-cell.pivot[1])*scale,
      w:cell.w*scale,h:cell.h*scale,flipped,
      nozzles:cell.nozzles, index, id };
  }
  function draw(context,body,damaged=false) {
    context.save();context.translate(body.x,body.y);
    if(body.flipped)context.rotate(Math.PI);
    context.drawImage(damaged?body.damaged:body.image,-body.w/2,-body.h/2,body.w,body.h);
    context.restore();
  }
  root.SpriteAnimation={ matrix,transformPoint,prepare,frame,draw };
})(typeof window === 'undefined' ? globalThis : window);

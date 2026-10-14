// Routes use the actor's foot position. Inflate cover by its 24 × 32 body,
// whose offset is (-12, -30), plus clearance so Arcade never catches a corner.
export function createNavigation(obstacles, width, height) {
  const cover = obstacles.map(r => ({ left:r.left-16, right:r.right+16, top:r.top-6, bottom:r.bottom+34 }));
  const step=20, minX=40, minY=-40, cols=Math.floor((width-80)/step)+1, rows=Math.floor((height-40-minY)/step)+1;
  const point=i=>({x:minX+(i%cols)*step,y:minY+Math.floor(i/cols)*step});
  const contains=(r,p)=>p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom;
  const free=p=>!cover.some(r=>contains(r,p));
  const nodes=Array.from({length:cols*rows},(_,i)=>point(i));
  const blocked=nodes.map(p=>!free(p));
  function segmentClear(a,b,rects=cover) {
    return !rects.some(r=>{
      let low=0,high=1;
      for(const [v,d,min,max] of [[a.x,b.x-a.x,r.left,r.right],[a.y,b.y-a.y,r.top,r.bottom]]) {
        if(Math.abs(d)<1e-8){if(v<min||v>max)return false;}
        else {const t1=(min-v)/d,t2=(max-v)/d;low=Math.max(low,Math.min(t1,t2));high=Math.min(high,Math.max(t1,t2));if(low>high)return false;}
      }
      return true;
    });
  }
  function nearest(p,visible=false) {
    let best=-1,distance=Infinity;
    for(let i=0;i<nodes.length;i++)if(!blocked[i]){
      const d=(nodes[i].x-p.x)**2+(nodes[i].y-p.y)**2;
      if(d<distance&&(!visible||segmentClear(p,nodes[i]))){distance=d;best=i;}
    }
    return best;
  }
  function route(start,goal) {
    if(free(goal)&&segmentClear(start,goal))return [{x:goal.x,y:goal.y}];
    const from=nearest(start,true),to=nearest(goal);
    if(from<0||to<0)return [];
    const parents=new Int32Array(nodes.length).fill(-1),queue=[from];parents[from]=from;
    for(let head=0;head<queue.length&&parents[to]===-1;head++){
      const i=queue[head],x=i%cols,y=Math.floor(i/cols);
      for(const n of [x>0?i-1:-1,x<cols-1?i+1:-1,y>0?i-cols:-1,y<rows-1?i+cols:-1]){
        if(n<0||blocked[n]||parents[n]!==-1||!segmentClear(nodes[i],nodes[n]))continue;
        parents[n]=i;queue.push(n);
      }
    }
    if(parents[to]===-1)return [];
    const path=[];for(let i=to;i!==from;i=parents[i])path.push(nodes[i]);path.push(nodes[from]);path.reverse();
    // Keep only corners visible from the previous waypoint.
    const result=[];let anchor=start,index=0;
    while(index<path.length){let next=index;while(next+1<path.length&&segmentClear(anchor,path[next+1]))next++;result.push(path[next]);anchor=path[next];index=next+1;}
    return result;
  }
  return {route,segmentClear,free,safePosition(p){if(free(p))return p;return nodes[nearest(p)]??p;},shotClear(a,b){return segmentClear(a,b,obstacles);}};
}

import {mkdir,writeFile} from 'node:fs/promises';
// Optional recording of the real browser playthrough. No production debug API.
export async function startRecording(page){
 await page.evaluate(()=>{
  const scene=window.__maroScene,stream=scene.game.canvas.captureStream(24),chunks=[];
  const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:1800000});
  const canvas=document.createElement('canvas');canvas.width=240;canvas.height=274;
  const ctx=canvas.getContext('2d',{willReadFrequently:true}),frames=[];let last=0;
  const sample=()=>{
   const now=performance.now();if(now-last<166||frames.length>=60)return;last=now;
   ctx.drawImage(scene.game.canvas,0,0,240,274);const rgba=ctx.getImageData(0,0,240,274).data,indices=new Uint8Array(240*274);
   for(let i=0;i<indices.length;i++)indices[i]=(rgba[i*4]&224)|((rgba[i*4+1]>>3)&28)|(rgba[i*4+2]>>6);
   frames.push(btoa(String.fromCharCode(...indices)));
  };
  recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();scene.game.events.on('postrender',sample);
  window.__finishRecording=()=>new Promise(resolve=>{
   recorder.onstop=async()=>{
    scene.game.events.off('postrender',sample);stream.getTracks().forEach(t=>t.stop());
    const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());let binary='';
    for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
    resolve({video:btoa(binary),frames});
   };recorder.stop();
  });
 });
}
function gif(frames){
 const out=[];const bytes=(...n)=>out.push(...n),word=n=>bytes(n&255,n>>8),str=s=>bytes(...Buffer.from(s));
 str('GIF89a');word(240);word(274);bytes(247,0,0);
 for(let i=0;i<256;i++)bytes(Math.round((i>>5)*255/7),Math.round(((i>>2)&7)*255/7),(i&3)*85);
 bytes(33,255,11);str('NETSCAPE2.0');bytes(3,1,0,0,0);
 for(const frame of frames){
  bytes(33,249,4,4);word(17);bytes(0,0,44);word(0);word(0);word(240);word(274);bytes(0,8);
  const input=Buffer.from(frame,'base64'),packed=[];let bits=0,count=0;
  const emit=code=>{bits|=code<<count;count+=9;while(count>=8){packed.push(bits&255);bits>>>=8;count-=8;}};
  let dictionary=new Map(),next=258,prefix=input[0];emit(256);
  for(let i=1;i<input.length;i++){
   const value=input[i],key=prefix*256+value,known=dictionary.get(key);
   if(known!==undefined){prefix=known;continue;}
   emit(prefix);dictionary.set(key,next++);prefix=value;
   // Clear before a code-width transition: every emitted code stays nine bits.
   if(next===500){emit(256);dictionary=new Map();next=258;}
  }
  emit(prefix);emit(257);if(count)packed.push(bits&255);
  for(let i=0;i<packed.length;i+=255){const block=packed.slice(i,i+255);bytes(block.length,...block);}bytes(0);
 }
 bytes(59);return Buffer.from(out);
}
export async function finishRecording(page,folder){
 const data=await page.evaluate(()=>window.__finishRecording());await mkdir(folder,{recursive:true});
 await writeFile(folder+'/maro-playthrough.webm',Buffer.from(data.video,'base64'));
 await writeFile(folder+'/maro-walking.gif',gif(data.frames));
}

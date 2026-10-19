import {writeFile} from 'node:fs/promises';
const rate=22050;
const notes={medal:[880,1174],checkpoint:[523,659,784],clear:[523,659,784,1047],miss:[310,220,165]};
for(const [name,tones]of Object.entries(notes)){
  const duration=name==='clear'?.15:.09,length=Math.ceil(rate*duration*tones.length),b=Buffer.alloc(44+length*2);
  b.write('RIFF');b.writeUInt32LE(36+length*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(length*2,40);
  for(let i=0;i<length;i++){const t=i/rate,n=Math.min(tones.length-1,Math.floor(t/duration)),local=t-n*duration,env=Math.min(1,local/.008)*Math.pow(1-local/duration,2);b.writeInt16LE(Math.round(Math.sin(2*Math.PI*tones[n]*local)*env*10000),44+i*2);}
  await writeFile(new URL(`assets/${name}.wav`,import.meta.url),b);
}
